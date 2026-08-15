/** Browser entry for the prompt optimizer composer control. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/** Simplified Chinese dictionary and key-set source of truth. */
export declare const zh: {
    'button.label': string;
    'button.title': string;
    'status.running': string;
    'status.success': string;
    'status.stale': string;
    'error.empty': string;
    'error.unknown-command': string;
};
/** Locale keys owned by the composer control. */
export type PromptOptimizerLocaleKey = keyof typeof zh;
/** English dictionary checked against the Chinese key set. */
export declare const en: {
    'button.label': string;
    'button.title': string;
    'status.running': string;
    'status.success': string;
    'status.stale': string;
    'error.empty': string;
    'error.unknown-command': string;
};
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Copy for the prompt optimizer composer button. */
        'prompt-optimizer': PromptOptimizerLocaleKey;
    }
}
/** Business face injected into the composer slot. */
export interface PromptOptimizerButtonInjected {
    /** Rewrite one unsent draft through the host optimizer command. */
    optimizePrompt: (draft: string) => Promise<string>;
}
/** Complete component props composed by the slot runtime. */
export type PromptOptimizerButtonProps = PropsRuntime<'conversation.input.right'> & InjectFace<PromptOptimizerButtonInjected> & PropsLocale<'prompt-optimizer'>;
/** Optimize the current draft without overwriting edits made while the request is running. */
export declare function PromptOptimizerButton({ input, inputActions, optimizePrompt, t, }: PromptOptimizerButtonProps): JSX.Element;
/** Required client services: slot, command Remote, and locale registries. */
export declare const inject: string[];
/** Register the composer button and its localized dictionaries. */
export declare function apply(ctx: ClientContext): void;
