<template>
  <div class="modal-backdrop">
    <div class="modal-overlay" @click="$emit('cancel')"></div>
    
    <div class="modal-card">
      <div class="modal-header">
        <div class="icon-container">
          <span class="icon">💾</span>
        </div>
        <h3>Deseja salvar as alterações?</h3>
        <p>Se você descartar, todas as alterações recentes serão perdidas permanentemente.</p>
      </div>

      <div class="modal-actions">
        <!-- A ordem dos botões importa para a UX -->
        <button class="btn-cancel" @click="$emit('cancel')">Cancelar</button>
        <button class="btn-danger" @click="$emit('discard')">Descartar</button>
        <button class="btn-primary" @click="$emit('save')">Salvar</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits(['cancel', 'discard', 'save']);
</script>

<style scoped>
/* Reutilizando seus estilos padronizados */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 11000; /* Acima de tudo */
  display: flex; align-items: center; justify-content: center;
  font-family: -apple-system, sans-serif;
}
.modal-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
}
.modal-card {
  position: relative; background: white; width: 100%; max-width: 420px;
  padding: 1.5rem; border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
  animation: slideUp 0.3s ease-out; text-align: center;
}

.icon-container {
  background: #f3f4f6; width: 56px; height: 56px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;
}
.icon { font-size: 28px; }

.modal-header h3 { margin: 0 0 0.5rem; color: #111827; font-size: 1.25rem; }
.modal-header p { margin: 0; color: #6b7280; font-size: 0.95rem; line-height: 1.5; }

.modal-actions {
  display: flex; justify-content: center; gap: 12px; margin-top: 2rem;
}

.btn-cancel {
  background: white; border: 1px solid #d1d5db; color: #374151;
  padding: 0.6rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 500;
}
.btn-cancel:hover { background: #f9fafb; }

.btn-danger {
  background: #fef2f2; border: 1px solid #fecaca; color: #dc2626;
  padding: 0.6rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 500;
}
.btn-danger:hover { background: #fee2e2; }

.btn-primary {
  background: #2563eb; border: none; color: white;
  padding: 0.6rem 2rem; border-radius: 6px; cursor: pointer; font-weight: 500;
}
.btn-primary:hover { background: #1d4ed8; }

@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>