import { randomBytes } from 'node:crypto';

import {
  CopilotCapability,
  CopilotChatOptions,
  CopilotEmbeddingOptions,
  CopilotImageOptions,
  ModelConditions,
  ModelInputType,
  PromptMessage,
} from '../../plugins/copilot/providers';
import {
  DEFAULT_DIMENSIONS,
  OpenAIProvider,
} from '../../plugins/copilot/providers/openai';
import { sleep } from '../utils/utils';

export class MockCopilotProvider extends OpenAIProvider {
  override readonly models = [
    {
      name: 'Mock Model',
      id: 'test',
      capabilities: [
        {
          capability: CopilotCapability.Text,
          supportedInputTypes: [ModelInputType.Text],
          defaultForCapability: true,
        },
      ],
    },
    {
      name: 'Mock Image Model',
      id: 'test-image',
      capabilities: [
        {
          capability: CopilotCapability.Image,
          supportedInputTypes: [ModelInputType.Text],
          defaultForCapability: true,
        },
      ],
    },
    {
      name: 'GPT-4o',
      id: 'gpt-4o',
      capabilities: [
        {
          capability: CopilotCapability.Text,
          supportedInputTypes: [ModelInputType.Text, ModelInputType.Image],
        },
      ],
    },
    {
      name: 'GPT-4o-08-06',
      id: 'gpt-4o-2024-08-06',
      capabilities: [
        {
          capability: CopilotCapability.Text,
          supportedInputTypes: [ModelInputType.Text, ModelInputType.Image],
        },
      ],
    },
    {
      name: 'Gpt-4.1',
      id: 'gpt-4.1',
      capabilities: [
        {
          capability: CopilotCapability.Text,
          supportedInputTypes: [ModelInputType.Text, ModelInputType.Image],
        },
      ],
    },
    {
      name: 'Gpt-4.1-04-14',
      id: 'gpt-4.1-2025-04-14',
      capabilities: [
        {
          capability: CopilotCapability.Text,
          supportedInputTypes: [ModelInputType.Text, ModelInputType.Image],
        },
      ],
    },
    {
      name: 'Gpt-4.1-mini',
      id: 'gpt-4.1-mini',
      capabilities: [
        {
          capability: CopilotCapability.Text,
          supportedInputTypes: [ModelInputType.Text, ModelInputType.Image],
        },
      ],
    },
    {
      name: 'lcm-sd15-i2i',
      id: 'lcm-sd15-i2i',
      capabilities: [
        {
          capability: CopilotCapability.Image,
          supportedInputTypes: [ModelInputType.Image],
        },
      ],
    },
    {
      name: 'clarity-upscaler',
      id: 'clarity-upscaler',
      capabilities: [
        {
          capability: CopilotCapability.Image,
          supportedInputTypes: [ModelInputType.Image],
        },
      ],
    },
    {
      name: 'imageutils/rembg',
      id: 'imageutils/rembg',
      capabilities: [
        {
          capability: CopilotCapability.Image,
          supportedInputTypes: [ModelInputType.Image],
        },
      ],
    },
    {
      name: 'Gemini 2.5 Pro',
      id: 'gemini-2.5-pro-preview-03-25',
      capabilities: [
        {
          capability: CopilotCapability.Text,
          supportedInputTypes: [ModelInputType.Text, ModelInputType.Image],
        },
      ],
    },
  ];

  override readonly capabilities = [
    CopilotCapability.Text,
    CopilotCapability.Image,
    CopilotCapability.Embedding,
  ];

  // ====== text to text ======

  override async text(
    cond: ModelConditions,
    messages: PromptMessage[],
    options:
      | CopilotChatOptions
      | CopilotEmbeddingOptions
      | CopilotImageOptions = {}
  ): Promise<string> {
    await this.checkParams({ messages, cond, options });
    // make some time gap for history test case
    await sleep(100);
    return 'generate text to text';
  }

  override async *streamText(
    cond: ModelConditions,
    messages: PromptMessage[],
    options: CopilotChatOptions | CopilotImageOptions = {}
  ): AsyncIterable<string> {
    await this.checkParams({ messages, cond, options });

    // make some time gap for history test case
    await sleep(100);

    if (cond.capability === CopilotCapability.Image) {
      const { content: prompt } = [...messages].pop() || {};
      if (!prompt) throw new Error('Prompt is required');

      const imageUrls = [
        `https://example.com/${cond.modelId || 'test'}.jpg`,
        prompt,
      ];

      for (const imageUrl of imageUrls) {
        yield imageUrl;
        if (options.signal?.aborted) {
          break;
        }
      }
      return;
    }

    const result = 'generate text to text stream';
    for (const message of result) {
      yield message;
      if (options.signal?.aborted) {
        break;
      }
    }
  }

  // ====== text to embedding ======

  override async generateEmbedding(
    cond: ModelConditions,
    messages: string | string[],
    options: CopilotEmbeddingOptions = { dimensions: DEFAULT_DIMENSIONS }
  ): Promise<number[][]> {
    messages = Array.isArray(messages) ? messages : [messages];
    await this.checkParams({ embeddings: messages, cond, options });

    // make some time gap for history test case
    await sleep(100);
    return [Array.from(randomBytes(options.dimensions)).map(v => v % 128)];
  }
}
