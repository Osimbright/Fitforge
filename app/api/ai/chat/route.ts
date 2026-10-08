import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AIError, anthropic, MODELS, SMART_FALLBACK } from "@/lib/ai/client";
import { buildCoachContext, COACH_SYSTEM, COACH_TOOLS, runCoachTool } from "@/lib/ai/coach";
import { consumeQuota } from "@/lib/ai/quota";
import { aiRoute } from "@/lib/ai/route";
import { todayKey, userTimeZone } from "@/lib/date";
import { DEMO_AI } from "@/lib/demo/ai";
import { demoCoachReply } from "@/lib/demo/coach";
import type { ChatProposal } from "@/lib/types";

export const maxDuration = 120;

const Body = z.object({
  conversationId: z.uuid().optional(),
  message: z.string().trim().min(1).max(2000),
});

const MAX_TOOL_ROUNDS = 5;
const HISTORY_LIMIT = 30;

const TOOL_STATUS: Record<string, string> = {
  search_exercises: "Looking through exercises…",
  propose_workout_day_update: "Reworking your session…",
  propose_meal_swap: "Finding you a better meal…",
  propose_meal_log: "Working out the macros…",
};

/**
 * Streams the coach's reply as NDJSON events:
 *   {type:"meta", conversationId} → {type:"text", delta | type:"status", text}* → {type:"proposal", proposal}* → {type:"done", messageId}
 */
export const POST = aiRoute(async ({ supabase, user, profile, body }) => {
  const { conversationId: existingId, message } = Body.parse(body);

  // Everything independent runs at once: each of these is a database round trip, and
  // done one after another they used to add a second or two before the AI was even called.
  const [, existing, historyRows, context] = await Promise.all([
    consumeQuota(supabase, "chat"),
    existingId ? supabase.from("chat_conversations").select("id").eq("id", existingId).maybeSingle() : null,
    existingId
      ? supabase.from("chat_messages").select("role, content").eq("conversation_id", existingId).order("created_at", { ascending: false }).limit(HISTORY_LIMIT)
      : null,
    (async () => buildCoachContext(supabase, profile, await userTimeZone(), await todayKey()))(),
  ]);

  let conversationId = existingId;
  if (existingId) {
    if (!existing?.data) throw new AIError("Conversation not found", 404);
  } else {
    // Created only after the quota check passed, so a blocked message leaves no empty chat behind.
    const title = message.length > 48 ? message.slice(0, 45).trimEnd() + "…" : message;
    const { data, error } = await supabase.from("chat_conversations").insert({ user_id: user.id, title }).select("id").single();
    if (error) throw new AIError("Couldn't start a conversation", 500);
    conversationId = data.id as string;
  }

  const history = (historyRows?.data ?? []).reverse();
  // History must start with a user turn.
  while (history.length && history[0].role !== "user") history.shift();

  // Save the user's message while the model starts; awaited before the reply is saved.
  const userSaved = (async () =>
    supabase.from("chat_messages").insert({ conversation_id: conversationId, user_id: user.id, role: "user", content: message }))();

  const client = DEMO_AI ? null : anthropic();

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: message },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      send({ type: "meta", conversationId });

      let fullText = "";
      const proposals: ChatProposal[] = [];

      try {
        if (!client) {
          const reply = await demoCoachReply(message, { supabase, profile, history }, send);
          fullText = reply.text;
          proposals.push(...reply.proposals);
        }

        for (let round = 0; client && round < MAX_TOOL_ROUNDS; round++) {
          const s = client.beta.messages.stream({
            model: MODELS.smart,
            max_tokens: 8000,
            system: [
              { type: "text", text: COACH_SYSTEM, cache_control: { type: "ephemeral" } },
              { type: "text", text: context },
            ],
            tools: COACH_TOOLS,
            messages,
            // Chat runs at low effort: the model skips thinking on everyday messages, so the
            // first words arrive in ~1s instead of 2-4s, and it still thinks on harder ones
            // (measured 2026-10-08 with the coach prompt).
            output_config: { effort: "low" },
            cache_control: { type: "ephemeral" },
            ...SMART_FALLBACK,
          });

          // Tell the UI what's happening while a tool runs, so the chat never looks frozen.
          s.on("streamEvent", (event) => {
            if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
              send({ type: "status", text: TOOL_STATUS[event.content_block.name] ?? "Working on it…" });
            }
          });

          let roundText = "";
          s.on("text", (delta) => {
            // Separate text from consecutive rounds with a paragraph break.
            if (!roundText && fullText) {
              fullText += "\n\n";
              send({ type: "text", delta: "\n\n" });
            }
            roundText += delta;
            fullText += delta;
            send({ type: "text", delta });
          });

          const final = await s.finalMessage();

          if (final.stop_reason === "refusal") {
            const note = "I can't help with that one — but I'm happy to help with your training, nutrition or recovery.";
            fullText += (fullText ? "\n\n" : "") + note;
            send({ type: "text", delta: (roundText ? "\n\n" : "") + note });
            break;
          }

          // Append the full assistant content (incl. thinking/tool_use blocks) unchanged.
          messages.push({ role: "assistant", content: final.content });

          const toolUses = final.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
          if (final.stop_reason !== "tool_use" || toolUses.length === 0) break;

          const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
          for (const tu of toolUses) {
            const outcome = await runCoachTool(tu.name, tu.input, { supabase, profile });
            if (outcome.proposal) {
              proposals.push(outcome.proposal);
              send({ type: "proposal", proposal: outcome.proposal });
            }
            results.push({ type: "tool_result", tool_use_id: tu.id, content: outcome.result, is_error: outcome.isError });
          }
          // All results for this turn go back in a single user message.
          messages.push({ role: "user", content: results });
        }

        if (!fullText.trim()) {
          fullText = proposals.length ? "Here's what I suggest:" : "Sorry, I couldn't come up with an answer. Could you rephrase?";
          send({ type: "text", delta: fullText });
        }

        await userSaved;
        const { data: saved } = await supabase
          .from("chat_messages")
          .insert({ conversation_id: conversationId, user_id: user.id, role: "assistant", content: fullText, proposals })
          .select("id")
          .single();
        await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
        send({ type: "done", messageId: saved?.id ?? null });
      } catch (err) {
        console.error("[coach]", err);
        let error = "The coach hit a snag. Please try again.";
        if (err instanceof Anthropic.RateLimitError) error = "The AI is busy right now. Please try again in a minute.";
        else if (err instanceof Anthropic.AuthenticationError) error = "The AI API key is invalid.";
        send({ type: "error", error });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
});
