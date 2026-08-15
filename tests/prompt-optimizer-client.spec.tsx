// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  en,
  PromptOptimizerButton,
  type PromptOptimizerButtonProps,
} from '../src/client/index.tsx'

let root: Root | undefined
let container: HTMLDivElement | undefined

afterEach(() => {
  if (root !== undefined) act(() => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

function props(
  draft: string,
  draftRev: number,
  optimizePrompt: (text: string) => Promise<string>,
  setDraft: (text: string) => void,
): PromptOptimizerButtonProps {
  return {
    input: { draft, draftRev, phase: 'plain' },
    inputActions: { setDraft },
    optimizePrompt,
    t: key => en[key],
  } as unknown as PromptOptimizerButtonProps
}

function render(componentProps: PromptOptimizerButtonProps): HTMLButtonElement {
  container ??= document.createElement('div')
  document.body.append(container)
  root ??= createRoot(container)
  act(() => root?.render(<PromptOptimizerButton {...componentProps} />))
  const button = container.querySelector<HTMLButtonElement>('[data-prompt-optimizer="button"]')
  if (button === null) throw new Error('prompt optimizer button did not render')
  return button
}

describe('prompt optimizer composer button', () => {
  it('replaces an unchanged draft with the optimized text', async () => {
    const setDraft = vi.fn()
    const optimizePrompt = vi.fn(async () => 'A precise prompt')
    const button = render(props('a rough prompt', 3, optimizePrompt, setDraft))

    await act(async () => button.click())

    expect(optimizePrompt).toHaveBeenCalledWith('a rough prompt')
    expect(setDraft).toHaveBeenCalledWith('A precise prompt')
    expect(button.getAttribute('data-state')).toBe('success')
  })

  it('does not overwrite text edited while optimization is running', async () => {
    let resolve!: (value: string) => void
    const optimizePrompt = vi.fn(() => new Promise<string>(done => {
      resolve = done
    }))
    const setDraft = vi.fn()
    const button = render(props('first draft', 4, optimizePrompt, setDraft))

    act(() => button.click())
    render(props('first draft with edit', 5, optimizePrompt, setDraft))
    await act(async () => resolve('optimized first draft'))

    expect(setDraft).not.toHaveBeenCalled()
    expect(button.getAttribute('data-state')).toBe('error')
    expect(button.title).toBe(en['status.stale'])
  })

  it('is disabled for a blank draft', () => {
    const button = render(props('   ', 0, vi.fn(), vi.fn()))

    expect(button.disabled).toBe(true)
  })
})
