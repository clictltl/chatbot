<template>
  <div class="share-modal">
    <div class="overlay" @click="$emit('close')"></div>

    <div class="content">
      <h3>Compartilhar projeto</h3>

      <div v-if="error">
        <p class="error">Erro: {{ error }}</p>
      </div>

      <div v-else-if="!shareUrl">
        <p>Gerando link de compartilhamento...</p>
      </div>

      <div v-else>
        <p>Qualquer pessoa com este link poderá visualizar seu projeto:</p>

        <input
          readonly
          class="link-box"
          :value="shareUrl"
          @click="copyToClipboard"
        />

        <button @click="copyToClipboard">Copiar link</button>
      </div>

      <button class="close-btn" @click="$emit('close')">Fechar</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, toRefs, onMounted } from 'vue';
import { useProjects } from '../utils/useProjects';

const projects = useProjects();
const { error } = toRefs(projects);
const shareUrl = ref<string | null>(null);

onMounted(async () => {
  const url = await projects.shareProject();
  shareUrl.value = url;
});

function copyToClipboard() {
  if (!shareUrl.value) return;
  navigator.clipboard.writeText(shareUrl.value);
  alert("Link copiado!");
}
</script>

<style scoped>
.share-modal {
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
