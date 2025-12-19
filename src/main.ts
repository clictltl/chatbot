import { createApp } from 'vue';
import App from './App.vue';
import { checkLogin } from './auth';
import { useProjects } from './utils/useProjects';
import { setProjectData } from './utils/projectData';

async function init() {

  // 1. Detectar link compartilhado
  const params = new URLSearchParams(window.location.search);
  const shareToken = params.get("share");

  if (shareToken) {
    try {
      const restRoot = window.CLIC_CHATBOT?.rest_root ?? '/wp-json/clic-chatbot/v1/';

      const res = await fetch(restRoot + 'share/' + shareToken);
      const data = await res.json();

      if (data.success) {
        // aplica o projeto compartilhado
        setProjectData(data.project.data);

        // reseta o estado do "useProjects"
        const projects = useProjects();
        projects.currentProjectId.value = null;
        projects.currentProjectName.value = "";
      }
    } catch (e) {
      console.error("Erro ao carregar projeto compartilhado:", e);
    }
  }

  // 2. Verifica login normalmente
  await checkLogin();

  // 3. Monta app somente depois
  createApp(App).mount('#app');
}

init();
