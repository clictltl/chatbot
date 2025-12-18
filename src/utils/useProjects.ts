import { ref } from 'vue';
import { getProjectData, setProjectData } from './projectData';
import type { ProjectData } from './projectData';

/**
 * ---------------------------------------------------
 * SINGLETON STORE — criado uma única vez
 * ---------------------------------------------------
 */

// Estado
const currentProjectId = ref<number | null>(null);
const currentProjectName = ref<string>('');
const loading = ref(false);
const error = ref<string | null>(null);
const projectsList = ref<any[]>([]);

// REST roots e nonce
const restRoot = window.CLIC_CHATBOT?.rest_root ?? '/wp-json/clic-chatbot/v1/';
const nonce = window.CLIC_AUTH?.nonce ?? '';

/**
 * ---------------------------------------------------
 * LISTAR PROJETOS
 * ---------------------------------------------------
 */
async function listProjects() {
  loading.value = true;
  error.value = null;

  try {
    const res = await fetch(restRoot + 'list', {
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

  const body = {
    id: currentProjectId.value,
    name: name ?? currentProjectName.value,
    data: getProjectData() as ProjectData,
  };

  try {
    const res = await fetch(restRoot + 'save', {
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
    const res = await fetch(restRoot + 'load/' + id, {
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
    const res = await fetch(restRoot + 'delete/' + id, {
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
};

export function useProjects() {
  return projectsStore;
}
