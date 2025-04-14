import { AiPromptRole } from '@prisma/client';
import { z } from 'zod';

export enum CopilotProviderType {
  FAL = 'fal',
  Gemini = 'gemini',
  OpenAI = 'openai',
  Perplexity = 'perplexity',
}

export const CopilotProviderSchema = z.object({
  type: z.nativeEnum(CopilotProviderType),
});

export enum CopilotCapability {
  Text = 'text',
  Embedding = 'embedding',
  Image = 'image',
}

export const PromptConfigStrictSchema = z.object({
  // openai
  jsonMode: z.boolean().nullable().optional(),
  webSearch: z.boolean().nullable().optional(),
  frequencyPenalty: z.number().nullable().optional(),
  presencePenalty: z.number().nullable().optional(),
  temperature: z.number().nullable().optional(),
  topP: z.number().nullable().optional(),
  maxTokens: z.number().nullable().optional(),
  // fal
  modelName: z.string().nullable().optional(),
  loras: z
    .array(
      z.object({ path: z.string(), scale: z.number().nullable().optional() })
    )
    .nullable()
    .optional(),
  // google
  audioTimestamp: z.boolean().nullable().optional(),
});

export const PromptConfigSchema =
  PromptConfigStrictSchema.nullable().optional();

export type PromptConfig = z.infer<typeof PromptConfigSchema>;

export const ChatMessageRole = Object.values(AiPromptRole) as [
  'system',
  'assistant',
  'user',
];

export const PureMessageSchema = z.object({
  content: z.string(),
  attachments: z
    .array(
      z.union([
        z.string(),
        z.object({ attachment: z.string(), mimeType: z.string() }),
      ])
    )
    .optional()
    .nullable(),
  params: z.record(z.any()).optional().nullable(),
});

export const PromptMessageSchema = PureMessageSchema.extend({
  role: z.enum(ChatMessageRole),
}).strict();
export type PromptMessage = z.infer<typeof PromptMessageSchema>;
export type PromptParams = NonNullable<PromptMessage['params']>;

const CopilotProviderOptionsSchema = z.object({
  signal: z.instanceof(AbortSignal).optional(),
  user: z.string().optional(),
});

const CopilotChatOptionsSchema = CopilotProviderOptionsSchema.merge(
  PromptConfigStrictSchema
).optional();

export type CopilotChatOptions = z.infer<typeof CopilotChatOptionsSchema>;

const CopilotEmbeddingOptionsSchema = CopilotProviderOptionsSchema.extend({
  dimensions: z.number(),
}).optional();

export type CopilotEmbeddingOptions = z.infer<
  typeof CopilotEmbeddingOptionsSchema
>;

const CopilotImageOptionsSchema = CopilotProviderOptionsSchema.merge(
  PromptConfigStrictSchema
)
  .extend({
    seed: z.number().optional(),
  })
  .optional();

export type CopilotImageOptions = z.infer<typeof CopilotImageOptionsSchema>;

export enum ModelInputType {
  Text = 'text',
  Image = 'image',
  Audio = 'audio',
}

export interface ModelCapability {
  capability: CopilotCapability;
  supportedInputTypes: ModelInputType[];
  defaultForCapability?: boolean;
}

export interface CopilotProviderModel {
  id: string;
  name: string;
  capabilities: ModelCapability[];
}

export interface ModelConditions {
  capability?: CopilotCapability;
  inputType?: ModelInputType;
  modelId?: string;
}
