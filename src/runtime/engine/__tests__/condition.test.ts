import { describe, it, expect, vi } from 'vitest';
import type { Block, Variable} from '@/shared/types/chatbot';
import { createRuntime } from './helpers';

describe('useChatRuntime – condition block', () => {
  it('follows the first matching condition', () => {
    vi.useFakeTimers();

    const conditionVariables: Record<string, Variable> = {
      score: {
        name: 'score',
        type: 'number',
        value: 10,
      },
    };

    const blocks: Block[] = [
      {
        id: 'start',
        type: 'start',
        nextBlockId: 'cond1',
      } as Block,

      {
        id: 'cond1',
        type: 'condition',
        conditions: [
          {
            variableName: 'score',
            operator: '>=',
            value: 10,
            nextBlockId: 'msgOk',
          },
          {
            variableName: 'score',
            operator: '<',
            value: 10,
            nextBlockId: 'msgFail',
          },
        ],
      } as Block,

      {
        id: 'msgOk',
        type: 'message',
        content: 'Aprovado',
      } as Block,

      {
        id: 'msgFail',
        type: 'message',
        content: 'Reprovado',
      } as Block,
    ];

    const rt = createRuntime(
      blocks,
      conditionVariables
    );

    rt.start();
    vi.runAllTimers();

    expect(rt.messages.value).toHaveLength(1);
    expect(rt.messages.value[0].type).toBe('bot');
    expect(rt.messages.value[0].content).toBe('Aprovado');

    expect(rt.isRunning.value).toBe(false);

    vi.useRealTimers();
  });
});

describe('useChatRuntime – condition errors', () => {
  it('emits error if no condition matches', () => {
    vi.useFakeTimers();

    const variables: Record<string, Variable> = {
      score: {
        name: 'score',
        type: 'number',
        value: 5,
      },
    };

    const blocks: Block[] = [
      {
        id: 'start',
        type: 'start',
        nextBlockId: 'cond1',
      } as Block,

      {
        id: 'cond1',
        type: 'condition',
        conditions: [
          {
            variableName: 'score',
            operator: '>',
            value: 10,
            nextBlockId: 'high',
          },
          {
            variableName: 'score',
            operator: '<',
            value: 0,
            nextBlockId: 'low',
          },
        ],
      } as Block,
    ];

    const rt = createRuntime(
      blocks,
      variables
    );

    rt.start();
    vi.runAllTimers();

    expect(rt.messages.value).toHaveLength(1);
    expect(rt.messages.value[0].type).toBe('bot');
    expect(rt.messages.value[0].content).toBe('NO_CONDITION_MATCH');

    expect(rt.isRunning.value).toBe(false);

    vi.useRealTimers();
  });

  it('emits error if condition target block does not exist', () => {
    vi.useFakeTimers();

    const variables: Record<string, Variable> = {
        score: {
        name: 'score',
        type: 'number',
        value: 10,
        },
    };

    const blocks: Block[] = [
        {
        id: 'start',
        type: 'start',
        nextBlockId: 'cond1',
        } as Block,

        {
        id: 'cond1',
        type: 'condition',
        conditions: [
            {
            variableName: 'score',
            operator: '>=',
            value: 10,
            nextBlockId: 'missing',
            },
        ],
        } as Block,
    ];

    const rt = createRuntime(
        blocks,
        variables
    );

    rt.start();
    vi.runAllTimers();

    expect(rt.messages.value).toHaveLength(1);
    expect(rt.messages.value[0].content).toBe('INVALID_NEXT_BLOCK');
    expect(rt.isRunning.value).toBe(false);

    vi.useRealTimers();
    });

});