import { describe, it, expect, vi } from 'vitest';
import type { Block } from '@/shared/types/chatbot';
import { createRuntime } from './helpers';

describe('useChatRuntime – initialization', () => {
  it('starts with idle state', () => {
    const rt = createRuntime([]);

    expect(rt.isRunning.value).toBe(false);
    expect(rt.messages.value).toHaveLength(0);
    expect(rt.currentChoices.value).toHaveLength(0);
    expect(rt.isWaitingForInput.value).toBe(false);
  });
});

describe('useChatRuntime – start block', () => {
  it('emits error if no start block exists', () => {
    vi.useFakeTimers();

    const blocks: Block[] = [
      {
        id: 'msg1',
        type: 'message',
        content: 'Olá',
      } as Block,
    ];

    const rt = createRuntime(blocks);

    rt.start();

    // executa timeouts internos
    vi.runAllTimers();

    expect(rt.messages.value).toHaveLength(1);
    expect(rt.messages.value[0].content).toBe('NO_START_BLOCK');
    expect(rt.isRunning.value).toBe(false);

    vi.useRealTimers();
  });
});
