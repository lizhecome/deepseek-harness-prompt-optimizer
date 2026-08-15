import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry, { type Agent } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import LlmRuntime, {
  createUserMessage,
  LlmAdapter,
} from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import * as PromptOptimizer from '../src/index.ts'
import type { Config } from '../src/index.ts'

class ScriptedAdapter extends LlmAdapter {
  readonly requests: GenerateOptions[] = []
  failOptimizer = false

  override async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options)
    if (options.system === PromptOptimizer.DEFAULT_INSTRUCTION) {
      if (this.failOptimizer) {
        yield {
          type: 'finish',
          reason: { kind: 'error', failure: { code: 'TEST_FAILURE', message: 'optimizer unavailable' } },
        }
        return
      }
      yield { type: 'text-delta', index: 0, text: 'Optimized: implement the feature and verify its behavior.' }
      yield { type: 'finish', reason: { kind: 'stop' } }
      return
    }
    yield { type: 'text-delta', index: 0, text: 'done' }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

const contexts: Context[] = []

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
})

async function harness(config: Config = {}): Promise<{
  ctx: Context
  adapter: ScriptedAdapter
  agent: Agent
}> {
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(PromptOptimizer, config)
  const adapter = new ScriptedAdapter()
  ctx.llm.registerAdapter(['mock'], adapter)
  const agent = ctx.agentLoop.create(SessionId(crypto.randomUUID()), {
    provider: 'mock',
    model: 'mock',
  })
  return { ctx, adapter, agent }
}

async function submit(agent: Agent, text: string): Promise<void> {
  agent.followup(createUserMessage({
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  }))
  await agent.whenIdle()
}

describe('prompt optimizer', () => {
  it('appends a sourced optimization and records both messages before the main request', async () => {
    const { adapter, agent } = await harness()

    await submit(agent, 'Please implement the requested feature in this repository.')

    expect(adapter.requests).toHaveLength(2)
    expect(adapter.requests[0]).toMatchObject({
      provider: 'mock',
      model: 'mock',
      maxTokens: 1024,
      sessionId: agent.id,
    })
    expect(adapter.requests[0]?.system).toBe(PromptOptimizer.DEFAULT_INSTRUCTION)

    const mainMessages = adapter.requests[1]?.messages ?? []
    expect(mainMessages.map(message => message.content)).toEqual([
      [{ type: 'text', text: 'Please implement the requested feature in this repository.' }],
      [{ type: 'text', text: 'Optimized: implement the feature and verify its behavior.' }],
    ])
    expect(mainMessages[1]?.source).toEqual({
      kind: 'plugin',
      plugin: 'prompt-optimizer',
      form: 'notice',
      summary: 'Optimized direct user prompt',
    })

    const recorded = [...agent.session.events].filter(event => event.type === 'user/message')
    expect(recorded).toHaveLength(2)
    expect(recorded.map(event => event.type === 'user/message' && event.data.source.kind))
      .toEqual(['user', 'plugin'])
  })

  it('can replace the direct-user text while preserving message identity and source', async () => {
    const { adapter, agent } = await harness({ delivery: 'replace' })
    const original = createUserMessage({
      content: [{ type: 'text', text: 'Please implement the requested feature in this repository.' }],
      source: { kind: 'user' },
    })

    agent.followup(original)
    await agent.whenIdle()

    const main = adapter.requests[1]?.messages[0]
    expect(main).toMatchObject({
      id: original.id,
      source: { kind: 'user' },
      content: [{ type: 'text', text: 'Optimized: implement the feature and verify its behavior.' }],
    })
    expect(adapter.requests[1]?.messages).toHaveLength(1)
  })

  it('skips short prompts without making an auxiliary request', async () => {
    const { adapter, agent } = await harness({ minChars: 20 })

    await submit(agent, 'hello')

    expect(adapter.requests).toHaveLength(1)
    expect(adapter.requests[0]?.system).not.toBe(PromptOptimizer.DEFAULT_INSTRUCTION)
    expect(adapter.requests[0]?.messages[0]?.content).toEqual([{ type: 'text', text: 'hello' }])
  })

  it('passes the original prompt through when optimization fails', async () => {
    const { adapter, agent } = await harness()
    adapter.failOptimizer = true

    await submit(agent, 'Please implement the requested feature in this repository.')

    expect(adapter.requests).toHaveLength(2)
    expect(adapter.requests[1]?.messages).toHaveLength(1)
    expect(adapter.requests[1]?.messages[0]?.content).toEqual([
      { type: 'text', text: 'Please implement the requested feature in this repository.' },
    ])
  })

  it('fails the proposed step when configured to fail closed', async () => {
    const { adapter, agent } = await harness({ failureMode: 'fail' })
    adapter.failOptimizer = true

    await submit(agent, 'Please implement the requested feature in this repository.')

    expect(adapter.requests).toHaveLength(1)
    expect([...agent.session.events].some(event => event.type === 'step/start')).toBe(false)
    expect([...agent.session.events].some(event => event.type === 'user/message')).toBe(false)
  })

  it('removes its listener when the plugin fiber is disposed', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(LlmRuntime)
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(AgentRegistry)
    await ctx.plugin(AgentLoop, { agents: [] })
    const mounted = await ctx.plugin(PromptOptimizer, {})
    const adapter = new ScriptedAdapter()
    ctx.llm.registerAdapter(['mock'], adapter)
    await mounted.dispose()
    const agent = ctx.agentLoop.create(SessionId(crypto.randomUUID()), {
      provider: 'mock',
      model: 'mock',
    })

    await submit(agent, 'Please implement the requested feature in this repository.')

    expect(adapter.requests).toHaveLength(1)
    expect(adapter.requests[0]?.system).not.toBe(PromptOptimizer.DEFAULT_INSTRUCTION)
  })

  it('rejects a half-configured optimizer route at plugin load', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(LlmRuntime)

    await expect(ctx.plugin(PromptOptimizer, { provider: 'mock' }))
      .rejects.toThrow('`provider` and `model` must be set together')
  })
})
