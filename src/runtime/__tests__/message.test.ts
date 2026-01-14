import { describe, it, expect, vi } from 'vitest';
import type { Block } from '@/types/chatbot';
import { createRuntime } from './helpers';

describe('useChatRuntime – simple flow', () => {
  it('runs start → message → end correctly', () => {
    vi.useFakeTimers();

    const blocks: Block[] = [
      {
        id: 'start',
        type: 'start',
        nextBlockId: 'msg1',
      } as Block,

      {
        id: 'msg1',
        type: 'message',
        content: 'Olá mundo',
      } as Block,
    ];

    const rt = createRuntime(blocks);

    rt.start();

    // executa os timeouts do start e message
    vi.runAllTimers();

    expect(rt.messages.value).toHaveLength(1);
    expect(rt.messages.value[0].type).toBe('bot');
    expect(rt.messages.value[0].content).toBe('Olá mundo');

    expect(rt.isRunning.value).toBe(false);
    expect(rt.isWaitingForInput.value).toBe(false);
    expect(rt.currentChoices.value).toHaveLength(0);

    vi.useRealTimers();
  });
});
