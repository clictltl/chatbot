<script setup lang="ts">
import { ref } from 'vue';
import type { Variable } from '@/types/chatbot';

const props = defineProps<{
  variables: Record<string, Variable>;
}>();

const emit = defineEmits<{
  'update:variables': [variables: Record<string, Variable>];
  'add-variable': [name: string, type: 'string' | 'number'];
  'remove-variable': [name: string];
}>();

const newVarName = ref('');
const newVarType = ref<'string' | 'number'>('string');

function addVariable() {
  const name = newVarName.value.trim();
  if (!name) {
    alert('Digite um nome para a variável');
    return;
  }
  if (props.variables[name]) {
    alert('Já existe uma variável com este nome');
    return;
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    alert('Nome inválido. Use apenas letras, números e underscore. Não pode começar com número.');
    return;
  }

  emit('add-variable', name, newVarType.value);
  newVarName.value = '';
}

function removeVariable(name: string) {
  if (confirm(`Deseja remover a variável "${name}"?`)) {
    emit('remove-variable', name);
  }
}

function updateVariable(name: string, value: string | number) {
  const updated = { ...props.variables };
  const variable = updated[name];

  if (variable.type === 'number') {
    updated[name] = { ...variable, value: Number(value) };
  } else {
    updated[name] = { ...variable, value };
  }

  emit('update:variables', updated);
}
</script>

<template>
  <div class="variables-panel">
    <div class="add-variable-form">
      <h3>Nova Variável</h3>
      <div class="form-row">
        <input
          v-model="newVarName"
          type="text"
          placeholder="nome_da_variavel"
          @keyup.enter="addVariable"
        />
        <select v-model="newVarType">
          <option value="string">Texto</option>
          <option value="number">Número</option>
        </select>
        <button @click="addVariable" class="btn-add">+</button>
      </div>
    </div>

    <div class="variables-list">
      <h3>Variáveis Criadas</h3>
      <div v-if="Object.keys(variables).length === 0" class="empty-state">
        <p>Nenhuma variável criada ainda</p>
      </div>
      <div v-else class="variables-grid">
        <div v-for="(variable, name) in variables" :key="name" class="variable-item">
          <div class="variable-header">
            <span class="variable-name">{{ name }}</span>
            <span class="variable-type">{{ variable.type === 'string' ? 'Texto' : 'Número' }}</span>
            <button @click="removeVariable(name)" class="btn-remove-small" title="Remover variável">×</button>
          </div>
          <input
            :type="variable.type === 'number' ? 'number' : 'text'"
            :value="variable.value ?? ''"
            @input="updateVariable(name, ($event.target as HTMLInputElement).value)"
            placeholder="Valor atual"
            class="variable-value"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.variables-panel {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.add-variable-form {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 16px;
}

.form-row {
  display: flex;
  gap: 8px;
}

.form-row input {
  flex: 2;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
}

.form-row select {
  flex: 1;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
}

.form-row input:focus,
.form-row select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-add {
  width: 36px;
  height: 36px;
  padding: 0;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 20px;
  font-weight: bold;
  transition: background 0.2s;
}

.btn-add:hover {
  background: #059669;
}

.variables-list {
  flex: 1;
}

.empty-state {
  text-align: center;
  color: #6b7280;
  padding: 24px;
}

.variables-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.variable-item {
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.variable-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.variable-name {
  flex: 1;
  font-weight: 600;
  font-size: 13px;
  color: #374151;
  font-family: 'Courier New', monospace;
}

.variable-type {
  padding: 2px 8px;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.btn-remove-small {
  width: 20px;
  height: 20px;
  padding: 0;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.btn-remove-small:hover {
  background: #dc2626;
}

.variable-value {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
}

.variable-value:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
</style>
