import { ref } from 'vue';
import { getProjectData, setProjectData, assets } from './projectData';
import { useAssetStore } from './useAssetStore';
import type { ProjectData } from '@/shared/types/project';

/**
 * ---------------------------------------------------
 * CONFIGURAÇÃO E SINGLETON
 * ---------------------------------------------------
 */

// Estado
const currentProjectId = ref<number | null>(null);
const currentProjectName = ref<string>('');
const loading = ref(false);
const error = ref<string | null>(null);
const projectsList = ref<any[]>([]);

// Rotas da API
// 1. Rota do Plugin (para salvar/carregar projetos)
const pluginRestRoot = window.CLIC_CHATBOT?.rest_root ?? '/wp-json/clic-chatbot/v1/';
// 2. Rota do Core WP (para upload de mídia nativo)
const wpRestRoot = window.CLIC_CHATBOT?.wp_rest_root ?? '/wp-json/';
const nonce = window.CLIC_AUTH?.nonce ?? '';

const assetStore = useAssetStore();

/**
 * ---------------------------------------------------
 * SEGURANÇA: UPLOAD COM DESDUPLICAÇÃO GLOBAL
 * ---------------------------------------------------
 * Verifica se a imagem já existe no servidor (pelo Hash).
 * Se existir, usa a URL dela. Se não, faz upload.
 * NÃO deleta imagens antigas para evitar quebrar outros projetos.
 */
async function uploadPendingAssets() {
  const localAssets = Object.values(assets.value).filter(a => a.source === 'local');

  if (localAssets.length === 0) return;

  // Processa uploads em paralelo para maior velocidade
  const uploadPromises = localAssets.map(async (asset) => {
    try {
      // Recupera o Blob da memória
      const blob = await assetStore.getAssetBlob(asset.id);
      if (!blob) throw new Error(`Arquivo não encontrado na memória: ${asset.originalName}`);

      // DESDUPLICAÇÃO GLOBAL
      let existingMedia = null;
      if (asset.hash) {
        // Busca na API de mídia por imagens que tenham o hash na descrição
        const searchRes = await fetch(`${wpRestRoot}wp/v2/media?search=${asset.hash}`, {
            method: 'GET',
            headers: { 'X-WP-Nonce': nonce }
        });
        
        if (searchRes.ok) {
            const searchResults = await searchRes.json();
            // Confirmação exata (pois a busca do WP é aproximada)
            existingMedia = searchResults.find((m: any) => 
                m.description?.rendered?.includes(asset.hash)
            );
        }
      }

      let wpMedia;

      if (existingMedia) {
        // REUTILIZAÇÃO: O arquivo já existe no servidor
        wpMedia = existingMedia;
      } else {
        // UPLOAD NOVO
        // Prepara o Payload no padrão do WordPress
        const formData = new FormData();
        formData.append('file', blob, asset.originalName);
        // Opcional: Adicionar legenda ou texto alternativo
        // formData.append('alt_text', 'Imagem do Chatbot CLIC');
        
        // Salvamos o Hash na descrição para permitir a desduplicação futura
        formData.append('description', asset.hash); 
        formData.append('caption', 'Chatbot Asset'); 

        // Envia para API Nativa (/wp/v2/media)
        // O WordPress gerencia segurança, autor, pasta e thumbnails aqui.
        const res = await fetch(`${wpRestRoot}wp/v2/media`, {
          method: 'POST',
          headers: { 'X-WP-Nonce': nonce },
          body: formData
        });

        if (!res.ok) throw new Error(res.statusText);
        wpMedia = await res.json();
      }

      // Atualiza o Asset para Remote (Persistência)
      // Agora o JSON do projeto apontará para a URL pública do WP
      if (assets.value[asset.id]) {
        assets.value[asset.id].source = 'remote';
        assets.value[asset.id].url = wpMedia.source_url;
        assets.value[asset.id].externalId = wpMedia.id;
      }

    } catch (err: any) {
      console.error(`Falha no upload de ${asset.originalName}:`, err);
      throw new Error(`Erro ao salvar imagem ${asset.originalName}: ${err.message}`);
    }
  });

  // Aguarda todos os uploads terminarem. Se um falhar, o Promise.all rejeita e cancela o salvamento.
  await Promise.all(uploadPromises);
}

/**
 * ---------------------------------------------------
 * LISTAR PROJETOS
 * ---------------------------------------------------
 */
async function listProjects() {
  loading.value = true;
  error.value = null;

  try {
    const res = await fetch(pluginRestRoot + 'list', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'X-WP-Nonce': nonce
      }
    });

    const data = await res.json();

    if (!data.success) {
      error.value = data.error || 'UNKNOWN_ERROR';
      return [];
    }

    projectsList.value = data.projects || [];
    return data.projects;

  } catch (err: any) {
    error.value = err.message;
    return [];
  } finally {
    loading.value = false;
  }
}

/**
 * ---------------------------------------------------
 * SALVAR (update OU create)
 * ---------------------------------------------------
 */
async function saveProject(name?: string) {
  loading.value = true;
  error.value = null;

  try {
    // 1. Garante que todos os assets locais subam para o servidor
    if (Object.keys(assets.value).length > 0) {
      await uploadPendingAssets();
    }

    // 2. Prepara o JSON (agora contendo apenas URLs remotas)
    const body = {
      id: currentProjectId.value,
      name: name ?? currentProjectName.value,
      data: getProjectData() as ProjectData,
    };

    // 3. Salva o projeto
    const res = await fetch(pluginRestRoot + 'save', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!data.success) {
      error.value = data.error || 'UNKNOWN_ERROR';
      return null;
    }

    currentProjectId.value = data.id;
    currentProjectName.value = data.name;

    return data;

  } catch (err: any) {
    error.value = err.message;
    return null;
  } finally {
    loading.value = false;
  }
}

/**
 * ---------------------------------------------------
 * SALVAR COMO (novo)
 * ---------------------------------------------------
 */
async function saveProjectAs(newName: string) {
  const previousId = currentProjectId.value;

  currentProjectId.value = null;
  currentProjectName.value = newName;

  const result = await saveProject(newName);

  if (!result) {
    currentProjectId.value = previousId;
  }

  return result;
}

/**
 * ---------------------------------------------------
 * CARREGAR
 * ---------------------------------------------------
 */
async function loadProject(id: number) {
  loading.value = true;
  error.value = null;

  try {
    const res = await fetch(pluginRestRoot + 'load/' + id, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'X-WP-Nonce': nonce
      }
    });

    const data = await res.json();

    if (!data.success) {
      error.value = data.error || 'UNKNOWN_ERROR';
      return null;
    }

    // Limpa o registro de memória antigo (Blobs) antes de carregar
    assetStore.clearRegistry();

    setProjectData(data.project.data);

    currentProjectId.value = data.project.id;
    currentProjectName.value = data.project.name;

    return data.project;

  } catch (err: any) {
    error.value = err.message;
    return null;
  } finally {
    loading.value = false;
  }
}

/**
 * ---------------------------------------------------
 * EXCLUIR
 * ---------------------------------------------------
 */
async function deleteProject(id: number) {
  loading.value = true;
  error.value = null;

  try {
    const res = await fetch(pluginRestRoot + 'delete/' + id, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'X-WP-Nonce': nonce
      }
    });

    const data = await res.json();

    if (!data.success) {
      error.value = data.error || 'UNKNOWN_ERROR';
      return false;
    }

    if (currentProjectId.value === id) {
      currentProjectId.value = null;
      currentProjectName.value = '';
    }

    return true;

  } catch (err: any) {
    error.value = err.message;
    return false;
  } finally {
    loading.value = false;
  }
}

/**
 * ---------------------------------------------------
 * COMPARTILHAR
 * ---------------------------------------------------
 */
async function shareProject() {
  error.value = null;

  // não faz sentido compartilhar sem projeto salvo
  if (!currentProjectId.value) {
    error.value = "PROJECT_NOT_SAVED";
    return null;
  }

  const body = {
    project_id: currentProjectId.value
  };

  try {
    const res = await fetch(pluginRestRoot + 'share', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!data.success) {
      error.value = data.error || "UNKNOWN_ERROR";
      return null;
    }

    // link final
    const shareUrl =
      data.share_url ??
      `${window.CLIC_CHATBOT?.app_url ?? "/"}?share=${data.token}`;
    return shareUrl;

  } catch (err: any) {
    error.value = err.message;
    return null;
  }
}

/**
 * ---------------------------------------------------
 * PUBLICAR
 * ---------------------------------------------------
 */
async function publishProject() {
  error.value = null;

  // não faz sentido publicar sem projeto salvo
  if (!currentProjectId.value) {
    error.value = 'PROJECT_NOT_SAVED';
    return null;
  }

  const body = {
    project_id: currentProjectId.value
  };

  try {
    const res = await fetch(pluginRestRoot + 'publish', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!data.success) {
      error.value = data.error || 'UNKNOWN_ERROR';
      return null;
    }

    return {
      token: data.token,
      publish_url: data.publish_url,
      published_at: data.published_at,
      existing: data.existing
    };

  } catch (err: any) {
    error.value = err.message;
    return null;
  }
}

/**
 * ---------------------------------------------------
 * EXPORTAR SINGLETON
 * ---------------------------------------------------
 */
const projectsStore = {
  currentProjectId,
  currentProjectName,
  loading,
  error,
  projectsList,

  listProjects,
  saveProject,
  saveProjectAs,
  loadProject,
  deleteProject,
  shareProject,
  publishProject,
};

export function useProjects() {
  return projectsStore;
}
