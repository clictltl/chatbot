import { describe, it, expect, vi } from 'vitest';
import type { Block } from '@/shared/types/chatbot';
import { createRuntime } from './helpers';

describe('useChatRuntime – image block', () => {
  it('adds image message and continues flow', () => {
    vi.useFakeTimers();

    const blocks: Block[] = [
      {
        id: 'start',
        type: 'start',
        nextBlockId: 'img1',
      } as Block,

      {
        id: 'img1',
        type: 'image',
        imageUrl: 'https://example.com/image.png',
        nextBlockId: 'msg1',
      } as Block,

      {
        id: 'msg1',
        type: 'message',
        content: 'Imagem exibida',
      } as Block,
    ];

    const rt = createRuntime(blocks);

    rt.start();
    vi.runAllTimers();

    expect(rt.messages.value).toHaveLength(2);

    expect(rt.messages.value[0].type).toBe('image');
    expect(rt.messages.value[0].content).toBe('https://example.com/image.png');

    expect(rt.messages.value[1].type).toBe('bot');
    expect(rt.messages.value[1].content).toBe('Imagem exibida');

    expect(rt.isRunning.value).toBe(false);

    vi.useRealTimers();
  });

  it('emits error if image url is not defined', () => {
    vi.useFakeTimers();

    const blocks: Block[] = [
        {
        id: 'start',
        type: 'start',
        nextBlockId: 'img1',
        } as Block,

        {
        id: 'img1',
        type: 'image',
        // sem imageUrl / imageData
        } as Block,
    ];

    const rt = createRuntime(blocks);

    rt.start();
    vi.runAllTimers();

    expect(rt.messages.value).toHaveLength(1);
    expect(rt.messages.value[0].type).toBe('bot');
    expect(rt.messages.value[0].content).toBe('IMAGE_NOT_DEFINED');
    expect(rt.isRunning.value).toBe(false);

    vi.useRealTimers();
    });
});