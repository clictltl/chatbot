<template>
  <div class="publish-modal">
    <div class="overlay" @click="$emit('close')"></div>

    <div class="content">
      <h3>Publicar projeto</h3>

      <div v-if="error">
        <p class="error">Erro: {{ error }}</p>
      </div>

      <div v-else-if="!result">
        <p>Publicando projeto...</p>
      </div>

      <div v-else>
        <p v-if="!result.existing">
          Projeto publicado com sucesso.
        </p>
        <p v-else>
          Projeto republicado. O link permanece o mesmo.
        </p>

        <p class="date">
          Publicado em: {{ formatDate(result.published_at) }}
        </p>

        <input
          readonly
          class="link-box"
          :value="result.publish_url"
          @click="copyToClipboard"
        />

        <button @click="copyToClipboard">
          Copiar link
        </button>
      </div>

      <button class="close-btn" @click="$emit('close')">
        Fechar
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, toRefs, onMounted } from 'vue';
import { useProjects } from '@/utils/useProjects';

const projects = useProjects();
const { error } = toRefs(projects);

type PublishResult = {
  token: string;
  publish_url: string;
  published_at: string;
  existing: boolean;
};

const result = ref<PublishResult | null>(null);

onMounted(async () => {
  const res = await projects.publishProject();
  if (res) {
    result.value = res;
  }
});

function copyToClipboard() {
  if (!result.value) return;
  navigator.clipboard.writeText(result.value.publish_url);
  alert('Link copiado!');
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString('pt-BR');
  } catch {
    return dateStr;
  }
}
</script>

<style scoped>
.publish-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.overlay {
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.4);
}

.content {
  position: relative;
  background: white;
  padding: 2rem;
  border-radius: 12px;
  z-index: 10001;
  width: 400px;
  text-align: center;
}

.link-box {
  width: 100%;
  padding: 8px;
  margin: 1rem 0;
}

.close-btn {
  margin-top: 1rem;
}

.error {
  color: red;
  margin-bottom: 12px;
}
</style>
