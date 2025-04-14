import { Injectable, Logger } from '@nestjs/common';

import { ServerFeature, ServerService } from '../../../core';
import type { FalProvider } from './fal';
import type { GeminiProvider } from './gemini';
import type { OpenAIProvider } from './openai';
import type { PerplexityProvider } from './perplexity';
import type { CopilotProvider } from './provider';
import {
  CopilotCapability,
  CopilotProviderType,
  ModelInputType,
} from './types';

type TypedProvider = {
  [CopilotProviderType.Gemini]: GeminiProvider;
  [CopilotProviderType.OpenAI]: OpenAIProvider;
  [CopilotProviderType.Perplexity]: PerplexityProvider;
  [CopilotProviderType.FAL]: FalProvider;
};

@Injectable()
export class CopilotProviderFactory {
  constructor(private readonly server: ServerService) {}

  private readonly logger = new Logger(CopilotProviderFactory.name);

  readonly #providers = new Map<CopilotProviderType, CopilotProvider>();

  getProvider<P extends CopilotProviderType>(provider: P): TypedProvider[P] {
    return this.#providers.get(provider) as TypedProvider[P];
  }

  async getProviderByCapability(
    capability: CopilotCapability,
    inputType: ModelInputType = ModelInputType.Text,
    filter: {
      model?: string;
      prefer?: CopilotProviderType;
    } = {}
  ): Promise<CopilotProvider | null> {
    this.logger.debug(
      `Resolving copilot provider for capability: ${capability}`
    );
    let candidate: CopilotProvider | null = null;
    for (const [type, provider] of this.#providers.entries()) {
      if (filter.prefer && filter.prefer !== type) {
        continue;
      }

      if (!filter.model) {
        candidate = provider;
        this.logger.debug(`Copilot provider candidate found: ${type}`);
        break;
      }

      if (
        await provider.isModelAvailable({
          modelId: filter.model,
          capability,
          inputType,
        })
      ) {
        candidate = provider;
        this.logger.debug(`Copilot provider candidate found: ${type}`);
        break;
      }
    }

    return candidate;
  }

  async getProviderByModel(
    modelId: string,
    filter: {
      prefer?: CopilotProviderType;
    } = {}
  ): Promise<CopilotProvider | null> {
    this.logger.debug(`Resolving copilot provider for model: ${modelId}`);

    let candidate: CopilotProvider | null = null;
    for (const [type, provider] of this.#providers.entries()) {
      if (filter.prefer && filter.prefer !== type) {
        continue;
      }

      if (await provider.isModelAvailable({ modelId })) {
        candidate = provider;
        this.logger.debug(`Copilot provider candidate found: ${type}`);
      }
    }

    return candidate;
  }

  register(provider: CopilotProvider) {
    this.#providers.set(provider.type, provider);
    this.logger.log(`Copilot provider [${provider.type}] registered.`);
    this.server.enableFeature(ServerFeature.Copilot);
  }

  unregister(provider: CopilotProvider) {
    this.#providers.delete(provider.type);
    this.logger.log(`Copilot provider [${provider.type}] unregistered.`);
    if (this.#providers.size === 0) {
      this.server.disableFeature(ServerFeature.Copilot);
    }
  }
}
