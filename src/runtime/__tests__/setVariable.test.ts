import { describe, it, expect, vi } from 'vitest';
import type { Block, Variable } from '@/types/chatbot';
import { createRuntime } from './helpers';

describe('useChatRuntime – setVariable', () => {
  it('sets variable value and continues flow', () => {
    vi.useFakeTimers();

    const variables: Record<string, Variable> = {
      name: {
        name: 'name',
        type: 'string',
        value: '',
      },
    };

    const blocks: Block[] = [
      {
        id: 'start',
        type: 'start',
        nextBlockId: 'set1',
      } as Block,

      {
        id: 'set1',
        type: 'setVariable',
        variableName: 'name',
        variableValue: 'Maria',
        nextBlockId: 'msg1',
      } as Block,

      {
        id: 'msg1',
        type: 'message',
        content: 'Olá {{name}}',
      } as Block,
    ];

    const rt = createRuntime(
      blocks,
      variables
    );

    rt.start();
    vi.runAllTimers();

    expect(rt.messages.value).toHaveLength(1);
    expect(rt.messages.value[0].content).toBe('Olá Maria');
    expect(rt.isRunning.value).toBe(false);

    vi.useRealTimers();
  });
});