/**
 * @deprecated since 13.R21 — merged into the SINGLE gateway
 * (`ai-gateway.service.ts`). This file is a thin compatibility re-export and
 * MUST NOT gain new logic. It is kept (not deleted) because other code may
 * still import { AiProviderService }. New code must use AiGatewayService.
 *
 * Mapping: old env-only single-provider resolution → gateway auto mode with
 * priority chain + per-feature pins + quotas + failover (see gateway header).
 */
import { BadGatewayException, BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import {
  AiGatewayService,
  AiGenerateOptions as GatewayGenerateOptions,
  AiGenerateResult as GatewayGenerateResult,
  AiProviderName as GatewayProviderName,
} from './ai-gateway.service';

/** @deprecated use AiGatewayService (gateway AiProviderName covers all 7+ providers). */
export type AiProviderName = 'gemini' | 'openai' | 'openrouter' | 'groq';

/** @deprecated use gateway AiGenerateOptions. */
export interface AiGenerateOptions extends GatewayGenerateOptions {
  jsonExpected?: boolean;
}

/** @deprecated use gateway AiGenerateResult. */
export type AiGenerateResult = GatewayGenerateResult;

const LEGACY_TO_GATEWAY: Record<AiProviderName, GatewayProviderName> = {
  gemini: 'gemini',
  openai: 'openai',
  openrouter: 'openrouter',
  groq: 'groq',
};

/**
 * @deprecated Use AiGatewayService. Thin subclass so `instanceof` checks and
 * old DI tokens keep working; all behaviour comes from the gateway.
 */
@Injectable()
export class AiProviderService extends AiGatewayService {
  constructor(@InjectConnection() conn: Connection) {
    super(conn);
  }

  /** @deprecated read via gateway listProviders()/mode instead. */
  get activeProvider(): AiProviderName {
    const name = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
    return (['gemini', 'openai', 'openrouter', 'groq'].includes(name) ? name : 'gemini') as AiProviderName;
  }

  /** @deprecated use gateway setMode('manual', provider) / setPurposeOverride(). */
  async setActiveProvider(provider: AiProviderName) {
    if (!['gemini', 'openai', 'openrouter', 'groq'].includes(provider)) {
      throw new BadRequestException('INVALID_PROVIDER');
    }
    return this.setMode('manual', LEGACY_TO_GATEWAY[provider]);
  }

  /** @deprecated use gateway listProviders(). */
  getConfig() {
    return {
      active_provider: this.activeProvider,
      deprecated: true,
      use_instead: 'AiGatewayService',
      switchable_via: 'admin ai_mode (auto|manual) + purpose_overrides — no code change needed',
    };
  }

  /** Preserve the old fail-closed contract: no usable provider → 503. */
  async generate(opts: AiGenerateOptions): Promise<AiGenerateResult> {
    try {
      return await super.generate(opts);
    } catch (e: any) {
      if (e instanceof ServiceUnavailableException || e instanceof BadGatewayException) throw e;
      throw new ServiceUnavailableException('ai_provider_unavailable');
    }
  }
}
