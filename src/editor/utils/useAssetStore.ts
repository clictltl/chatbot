import { reactive } from 'vue';
import { assets, blocks } from './projectData'; // Acesso direto ao estado reativo
import type { ProjectAsset } from '@/shared/types/project';

// --- CONFIGURAÇÃO DE SEGURANÇA ---
const MAX_FILE_SIZE_MB = 2; // Limite de 2MB (bom para web)
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 
  'image/png', 
  'image/gif', 
  'image/webp'
];

// Assinaturas Hexadecimais (Magic Bytes) para validação real
const MAGIC_BYTES: Record<string, string> = {
  'ffd8ff': 'image/jpeg',       // JPEG
  '89504e47': 'image/png',      // PNG
  '47494638': 'image/gif',      // GIF
  '52494646': 'image/webp'      // RIFF (WebP começa com RIFF)
};

// --- CONFIGURAÇÃO INDEXED DB (PERSISTÊNCIA TEMPORÁRIA) ---
const DB_NAME = 'ClicChatbot_TempAssets';
const STORE_NAME = 'local_blobs';
const DB_VERSION = 1;

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME); // Key = AssetID, Value = Blob
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// --- FUNÇÃO DE VALIDAÇÃO ---
async function validateFileSecurity(file: File): Promise<void> {
  // 1. Verificação de Tamanho
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`O arquivo é muito grande. Máximo permitido: ${MAX_FILE_SIZE_MB}MB.`);
  }

  // 2. Verificação de Extensão (MIME type reportado pelo browser)
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Formato de arquivo não permitido. Use: JPG, PNG, GIF ou WebP.`);
  }

  // 3. Verificação de Magic Bytes (Deep Inspection)
  // Lê os primeiros 4 bytes do arquivo para checar a assinatura real
  const chunk = file.slice(0, 4);
  const buffer = await chunk.arrayBuffer();
  const header = new Uint8Array(buffer);
  const hex = [...header].map(b => b.toString(16).padStart(2, '0')).join('');

  // Verifica se o hex bate com algum dos permitidos
  const isSignatureValid = Object.keys(MAGIC_BYTES).some(signature => {
    return hex.toLowerCase().startsWith(signature);
  });

  if (!isSignatureValid) {
    throw new Error('O arquivo parece estar corrompido ou mascara um formato inválido.');
  }
}

// Registro de Blobs em memória (Volátil: ID -> Blob URL)
const blobRegistry = reactive<Record<string, string>>({});

// Função auxiliar para calcular o SHA-256
async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useAssetStore() {
  
  /**
   * Registra um arquivo vindo de input (Upload Novo)
   */
  async function addAssetFile(file: File): Promise<string> {
    
    // --> INJEÇÃO DE SEGURANÇA <--
    // Se falhar aqui, lança erro e para tudo antes de calcular hash ou salvar
    await validateFileSecurity(file);

    // 1. Calcula a assinatura digital do arquivo
    const fileHash = await computeFileHash(file);

    // 2. Procura por duplicata baseada no CONTEÚDO (Hash)
    for (const existingId in assets.value) {
      const asset = assets.value[existingId];
      
      if (asset.hash === fileHash) {
        // Se achou, verifica se o blob ainda está vivo na memória
        // (Ou se é remoto, também serve)
        if (blobRegistry[existingId] || asset.source === 'remote') {
          return existingId;
        }
      }
    }

    // 3. Se é novo, registra
    const assetId = crypto.randomUUID();
    const blobUrl = URL.createObjectURL(file);
    blobRegistry[assetId] = blobUrl;

    const newAsset: ProjectAsset = {
      id: assetId,
      type: file.type,
      originalName: file.name,
      size: file.size,
      hash: fileHash,
      source: 'local'
    };

    assets.value[assetId] = newAsset;

    return assetId;
  }

  /**
   * Remove o asset se nenhum bloco estiver usando ele.
   * Deve ser chamada APÓS remover a referência do bloco.
   */
  function deleteAssetIfUnused(assetId: string, excludeBlockId?: string) {

    // Verifica se algum bloco usa esse assetId
    const isUsed = blocks.value.some(block => {
      // Se for o bloco que estamos editando agora, ignoramos ele na contagem
      if (excludeBlockId && block.id === excludeBlockId) {
        return false;
      }
      return block.assetId === assetId;
    });

    if (isUsed) {
      return; 
    }

    // 2. Se ninguém usa, faxina completa
    if (assets.value[assetId]) {
      // Remove do registro global (JSON)
      delete assets.value[assetId];
      
      // Remove da memória do navegador (Revoke Blob URL)
      if (blobRegistry[assetId]) {
        URL.revokeObjectURL(blobRegistry[assetId]);
        delete blobRegistry[assetId];
      }
    }
  }

  /**
   * Retorna a URL para exibir na tag <img>
   */
  function getAssetSrc(assetId: string): string | undefined {
    // 1. Verifica se está na memória (Blob local)
    if (blobRegistry[assetId]) {
      return blobRegistry[assetId];
    }

    // 2. Verifica se é remoto (URL pública)
    const asset = assets.value[assetId];
    if (asset?.source === 'remote' && asset.url) {
      return asset.url;
    }

    return undefined; // Não encontrado
  }

  /**
   * Usado pelo Importador ZIP para registrar blobs extraídos
   */
  function registerBlob(assetId: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    blobRegistry[assetId] = url;
  }

  /**
   * Usado pelo Exportador ZIP para pegar o binário
   */
  async function getAssetBlob(assetId: string): Promise<Blob | null> {
    const url = blobRegistry[assetId];
    if (!url) return null;
    
    try {
      const res = await fetch(url);
      return await res.blob();
    } catch (e) {
      console.error(`Erro ao ler blob ${assetId}`, e);
      return null;
    }
  }

  /**
   * Limpa urls da memória (Garbage Collection)
   */
  function clearRegistry() {
    Object.values(blobRegistry).forEach(url => URL.revokeObjectURL(url));
    Object.keys(blobRegistry).forEach(key => delete blobRegistry[key]);
  }

  /**
   * Salva todos os Blobs locais no IndexedDB
   * (Chamado antes do reload de login)
   */
  async function persistToDisk() {
    const localAssets = Object.values(assets.value).filter(a => a.source === 'local');
    if (localAssets.length === 0) return;

    // 1. Pré-carregamento: Busca todos os blobs para a memória RAM antes de tocar no banco
    // Isso evita o erro "Transaction inactive" causado pelo await dentro da transação
    const blobsToSave: { id: string; blob: Blob }[] = [];
    
    for (const asset of localAssets) {
      const blob = await getAssetBlob(asset.id);
      if (blob) {
        blobsToSave.push({ id: asset.id, blob });
      }
    }

    if (blobsToSave.length === 0) return;

    const db = await getDB();
    
    // 2. Limpa banco antigo
    const txClear = db.transaction(STORE_NAME, 'readwrite');
    txClear.objectStore(STORE_NAME).clear();
    await new Promise(resolve => { txClear.oncomplete = resolve; });

    // 3. Gravação Síncrona (do ponto de vista do Event Loop)
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Agora o loop é rápido e sem 'await', mantendo a transação viva
    for (const item of blobsToSave) {
      store.put(item.blob, item.id);
    }

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Recupera Blobs do IndexedDB e reinjeta na memória
   * (Chamado no onMounted se houver backup)
   */
  async function restoreFromDisk() {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAllKeys();

    const keys = await new Promise<string[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });

    for (const key of keys) {
      const getReq = store.get(key);
      const blob = await new Promise<Blob>((resolve) => {
        getReq.onsuccess = () => resolve(getReq.result);
      });

      if (blob) {
        registerBlob(key, blob);
      }
    }
  }

  /**
   * Limpa o armazenamento temporário do disco (IndexedDB)
   */
  async function clearDisk() {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    store.clear();

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  return {
    addAssetFile,
    deleteAssetIfUnused,
    getAssetSrc,
    registerBlob,
    getAssetBlob,
    clearRegistry,
    persistToDisk,
    restoreFromDisk,
    clearDisk
  };
}