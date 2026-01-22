import { reactive } from 'vue';
import { assets, blocks } from './projectData'; // Acesso direto ao estado reativo
import type { ProjectAsset } from '@/shared/types/project';
import imageCompression from 'browser-image-compression';
import { fileTypeFromBlob } from 'file-type';

// --- CONFIGURAÇÃO ---
const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Mime types permitidos (usados para validar o retorno do file-type)
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 
  'image/png', 
  'image/gif', 
  'image/webp'
];

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
  // O file-type lê o binário real do arquivo para determinar o tipo
  // Ele ignora a extensão (.jpg) e o mime type reportado pelo navegador
  const fileType = await fileTypeFromBlob(file);

  // Se não conseguiu identificar ou não é um dos permitidos
  if (!fileType || !ALLOWED_MIME_TYPES.includes(fileType.mime)) {
    // Caso especial: às vezes o browser cria blobs sem assinatura clara (raro em imagens normais)
    // mas se o file-type falhou, é sinal de perigo ou arquivo corrompido.
    throw new Error(
      `Formato de arquivo inválido ou corrompido. Detectado: ${fileType?.mime || 'Desconhecido'}.`
    );
  }
}

// --- UTILS ---
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
   * 1. Valida Binário (file-type)
   * 2. Comprime (browser-image-compression)
   * 3. Calcula Hash
   * 4. Salva
   */
  async function addAssetFile(file: File): Promise<string> {
    
    // 1. SEGURANÇA: Validação profunda do binário
    await validateFileSecurity(file);

    let finalFile = file;

    // 2. OTIMIZAÇÃO: Compressão Inteligente
    if (file.size > MAX_FILE_SIZE_BYTES) {
      if (file.type === 'image/gif') {
        throw new Error(`GIF muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Limite: ${MAX_FILE_SIZE_MB}MB.`);
      }

      try {
        console.log(`Comprimindo imagem de ${(file.size/1024/1024).toFixed(2)}MB...`);
        
        const options = {
          maxSizeMB: MAX_FILE_SIZE_MB,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/webp',
          initialQuality: 0.8
        };

        const compressedBlob = await imageCompression(file, options);
        
        if (compressedBlob.size < MAX_FILE_SIZE_BYTES) {
          finalFile = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
            type: 'image/webp',
            lastModified: Date.now()
          });
          console.log(`Sucesso: ${(finalFile.size/1024/1024).toFixed(2)}MB`);
        } else {
          throw new Error(`A imagem continua muito grande (${(compressedBlob.size/1024/1024).toFixed(1)}MB) mesmo após compressão.`);
        }

      } catch (error: any) {
        console.error('Erro na compressão:', error);
        throw new Error(`Não foi possível processar esta imagem: ${error.message}`);
      }
    }

    // 3. Calcula Hash do arquivo FINAL (Original ou Comprimido)
    const fileHash = await computeFileHash(finalFile);

    // 4. Procura duplicata
    for (const existingId in assets.value) {
      const asset = assets.value[existingId];
      if (asset.hash === fileHash) {
        if (blobRegistry[existingId] || asset.source === 'remote') {
          return existingId;
        }
      }
    }

    // 5. Registra
    const assetId = crypto.randomUUID();
    const blobUrl = URL.createObjectURL(finalFile);
    blobRegistry[assetId] = blobUrl;

    const newAsset: ProjectAsset = {
      id: assetId,
      type: finalFile.type,
      originalName: finalFile.name,
      size: finalFile.size,
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

  /**
   * Transforma assets REMOTOS em LOCAIS (Blobs).
   * Usado ao carregar um projeto compartilhado (Share) para que o novo usuário
   * se torne dono dos arquivos ao salvar.
   */
  async function privatizeRemoteAssets() {
    const promises = Object.entries(assets.value).map(async ([id, asset]) => {
      // Só nos interessa o que for remoto
      if (asset.source !== 'remote' || !asset.url) return;

      try {
        // 1. Baixa a imagem do servidor original
        const res = await fetch(asset.url);
        if (!res.ok) throw new Error(`Falha ao baixar: ${res.statusText}`);
        
        const blob = await res.blob();

        // 2. Registra na memória local (cria Blob URL)
        registerBlob(id, blob);

        // 3. Atualiza o objeto do asset para parecer um upload novo
        asset.source = 'local';
        delete asset.url;        // Remove o link para o servidor do outro usuário
        delete asset.externalId; // Remove o ID do banco do outro usuário
        
        // Nota: Mantemos o hash original. Isso ajuda na desduplicação
        // se este usuário já tiver essa mesma imagem na conta dele!

      } catch (err) {
        console.error(`Erro ao privatizar asset ${asset.originalName}:`, err);
        // Em caso de erro, mantemos como remote para não quebrar a visualização imediata,
        // mas o risco de link quebrado futuro permanece para essa imagem específica.
      }
    });

    await Promise.all(promises);
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
    clearDisk,
    privatizeRemoteAssets
  };
}