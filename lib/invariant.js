/** Package-owned invariant companion for the prompt optimizer bundle. */
const PACKAGE_NAME = '@lizhecome/dsh-prompt-optimizer';
export const name = 'prompt-optimizer-invariant';
export const inject = ['invariants'];
/**
 * No runtime invariant: the listener and command are effect-scoped, while the
 * one-shot composer bypass is held in a WeakMap keyed by live agents. Real-loop
 * tests cover message durability, exact-match consumption, and disposal.
 */
const install = () => { };
/** Register package ownership with the Harness invariant registry. */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
