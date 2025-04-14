import { Inject, Injectable, Logger } from '@nestjs/common';

import { Config, CopilotPromptInvalid, OnEvent } from '../../../base';
import { CopilotProviderFactory } from './factory';
import {
  CopilotCapability,
  type CopilotChatOptions,
  type CopilotEmbeddingOptions,
  type CopilotImageOptions,
  CopilotProviderModel,
  CopilotProviderType,
  ModelCapability,
  ModelConditions,
  ModelInputType,
  type PromptMessage,
} from './types';

@Injectable()
export abstract class CopilotProvider<C = any> {
  protected readonly logger = new Logger(this.constructor.name);
  abstract readonly type: CopilotProviderType;
  abstract readonly models: CopilotProviderModel[];
  abstract configured(): boolean;

  @Inject() protected readonly AFFiNEConfig!: Config;
  @Inject() protected readonly factory!: CopilotProviderFactory;

  get config(): C {
    return this.AFFiNEConfig.copilot.providers[this.type] as C;
  }

  isModelAvailable(
    conditions: {
      model?: string;
      capability?: CopilotCapability;
      inputType?: ModelInputType;
    } = {}
  ): Promise<boolean> | boolean {
    const { model, capability, inputType } = conditions;
    if (!this.configured()) {
      return false;
    }

    if (model) {
      const foundModel = this.models.find(m => m.id === model);
      if (!foundModel) {
        return false;
      }

      return foundModel.capabilities.some(
        cap =>
          (!capability || cap.capability === capability) &&
          (!inputType || cap.supportedInputTypes.includes(inputType))
      );
    }

    if (capability) {
      return this.models.some(model =>
        model.capabilities.some(
          cap =>
            cap.capability === capability &&
            (!inputType || cap.supportedInputTypes.includes(inputType))
        )
      );
    }

    return false;
  }

  @OnEvent('config.init')
  async onConfigInit() {
    this.setup();
  }

  @OnEvent('config.changed')
  async onConfigChanged(event: Events['config.changed']) {
    if ('copilot' in event.updates) {
      this.setup();
    }
  }

  protected setup() {
    if (this.configured()) {
      this.factory.register(this);
    } else {
      this.factory.unregister(this);
    }
  }

  getModelsByCapability(capability: CopilotCapability): CopilotProviderModel[] {
    return this.models.filter(model =>
      model.capabilities.some(cap => cap.capability === capability)
    );
  }

  getDefaultModelForCapability(
    capability: CopilotCapability,
    inputType?: ModelInputType
  ): CopilotProviderModel | undefined {
    // find the default model that matches both capability and input type
    if (inputType) {
      const modelWithInputType = this.models.find(model =>
        model.capabilities.some(
          cap =>
            cap.capability === capability &&
            cap.defaultForCapability === true &&
            cap.supportedInputTypes.includes(inputType)
        )
      );

      if (modelWithInputType) {
        return modelWithInputType;
      }
    }

    // if no input type is specified, find the default model for the capability
    const defaultModel = this.models.find(model =>
      model.capabilities.some(
        cap =>
          cap.capability === capability && cap.defaultForCapability === true
      )
    );

    if (defaultModel) {
      return defaultModel;
    }

    // if no default model is found, return the first model that supports the capability
    // this is a fallback and may not be the intended behavior
    const firstSupportingModel = this.getModelsByCapability(capability)[0];
    return firstSupportingModel;
  }

  protected validateModelCapability(
    model: CopilotProviderModel,
    capability: CopilotCapability,
    inputType: ModelInputType
  ): ModelCapability | undefined {
    const matchingCapability = model.capabilities.find(
      cap =>
        cap.capability === capability &&
        cap.supportedInputTypes.includes(inputType)
    );

    if (!matchingCapability) {
      throw new CopilotPromptInvalid(
        `Model ${model.id} does not support ${capability} capability with ${inputType} input type`
      );
    }

    return matchingCapability;
  }

  protected selectModel(cond: ModelConditions): CopilotProviderModel {
    if (cond.modelId) {
      const model = this.models.find(m => m.id === cond.modelId);
      if (!model) {
        throw new CopilotPromptInvalid(
          `Model ${cond.modelId} not found for provider ${this.type}`
        );
      }

      this.validateModelCapability(model, cond.capability, cond.inputType);
      return model;
    }

    const defaultModel = this.getDefaultModelForCapability(
      cond.capability,
      cond.inputType
    );
    if (!defaultModel) {
      throw new CopilotPromptInvalid(
        `No model found supporting ${cond.capability} capability with ${cond.inputType} input type for provider ${this.type}`
      );
    }

    return defaultModel;
  }

  abstract text(
    model: ModelConditions,
    messages: PromptMessage[],
    options?: CopilotChatOptions | CopilotEmbeddingOptions | CopilotImageOptions
  ): Promise<string>;

  abstract streamText(
    model: ModelConditions,
    messages: PromptMessage[],
    options?: CopilotChatOptions | CopilotImageOptions
  ): AsyncIterable<string>;
}
