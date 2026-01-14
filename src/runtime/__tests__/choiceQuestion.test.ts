import { describe, it, expect, vi } from 'vitest';
import type { Block } from '@/types/chatbot';
import { createRuntime } from './helpers';

describe('useChatRuntime – choice question', () => {
  it('allows selecting a choice and follows correct path', () => {
    vi.useFakeTimers();

    const blocks: Block[] = [
      {
        id: 'start',
        type: 'start',
        nextBlockId: 'q1',
      } as Block,

      {
        id: 'q1',
        type: 'choiceQuestion',
        content: 'Escolha uma opção',
        choices: [
          {
            id: 'c1',
            label: 'Opção A',
            nextBlockId: 'msgA',
          },
          {
            id: 'c2',
            label: 'Opção B',
            nextBlockId: 'msgB',
          },
        ],
      } as Block,

      {
        id: 'msgA',
        type: 'message',
        content: 'Você escolheu A',
      } as Block,

      {
        id: 'msgB',
        type: 'message',
        content: 'Você escolheu B',
      } as Block,
    ];

    const rt = createRuntime(blocks);

    // inicia o chat
    rt.start();
    vi.runAllTimers();

    // está em modo de escolha
    expect(rt.isWaitingForInput.value).toBe(false);
    expect(rt.currentChoices.value).toHaveLength(2);

    // seleciona a primeira opção
    rt.selectChoice(rt.currentChoices.value[0]);
    vi.runAllTimers();

    // mensagens: bot pergunta, user responde, bot confirma
    expect(rt.messages.value).toHaveLength(3);

    expect(rt.messages.value[0].type).toBe('bot');
    expect(rt.messages.value[0].content).toBe('Escolha uma opção');

    expect(rt.messages.value[1].type).toBe('user');
    expect(rt.messages.value[1].content).toBe('Opção A');

    expect(rt.messages.value[2].type).toBe('bot');
    expect(rt.messages.value[2].content).toBe('Você escolheu A');

    // estado final
    expect(rt.isRunning.value).toBe(false);
    expect(rt.currentChoices.value).toHaveLength(0);

    vi.useRealTimers();
  });
});
