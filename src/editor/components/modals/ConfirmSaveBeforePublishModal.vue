<template>
  <div class="confirm-modal">
    <div class="overlay" @click="$emit('close')"></div>

    <div class="content">
      <h3>Salvar antes de publicar?</h3>

      <p class="message">
        A publicação sempre utiliza o último estado salvo do projeto.
      </p>

      <div class="actions">
        <button class="primary" @click="$emit('confirm')">
          Salvar e publicar
        </button>
        <button class="secondary" @click="$emit('close')">
          Cancelar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'confirm'): void
  (e: 'close'): void
}>();
</script>

<style scoped>
.confirm-modal {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
}

.content {
  position: relative;
  background: white;
  padding: 2rem;
  border-radius: 12px;
  width: 420px;
  text-align: center;
  z-index: 10001;
}

.message {
  margin: 1rem 0 1.5rem;
  font-size: 14px;
  opacity: 0.85;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.primary {
  background: #2c7be5;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
}

.secondary {
  background: #eee;
  padding: 8px 16px;
  border-radius: 6px;
}
</style>
