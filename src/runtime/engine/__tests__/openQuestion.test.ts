import { describe, it, expect, vi } from 'vitest';
import type { Block, Variable } from '@/shared/types/chatbot';
import { createRuntime } from './helpers';

describe('useChatRuntime – open question', () => {
  it('accepts user input and stores variable', () => {
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
        nextBlockId: 'q1',
      } as Block,

      {
        id: 'q1',
        type: 'openQuestion',
        content: 'Qual é o seu nome?',
        variableName: 'name',
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
      variables,
    );

    // inicia o chat
    rt.start();
    vi.runAllTimers();

    // está aguardando input
    expect(rt.isWaitingForInput.value).toBe(true);

    // envia resposta do usuário
    rt.submitText('João');

    // executa timeouts após submit
    vi.runAllTimers();

    // mensagem do usuário + mensagem do bot
    expect(rt.messages.value).toHaveLength(3);

    expect(rt.messages.value[0].type).toBe('bot');
    expect(rt.messages.value[0].content).toBe('Qual é o seu nome?');

    expect(rt.messages.value[1].type).toBe('user');
    expect(rt.messages.value[1].content).toBe('João');

    expect(rt.messages.value[2].type).toBe('bot');
    expect(rt.messages.value[2].content).toBe('Olá João');

    // estado final
    expect(rt.isRunning.value).toBe(false);
    expect(rt.isWaitingForInput.value).toBe(false);

    vi.useRealTimers();
  });
});
