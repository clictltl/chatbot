import { describe, it, expect, vi } from 'vitest';
import type { Block } from '@/shared/types/chatbot';
import { createRuntime } from './helpers';

describe('useChatRuntime – stopChat', () => {
  it('cancels pending execution when stopped', () => {
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
        content: 'Isso não deve aparecer',
      } as Block,
    ];

    const rt = createRuntime(blocks);

    rt.start();

    // interrompe imediatamente antes do timeout executar
    rt.stopChat();

    // executa todos os timers pendentes
    vi.runAllTimers();

    // nenhuma mensagem deve ter sido adicionada
    expect(rt.messages.value).toHaveLength(0);
    expect(rt.isRunning.value).toBe(false);

    vi.useRealTimers();
  });

  it('invalidates previous session when restarted', () => {
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
        content: 'Mensagem válida',
        } as Block,
    ];

    const rt = createRuntime(blocks);

    // inicia primeira sessão
    rt.start();

    // reinicia antes do timeout da primeira
    rt.start();

    // executa timers
    vi.runAllTimers();

    // apenas UMA mensagem deve existir
    expect(rt.messages.value).toHaveLength(1);
    expect(rt.messages.value[0].content).toBe('Mensagem válida');

    vi.useRealTimers();
    });
});