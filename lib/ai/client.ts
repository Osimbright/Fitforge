import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { ZodType } from "zod";
import { DEMO_AI, demoStructured } from "@/lib/demo/ai";

export const MODELS = {
  /** Plans, weekly reviews and the coach chat. */
  smart: "claude-sonnet-5-5",
  /** Fast, cheap tasks: meal macro estimates, swaps. */
  fast: "claude-haiku-4-5",
} as const;

/**
 * Server-side refusal fallback for Sonnet 5.5: if a safety classifier declines,
 * the API re-runs the request on a suitable fallback model in the same call.
 */
export const SMART_FALLBACK: { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: "default" } = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
};

let _client: Anthropic | null = null;
export function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AIError("The AI isn't configured yet. Add ANTHROPIC_API_KEY to .env.local.", 503);
  }
  _client ??= new Anthropic();
  return _client;
}

export class AIError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

type Effort = "low" | "medium" | "high";

/**
 * One structured-output call: returns data already validated against `schema`.
 * Retries once if the model's output doesn't parse.
 */
export async function generateStructured<T>({
  schema,
  system,
  prompt,
  model = "smart",
  effort = "medium",
  maxTokens = 16000,
}: {
  schema: ZodType<T>;
  system: string;
  prompt: string;
  model?: keyof typeof MODELS;
  effort?: Effort;
  maxTokens?: number;
}): Promise<T> {
  if (DEMO_AI) return (await demoStructured(schema, prompt)) as T;
  const client = anthropic();
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.beta.messages.parse({
        model: MODELS[model],
        max_tokens: maxTokens,
        // Stable instructions first so the prefix caches across users.
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: prompt }],
        output_config: {
          format: betaZodOutputFormat(schema),
          // Haiku 4.5 doesn't accept `effort`.
          ...(model === "smart" ? { effort } : {}),
        },
        ...(model === "smart" ? SMART_FALLBACK : {}),
      });

      if (response.stop_reason === "refusal") {
        throw new AIError("The AI couldn't help with that request. Try rephrasing it.", 422);
      }
      if (response.stop_reason === "max_tokens") {
        throw new Error("Response was cut off (max_tokens)");
      }
      if (response.parsed_output == null) throw new Error("Structured output did not parse");
      return response.parsed_output as T;
    } catch (err) {
      if (err instanceof AIError) throw err;
      if (err instanceof Anthropic.AuthenticationError) {
        throw new AIError("The AI API key is invalid. Check ANTHROPIC_API_KEY.", 503);
      }
      if (err instanceof Anthropic.RateLimitError) {
        throw new AIError("The AI is busy right now. Please try again in a minute.", 429);
      }
      if (err instanceof Anthropic.BadRequestError) {
        console.error("[ai] bad request", err.message);
        throw new AIError("The AI request was rejected. Please try again.", 400);
      }
      lastError = err;
      console.warn(`[ai] attempt ${attempt + 1} failed`, err instanceof Error ? err.message : err);
    }
  }
  console.error("[ai] giving up", lastError);
  throw new AIError("The AI had trouble generating a response. Please try again.", 502);
}
