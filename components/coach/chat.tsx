"use client";

import { ArrowUp, Bot, Check, Dumbbell, Loader2, Salad, Utensils } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { applyProposal } from "@/app/(app)/actions/coach";
import { Avatar } from "@/components/app/avatar";
import type { ChatMessage, ChatProposal } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";

const STARTERS = [
  "Why am I not losing weight?",
  "What should I eat before a workout?",
  "My knees hurt during squats — what should I do?",
  "Make tomorrow's workout a bit easier",
  "Suggest a high-protein vegetarian snack",
  "How much sleep do I need to recover?",
];

type UIMessage = ChatMessage & { pending?: boolean; status?: string | null };

export function Chat({
  conversationId: initialId,
  initialMessages,
  userName,
  prefill,
}: {
  conversationId: string | null;
  initialMessages: ChatMessage[];
  userName: string;
  prefill?: string;
}) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState(initialId);
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [input, setInput] = useState(prefill ?? "");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Follow the reply as it streams, unless the user has scrolled up to read something.
  const stickToBottom = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setInput("");
    setBusy(true);
    stickToBottom.current = true;
    const now = new Date().toISOString();
    const assistantId = `pending-${Date.now()}`;
    setMessages((m) => [
      ...m,
      { id: `u-${Date.now()}`, role: "user", content, proposals: [], created_at: now },
      { id: assistantId, role: "assistant", content: "", proposals: [], created_at: now, pending: true },
    ]);
    const patch = (fn: (m: UIMessage) => UIMessage) => setMessages((all) => all.map((m) => (m.id === assistantId ? fn(m) : m)));

    // Text arrives a few characters at a time; render it at most once per frame.
    let queued = "";
    let frame = 0;
    const flush = () => {
      frame = 0;
      if (!queued) return;
      const text = queued;
      queued = "";
      patch((m) => ({ ...m, content: m.content + text, status: null }));
    };
    const queueText = (delta: string) => {
      queued += delta;
      frame ||= requestAnimationFrame(flush);
    };

    let newConversation: string | null = null;
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: conversationId ?? undefined, message: content }),
      });
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "The coach is unavailable right now");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalId: string | null = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.type === "meta" && !conversationId) {
            newConversation = ev.conversationId;
            setConversationId(ev.conversationId);
          } else if (ev.type === "text") queueText(ev.delta);
          else if (ev.type === "status") {
            flush();
            patch((m) => ({ ...m, status: ev.text }));
          } else if (ev.type === "proposal") {
            flush();
            patch((m) => ({ ...m, status: null, proposals: [...m.proposals, ev.proposal] }));
          } else if (ev.type === "done") finalId = ev.messageId;
          else if (ev.type === "error") throw new Error(ev.error);
        }
      }
      cancelAnimationFrame(frame);
      flush();
      patch((m) => ({ ...m, id: finalId ?? m.id, pending: false, status: null }));
    } catch (e) {
      cancelAnimationFrame(frame);
      flush();
      const msg = e instanceof Error ? e.message : "Something went wrong";
      patch((m) => ({ ...m, pending: false, status: null, content: m.content || `⚠️ ${msg}` }));
      toast.error(msg);
    } finally {
      setBusy(false);
      if (newConversation) {
        window.history.replaceState(null, "", `/coach?c=${newConversation}`);
        router.refresh();
      }
      textareaRef.current?.focus();
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col lg:h-[calc(100dvh-5rem)]">
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 overflow-y-auto pr-1"
      >
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center px-2 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-lime/15 text-lime">
              <Bot className="h-8 w-8" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-bold">Hey {userName}, I&apos;m Forge 👋</h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              Your AI coach. I know your plan, your goal and what you&apos;ve logged. Ask me anything about training, food or recovery.
            </p>
            <div className="mt-8 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-2xl border border-line bg-surface p-4 text-left text-sm text-fg/85 transition-colors hover:border-lime/50 cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 py-2">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} userName={userName} />
            ))}
          </div>
        )}
      </div>

      <form
        className="mx-auto mt-3 w-full max-w-3xl"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="flex items-end gap-2 rounded-3xl border border-line bg-surface p-2 focus-within:border-lime/50">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            maxLength={2000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Ask your coach anything…"
            aria-label="Message your coach"
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm placeholder:text-muted focus:outline-none [field-sizing:content]"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lime text-black disabled:opacity-40 cursor-pointer"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" strokeWidth={2.5} />}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted">General guidance only, not medical advice. For pain or health conditions, see a professional.</p>
      </form>
    </div>
  );
}

// Memoized so streaming a reply only re-renders that one bubble, not the whole history.
const MessageBubble = memo(function MessageBubble({ message, userName }: { message: UIMessage; userName: string }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-md bg-lime px-4 py-3 text-sm font-medium text-black">{message.content}</div>
        <Avatar name={userName} className="hidden h-8 w-8 text-xs sm:flex" />
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-lime">
        <Bot className="h-4 w-4" />
      </span>
      <div className="min-w-0 max-w-[90%] flex-1 space-y-3">
        <div className="rounded-3xl rounded-tl-md bg-surface px-4 py-3 text-sm leading-relaxed text-fg/90">
          {message.content && <Markdown text={message.content} />}
          {message.pending && (!message.content || message.status) && (
            <span className={cn("flex items-center gap-1.5 py-1 text-muted", message.content && "mt-2")} role="status">
              <span className="h-2 w-2 animate-bounce rounded-full bg-lime [animation-delay:-0.2s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-lime [animation-delay:-0.1s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-lime" />
              {message.status && <span className="ml-1.5 text-xs">{message.status}</span>}
            </span>
          )}
        </div>
        {message.proposals.map((p) => (
          <ProposalCard key={p.id} proposal={p} messageId={message.pending || message.id.startsWith("pending-") ? null : message.id} />
        ))}
      </div>
    </div>
  );
});

function ProposalCard({ proposal, messageId }: { proposal: ChatProposal; messageId: string | null }) {
  const [applied, setApplied] = useState(Boolean(proposal.applied));
  const [pending, startTransition] = useTransition();
  const Icon = proposal.kind === "update_workout_day" ? Dumbbell : proposal.kind === "swap_meal" ? Salad : Utensils;
  const exercises = proposal.kind === "update_workout_day" ? (proposal.payload.exercises as { name: string; sets: number; reps: string }[]) : null;
  const meal = proposal.kind === "swap_meal" ? (proposal.payload.meal as { name: string; calories: number; protein_g: number }) : null;
  const log = proposal.kind === "log_meal" ? (proposal.payload as { description: string; calories: number; protein_g: number }) : null;

  return (
    <div className={cn("rounded-2xl border p-4", applied ? "border-line bg-surface" : "border-lime/30 bg-lime/[0.05]")}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold">{proposal.summary}</p>
          {exercises && (
            <ul className="mt-2 space-y-0.5 text-xs text-muted">
              {exercises.map((e, i) => (
                <li key={i}>
                  {i + 1}. {e.name} — {e.sets}×{e.reps}
                </li>
              ))}
            </ul>
          )}
          {meal && <p className="mt-1 text-xs text-muted">{meal.name} · {meal.calories} kcal · {Math.round(meal.protein_g)} g protein</p>}
          {log && <p className="mt-1 text-xs text-muted">{log.description} · {Math.round(log.calories)} kcal · {Math.round(log.protein_g)} g protein</p>}
        </div>
        <button
          type="button"
          disabled={applied || pending || !messageId}
          onClick={() =>
            messageId &&
            startTransition(async () => {
              const res = await applyProposal(messageId, proposal.id);
              if (res.ok) {
                setApplied(true);
                toast.success("Applied ✅");
              } else toast.error(res.error);
            })
          }
          className={cn(
            "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition-colors cursor-pointer disabled:cursor-default",
            applied ? "bg-surface-3 text-muted" : "bg-lime text-black hover:bg-[#d4ff4a] disabled:opacity-50",
          )}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : applied ? <Check className="h-3.5 w-3.5" /> : null}
          {applied ? "Applied" : "Apply"}
        </button>
      </div>
    </div>
  );
}
