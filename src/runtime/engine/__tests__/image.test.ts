import { describe, it, expect, vi } from 'vitest';
import type { Block } from '@/shared/types/chatbot';
import type { ProjectAsset } from '@/shared/types/project';
import { useChatRuntime } from '../useChatRuntime'; // Import direto para cenários complexos
import { createRuntime } from './helpers';

describe('useChatRuntime – image block', () => {
 
  // 1. Cenário Legado/Simples: URL Direta no Bloco
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

    vi.useRealTimers();
  });

  // 2. Cenário de Produção (Runtime Publicado): Busca no dicionário de assets
  it('resolves image from assets dictionary (published scenario)', () => {
    vi.useFakeTimers();

    const blocks: Block[] = [
      { id: 'start', type: 'start', nextBlockId: 'img1' } as Block,
      {
        id: 'img1',
        type: 'image',
        assetId: 'asset_wp_123', // ID que conecta ao asset
      } as Block,
    ];

    // Simula o objeto 'assets' que vem do JSON do banco de dados
    const mockAssets: Record<string, ProjectAsset> = {
      'asset_wp_123': {
        id: 'asset_wp_123',
        type: 'image/png',
        originalName: 'foto.png',
        size: 1024,
        hash: 'hash123',
        source: 'remote',
        url: 'https://meu-site-wp.com/wp-content/uploads/2023/10/foto.png'
      }
    };

    // Usamos useChatRuntime direto para poder passar 'assets'
    const rt = useChatRuntime({
      blocks,
      variables: {},
      assets: mockAssets
    });

    rt.start();
    vi.runAllTimers();

    const msg = rt.messages.value[0];
    expect(msg.type).toBe('image');
    // Verifica se ele "traduziu" o ID para a URL remota
    expect(msg.content).toBe('https://meu-site-wp.com/wp-content/uploads/2023/10/foto.png');

    vi.useRealTimers();
  });

  // 3. Cenário do Editor (Preview): Busca via callback resolveAsset
  it('resolves image using resolveAsset callback (editor preview scenario)', () => {
    vi.useFakeTimers();

    const blocks: Block[] = [
      { id: 'start', type: 'start', nextBlockId: 'img1' } as Block,
      {
        id: 'img1',
        type: 'image',
        assetId: 'asset_blob_id',
      } as Block,
    ];

    // Mock da função que o Editor passa (buscando do useAssetStore)
    const resolveMock = vi.fn().mockReturnValue('blob:http://localhost/uuid-blob-fake');

    const rt = useChatRuntime({
      blocks,
      variables: {},
      resolveAsset: resolveMock
    });

    rt.start();
    vi.runAllTimers();

    expect(resolveMock).toHaveBeenCalledWith('asset_blob_id');
    expect(rt.messages.value[0].content).toBe('blob:http://localhost/uuid-blob-fake');

    vi.useRealTimers();
  });

  // 4. Cenário de Erro: Sem URL e sem Asset
  it('emits error if image url is not defined anywhere', () => {
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

    expect(rt.messages.value[0].content).toBe('IMAGE_NOT_DEFINED');

    vi.useRealTimers();
    });
});