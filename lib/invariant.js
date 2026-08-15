/** Package-owned invariant companion for the prompt optimizer bundle. */
const PACKAGE_NAME = '@lizhecome/dsh-prompt-optimizer';
export const name = 'prompt-optimizer-invariant';
export const inject = ['invariants'];
/**
 * No runtime invariant: the plugin owns one effect-scoped waterfall listener
 * and retains no mutable state; its real-loop tests cover message durability
 * and disposal.
 */
const install = () => { };
/** Register package ownership with the Harness invariant registry. */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
