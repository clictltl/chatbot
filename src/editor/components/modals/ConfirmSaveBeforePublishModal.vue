<template>
  <div class="modal-backdrop">
    <div class="modal-overlay" @click="$emit('close')"></div>

    <div class="modal-card">
      <div class="modal-header">
        <div class="icon-container">
          <span class="icon">💾</span>
        </div>
        
        <h3>Salvar e Publicar?</h3>

        <p>
          Para que a publicação reflita suas alterações mais recentes, 
          é necessário salvar o projeto agora.
        </p>
      </div>

      <div class="modal-actions">
        <button class="btn-cancel" @click="$emit('close')">
          Cancelar
        </button>
        <button class="btn-confirm" @click="$emit('confirm')">
          Salvar e Publicar
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
/* --- Estrutura Modal Padrão --- */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 10000;
  display: flex; align-items: center; justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.modal-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(2px);
}

.modal-card {
  position: relative; background: white;
  width: 100%; max-width: 400px;
  padding: 1.5rem; border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
  animation: slideUp 0.3s ease-out;
  text-align: center;
}

/* --- Icon & Header --- */
.icon-container {
  background: #eff6ff; /* Azul bem claro */
  width: 48px; height: 48px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1rem auto;
}

.icon { font-size: 24px; }

.modal-header h3 { margin: 0 0 0.5rem 0; color: #111827; font-size: 1.25rem; }
.modal-header p { margin: 0 0 1rem 0; color: #6b7280; font-size: 0.95rem; line-height: 1.5; }

/* --- Actions --- */
.modal-actions {
  display: flex; justify-content: center; gap: 12px;
  margin-top: 1.5rem;
}

.btn-cancel {
  background: white; border: 1px solid #d1d5db; color: #374151;
  padding: 0.6rem 1.2rem; border-radius: 6px; cursor: pointer;
  font-weight: 500; transition: background 0.2s;
}
.btn-cancel:hover { background: #f9fafb; }

.btn-confirm {
  background: #2563eb; border: none; color: white;
  padding: 0.6rem 1.2rem; border-radius: 6px; cursor: pointer;
  font-weight: 500; transition: background 0.2s;
}
.btn-confirm:hover { background: #1d4ed8; }

@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>