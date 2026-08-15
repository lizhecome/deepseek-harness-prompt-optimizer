# DeepSeek Harness 提示词优化插件

这是一个可安装的 DeepSeek Harness profile bundle。它在主 agent 请求前调用一次辅助 LLM 来优化用户提示词。实现方式是监听 Cordis 的协作式 `agent/pre-step` waterfall，不修改 agent loop。

[English](README.md)

## 安装

要求 DeepSeek Harness `0.1.0-rc.6` 或更高版本，并且 GitHub CLI 有权访问这个私有仓库。

```sh
gh repo clone lizhecome/deepseek-harness-prompt-optimizer
cd deepseek-harness-prompt-optimizer
dsh plugin --profile web add --ignore-workspace-root-check .
```

若要用于一次性任务，可将 `web` 改为 `headless`。DeepSeek Harness 会先把 `add .` 锚定到当前 checkout，再让 pnpm 切换到 profile 目录。包清单声明了 `dsh.bundle` patch，因此安装后会自动挂载优化器及其 invariant companion。

卸载命令：

```sh
dsh plugin --profile web remove --ignore-workspace-root-check @lizhecome/dsh-prompt-optimizer
```

## 行为

监听器会先调用下游监听器，再检查最终的 `PreStepDecision`。它只优化来源为直接用户、全部内容块都是文本、且去除首尾空白后长度达到 `minChars` 的消息。插件上下文、工具结果、goal round、relay、图片和短提示词都会原样通过。

默认的 `append` 模式保留原始用户消息，并将优化结果作为单独标记来源的 `notice` 追加。两条消息都会在主请求前记录为 `user/message` 事件，因此回放内容与模型实际看到的内容一致。`replace` 模式保留原消息的 identity 和 source，但只记录并发送优化后的文本。

优化模型的路由优先级如下：

1. 配置中的 `provider` 与 `model`；
2. session 最近一次已路由的请求；
3. agent 显式配置的 provider/model。

若三者都不存在，优化会失败。默认 `pass-through` 策略会记录 warning 并保留原提示词；`fail` 会让拟进入的 step 失败。turn 的取消信号始终会继续传播。

## 配置

后应用的 profile patch 会整体替换一行的 `config`，因此需要重写所有希望保留的字段：

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

| 字段 | 默认值 | 含义 |
|---|---:|---|
| `provider` | `''` | 辅助模型 provider；必须与 `model` 一起设置，留空则跟随 agent 路由。 |
| `model` | `''` | 辅助模型；必须与 `provider` 一起设置，留空则跟随 agent 路由。 |
| `maxTokens` | `1024` | 优化输出的正整数 token 上限；达到上限的结果会被视为不完整并拒绝。 |
| `minChars` | `20` | 触发优化的非负字符数阈值。 |
| `delivery` | `append` | `append` 保留原文并追加有来源的 notice；`replace` 替换原文。 |
| `failureMode` | `pass-through` | 运行失败后保留原提示词，或用 `fail` 让拟进入的 step 失败。 |
| `instruction` | 内置 | 辅助调用的 system instruction；空白值会在加载时被拒绝。 |

`provider` 与 `model` 是不可拆分的一对。只设置其中一项、使用非整数上限或空白 instruction 都会导致插件加载失败。

## 模型与成本影响

每条符合条件的提示词会增加一次独立模型请求。其输入是直接用户消息和优化器 system instruction，输出受 `maxTokens` 限制。`append` 会让主请求同时包含原文和优化结果，因此 token 更多；`replace` 不重复主请求 token，但 durable history 中不再保留原文。辅助请求复用 session id 做路由，但不复用主会话前缀。

内置 instruction 要求优化器保留语言、事实、标识符、引用文本、约束和输出格式，减少歧义与冗余，不虚构需求，并且只返回改写后的提示词。

## 已知限制

- 多模态或混合内容块的直接用户消息不会被优化。
- 提示词优化本质上仍是模型生成，可能扭曲意图；需要审计性时应使用 `append`。
- 辅助调用本身不会作为单独 session event 保存；交付给主模型的优化结果会记录在主 turn 中。

## 开发

```sh
pnpm install
pnpm run check
```

测试会启动已发布的 Harness 服务和真实 agent loop，并使用确定性的进程内 LLM adapter，覆盖 durable append/replace、失败回退、短提示词绕过和监听器 dispose。
