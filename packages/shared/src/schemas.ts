import { z } from 'zod';

/**
 * API contract for /v1. Mirrors the Pydantic models in apps/api/app/schemas.py
 * (and the exported openapi.json). Shapes follow OpenAI's Chat Completions API.
 */

export const RoleSchema = z.enum(['system', 'user', 'assistant']);
export type Role = z.infer<typeof RoleSchema>;

export const ChatMessageSchema = z.object({
  role: RoleSchema,
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatCompletionRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(ChatMessageSchema).min(1),
  stream: z.boolean().default(false),
  seed: z.number().int().optional(),
});
export type ChatCompletionRequest = z.input<typeof ChatCompletionRequestSchema>;

export const FinishReasonSchema = z.enum(['stop', 'length']).nullable();

export const ChatCompletionSchema = z.object({
  id: z.string(),
  object: z.literal('chat.completion'),
  created: z.number().int(),
  model: z.string(),
  choices: z
    .array(
      z.object({
        index: z.number().int(),
        message: ChatMessageSchema,
        finish_reason: FinishReasonSchema,
      }),
    )
    .min(1),
});
export type ChatCompletion = z.infer<typeof ChatCompletionSchema>;

export const ChatCompletionChunkSchema = z.object({
  id: z.string(),
  object: z.literal('chat.completion.chunk'),
  created: z.number().int(),
  model: z.string(),
  choices: z
    .array(
      z.object({
        index: z.number().int(),
        delta: z.object({
          role: RoleSchema.optional(),
          content: z.string().optional(),
        }),
        finish_reason: FinishReasonSchema,
      }),
    )
    .min(1),
});
export type ChatCompletionChunk = z.infer<typeof ChatCompletionChunkSchema>;

export const ModelSchema = z.object({
  id: z.string(),
  object: z.literal('model'),
  owned_by: z.string(),
  description: z.string().optional(),
});
export type Model = z.infer<typeof ModelSchema>;

export const ModelListSchema = z.object({
  object: z.literal('list'),
  data: z.array(ModelSchema),
});
export type ModelList = z.infer<typeof ModelListSchema>;

export const ErrorResponseSchema = z.object({
  error: z.object({
    message: z.string(),
    type: z.string(),
    code: z.string().nullable().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const HealthSchema = z.object({
  status: z.literal('ok'),
  provider: z.string(),
  version: z.string(),
});
export type Health = z.infer<typeof HealthSchema>;

/** SSE terminator sent after the final chunk. */
export const STREAM_DONE = '[DONE]';
