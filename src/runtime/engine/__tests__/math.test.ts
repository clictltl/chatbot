import { describe, it, expect, vi } from 'vitest';
import type { Block, Variable} from '@/shared/types/chatbot';
import { createRuntime } from './helpers';

describe('useChatRuntime – math', () => {
  it('performs math operation on variable', () => {
    vi.useFakeTimers();

    const variables: Record<string, Variable> = {
      count: {
        name: 'count',
        type: 'number',
        value: 2,
      },
    };

    const blocks: Block[] = [
      {
        id: 'start',
        type: 'start',
        nextBlockId: 'math1',
      } as Block,

      {
        id: 'math1',
        type: 'math',
        variableName: 'count',
        mathOperation: '+',
        mathValue: '3',
        nextBlockId: 'msg1',
      } as Block,

      {
        id: 'msg1',
        type: 'message',
        content: 'Total: {{count}}',
      } as Block,
    ];

    const rt = createRuntime(
      blocks,
      variables,
    );

    rt.start();
    vi.runAllTimers();

    expect(rt.messages.value).toHaveLength(1);
    expect(rt.messages.value[0].content).toBe('Total: 5');
    expect(rt.isRunning.value).toBe(false);

    vi.useRealTimers();
  });
});