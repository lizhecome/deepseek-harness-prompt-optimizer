/**
 * LLM-backed direct-user prompt optimization for DeepSeek Harness.
 *
 * @module @lizhecome/dsh-prompt-optimizer
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "prompt-optimizer";
export declare const inject: string[];
/** Stable default directive sent only to the auxiliary optimizer call. */
export declare const DEFAULT_INSTRUCTION: string;
/** How optimized text enters the main agent request. */
export type Delivery = 'append' | 'replace';
/** What happens when the auxiliary optimizer request fails. */
export type FailureMode = 'pass-through' | 'fail';
/** Plugin configuration validated by {@link Config}. */
export interface Config {
    /** Optimizer provider; set together with `model`, or leave both empty to follow the agent route. */
    provider?: string;
    /** Optimizer model; set together with `provider`, or leave both empty to follow the agent route. */
    model?: string;
    /** Maximum optimizer output tokens. */
    maxTokens?: number;
    /** Shorter direct-user prompts pass through without an auxiliary call. */
    minChars?: number;
    /** Append a sourced optimization after the original, or replace the direct-user message text. */
    delivery?: Delivery;
    /** Continue with the original prompt after optimizer failure, or fail the proposed step. */
    failureMode?: FailureMode;
    /** System instruction for the auxiliary optimizer call. */
    instruction?: string;
}
export declare const Config: z<Config>;
/**
 * Install the prompt optimizer on the cooperative `agent/pre-step` waterfall.
 * @param ctx - plugin context providing the LLM service.
 * @param config - validated optimizer configuration.
 */
export declare function apply(ctx: Context, config: Config): void;
