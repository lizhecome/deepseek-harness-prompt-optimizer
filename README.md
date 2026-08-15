# DeepSeek Harness Prompt Optimizer

An installable DeepSeek Harness profile bundle that uses an auxiliary LLM call to improve direct user prompts before the main agent request. It is an ordinary Cordis plugin on the cooperative `agent/pre-step` waterfall; it does not patch the agent loop.

[中文说明](README.zh.md)

## Install

Requires DeepSeek Harness `0.1.0-rc.6` or later and an authenticated GitHub checkout for this repository.

```sh
dsh plugin --profile web add --ignore-workspace-root-check git+https://github.com/lizhecome/deepseek-harness-prompt-optimizer.git
```

Use `headless` instead of `web` to enable it for one-shot tasks. The package manifest declares a `dsh.bundle` patch, so installation mounts the optimizer and its invariant companion automatically.

To remove it:

```sh
dsh plugin --profile web remove --ignore-workspace-root-check @lizhecome/dsh-prompt-optimizer
```

## Behavior

The listener delegates first, then inspects the final `PreStepDecision`. It optimizes only direct-user messages whose blocks are all text and whose trimmed length reaches `minChars`. Plugin context, tool results, goal rounds, relays, images, and short prompts pass through unchanged.

The default `append` delivery preserves the original user message and adds the optimized text as a separately sourced `notice`. Both messages are recorded as `user/message` events before the main request, so replay and the model see the same content. `replace` keeps the original message identity and source but records and sends only the optimized text.

The optimizer route resolves in this order:

1. configured `provider` and `model`;
2. the session's last routed request;
3. the agent's explicit provider/model options.

If none is available, optimization fails. With the default `pass-through` policy, the plugin logs a warning and preserves the original prompt. `fail` rejects the proposed step instead. Turn cancellation is always propagated.

## Configuration

Later profile patches replace a row's complete `config`, so restate every field you want to keep:

```yaml
- id: prompt-optimizer
  config:
    provider: deepseek
    model: deepseek-chat
    maxTokens: 1024
    minChars: 20
    delivery: append
    failureMode: pass-through
    instruction: >-
      Rewrite the prompt for precise execution. Preserve every constraint and
      return only the rewritten prompt; do not solve the task.
```

| Field | Default | Meaning |
|---|---:|---|
| `provider` | `''` | Auxiliary provider. Set together with `model`; empty follows the agent route. |
| `model` | `''` | Auxiliary model. Set together with `provider`; empty follows the agent route. |
| `maxTokens` | `1024` | Positive integer output cap for the optimizer call. A capped response is rejected as incomplete. |
| `minChars` | `20` | Non-negative trimmed character threshold for optimization. |
| `delivery` | `append` | `append` preserves the original and adds a sourced notice; `replace` substitutes its text. |
| `failureMode` | `pass-through` | Preserve the original after a runtime error, or `fail` the proposed step. |
| `instruction` | built in | System instruction for the auxiliary call; a blank value is rejected at load. |

`provider` and `model` are an atomic pair. A half-configured route, non-integer bound, or blank instruction fails at plugin load.

## Model and cost effects

Every eligible prompt adds one independent model request. Its input is the direct user message plus the optimizer system instruction, and its output is bounded by `maxTokens`. `append` makes the main request longer because it contains both versions; `replace` avoids that duplication but does not retain the original prompt in durable history. Auxiliary requests reuse the session id for routing but do not reuse the main conversation prefix.

The built-in instruction tells the optimizer to preserve language, facts, identifiers, quoted text, constraints, and requested output format; remove ambiguity and redundancy; avoid inventing requirements; and return only a rewritten prompt.

## Known limitations

- Multimodal and mixed-block direct-user messages pass through unchanged.
- Prompt optimization is semantic model output, so it can still distort intent; use `append` when auditability matters.
- The auxiliary call is not itself stored as a separate session event. Its delivered output is stored in the main turn.

## Development

```sh
pnpm install
pnpm run check
```

The tests boot the published Harness services and a real agent loop with a deterministic in-process LLM adapter. They verify durable append/replace behavior, failure fallback, short-prompt bypass, and listener disposal.
