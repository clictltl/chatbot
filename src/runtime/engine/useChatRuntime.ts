import { ref } from 'vue';
import type { Block, Variable, ChatMessage } from '@/shared/types/chatbot';
import { interpolateText, evaluateCondition } from '@/shared/utils/interpolation';

type UseChatRuntimeOptions = {
  blocks: Block[];
  variables: Record<string, Variable>;
  onVariablesChange?: (vars: Record<string, Variable>) => void;
};

export function useChatRuntime(options: UseChatRuntimeOptions) {
  const { blocks, variables, onVariablesChange } = options;

  // ===== Estado (espelha PreviewPanel) =====
  const messages = ref<ChatMessage[]>([]);
  const currentBlockId = ref<string | null>(null);
  const isWaitingForInput = ref(false);
  const currentChoices = ref<
    { id: string; label: string; nextBlockId?: string }[]
  >([]);
  const isRunning = ref(false);
  const sessionVariables = ref<Record<string, Variable>>({});
  const runId = ref(0);

  // ===== Glue =====
  function syncVariables() {
    onVariablesChange?.({ ...sessionVariables.value });
  }

  // ===== add... (espelha PreviewPanel; sem scroll) =====
  function addBotMessage(content: string) {
    const interpolated = interpolateText(content, sessionVariables.value);
    messages.value.push({
      id: `msg_${Date.now()}`, // espelha PreviewPanel
      type: 'bot',
      content: interpolated,
    });
  }

  function addUserMessage(content: string) {
    messages.value.push({
      id: `msg_${Date.now()}`, // espelha PreviewPanel
      type: 'user',
      content,
    });
  }

  function addErrorMessage(content: string) {
    messages.value.push({
      id: `msg_${Date.now()}`, // espelha PreviewPanel
      type: 'bot',
      content: `${content}`, // prefixo alinhado
    });
  }

  function addImageMessage(url: string) {
    messages.value.push({
      id: `msg_${Date.now()}`, // espelha PreviewPanel
      type: 'image',
      content: url,
    });
  }

  // ===== Finalização natural (espelha PreviewPanel) =====
  function endChat() {
    isWaitingForInput.value = false;
    currentChoices.value = [];
    isRunning.value = false;
  }

  // ===== Cancelamento duro / reset total (espelha stopChat) =====
  function stopChat() {
    // invalida callbacks pendentes
    runId.value++;

    isWaitingForInput.value = false;
    currentChoices.value = [];
    currentBlockId.value = null;

    messages.value = [];
    // userInput é UI; engine não mantém

    isRunning.value = false;
  }

  // ===== Start (bloco start obrigatório, conforme decisão) =====
  function start() {
    messages.value = [];
    currentBlockId.value = null;
    isWaitingForInput.value = false;
    currentChoices.value = [];
    isRunning.value = true;

    runId.value++;

    // clona variáveis
    sessionVariables.value = {};
    Object.keys(variables).forEach(key => {
      sessionVariables.value[key] = { ...variables[key] };
    });
    syncVariables();

    const startBlock = blocks.find(b => b.id === 'start' || b.type === 'start');
    if (!startBlock) {
      addErrorMessage('NO_START_BLOCK');
      endChat();
      return;
    }

    currentBlockId.value = startBlock.id;
    processBlock(startBlock);
  }

  // ===== Envio de texto (espelha handleSendMessage) =====
  function submitText(rawText: string) {
    const text = rawText.trim();
    if (!text || !isWaitingForInput.value) return;

    addUserMessage(text);

    const currentBlock = blocks.find(b => b.id === currentBlockId.value);
    if (currentBlock && currentBlock.type === 'openQuestion' && currentBlock.variableName) {
      const variable = sessionVariables.value[currentBlock.variableName];
      if (variable) {
        if (variable.type === 'number') {
          sessionVariables.value[currentBlock.variableName] = {
            ...variable,
            value: Number(text) || 0,
          };
        } else {
          sessionVariables.value[currentBlock.variableName] = {
            ...variable,
            value: text,
          };
        }
        syncVariables();
      }
    }

    isWaitingForInput.value = false;

    if (currentBlock && currentBlock.nextBlockId) {
      const nextBlock = blocks.find(b => b.id === currentBlock.nextBlockId);
      if (nextBlock) {
        currentBlockId.value = currentBlock.nextBlockId;
        const myRun = runId.value;
        setTimeout(() => {
          if (!isRunning.value || runId.value !== myRun) return;
          processBlock(nextBlock);
        }, 300);
      } else {
        addErrorMessage('INVALID_NEXT_BLOCK');
        endChat();
      }
    } else {
      endChat();
    }
  }

  // ===== Escolha (espelha handleChoiceClick) =====
  function selectChoice(choice: { id: string; label: string; nextBlockId?: string }) {
    addUserMessage(choice.label);
    currentChoices.value = [];

    if (choice.nextBlockId) {
      const nextBlock = blocks.find(b => b.id === choice.nextBlockId);
      if (nextBlock) {
        currentBlockId.value = choice.nextBlockId;
        const myRun = runId.value;
        setTimeout(() => {
          if (!isRunning.value || runId.value !== myRun) return;
          processBlock(nextBlock);
        }, 300);
      } else {
        addErrorMessage('INVALID_NEXT_BLOCK');
        endChat();
      }
    } else {
      addErrorMessage('NO_CHOICE_TARGET');
      endChat();
    }
  }

  // ===== Motor principal (estrutura mantida) =====
  function processBlock(block: Block) {
    if (!block) {
      addErrorMessage('BLOCK_NOT_FOUND');
      endChat();
      return;
    }

    const myRun = runId.value;

    switch (block.type) {
      case 'start':
        setTimeout(() => {
          if (!isRunning.value || runId.value !== myRun) return;
          
          if (!block.nextBlockId) {
            addErrorMessage('START_NO_NEXT');
            endChat();
            return;
          }

          const nextBlock = blocks.find(b => b.id === block.nextBlockId);
          if (!nextBlock) {
            addErrorMessage('INVALID_NEXT_BLOCK');
            endChat();
            return;
          }

          currentBlockId.value = block.nextBlockId;
          processBlock(nextBlock);
        }, 0);
        break;

      case 'message':
        addBotMessage(block.content);
        setTimeout(() => {
          if (!isRunning.value || runId.value !== myRun) return;
          goToNext(block);
        }, 500);
        break;

      case 'openQuestion':
        addBotMessage(block.content);
        isWaitingForInput.value = true;
        currentChoices.value = [];
        break;

      case 'choiceQuestion':
        addBotMessage(block.content);
        if (block.choices?.length) {
          currentChoices.value = block.choices;
          isWaitingForInput.value = false;
        } else {
          addErrorMessage('NO_CHOICES');
          endChat();
        }
        break;

      case 'condition': {
        let nextBlockId: string | undefined;
        for (const condition of block.conditions ?? []) {
          if (
            evaluateCondition(
              condition.variableName,
              condition.operator,
              condition.value,
              sessionVariables.value
            )
          ) {
            nextBlockId = condition.nextBlockId;
            break;
          }
        }
        if (!nextBlockId) {
          addErrorMessage('NO_CONDITION_MATCH');
          endChat();
          return;
        }
        const next = blocks.find(b => b.id === nextBlockId);
        if (!next) {
          addErrorMessage('INVALID_NEXT_BLOCK');
          endChat();
          return;
        }
        currentBlockId.value = next.id;
        processBlock(next);
        break;
      }

      case 'setVariable': {
        if (block.variableName && sessionVariables.value[block.variableName]) {
          const value = interpolateText(block.variableValue || '', sessionVariables.value);
          sessionVariables.value[block.variableName].value = value;
          syncVariables();
        }
        setTimeout(() => {
          if (!isRunning.value || runId.value !== myRun) return;
          goToNext(block);
        }, 300);
        break;
      }

      case 'math': {
        if (block.variableName && sessionVariables.value[block.variableName]) {
          const variable = sessionVariables.value[block.variableName];
          const current = Number(variable.value) || 0;
          const operand = Number(
            interpolateText(block.mathValue || '0', sessionVariables.value)
          ) || 0;

          let result = current;
          switch (block.mathOperation) {
            case '+': result = current + operand; break;
            case '-': result = current - operand; break;
            case '*': result = current * operand; break;
            case '/': result = operand !== 0 ? current / operand : current; break;
          }

          variable.value = result;
          syncVariables();
        }
        setTimeout(() => {
          if (!isRunning.value || runId.value !== myRun) return;
          goToNext(block);
        }, 300);
        break;
      }

      case 'image': {
        const url = block.imageData || block.imageUrl;
        if (url) addImageMessage(url);
        else addErrorMessage('IMAGE_NOT_DEFINED');
        setTimeout(() => {
          if (!isRunning.value || runId.value !== myRun) return;
          goToNext(block);
        }, 500);
        break;
      }

      case 'end':
        if (block.content) addBotMessage(block.content);
        endChat();
        break;

      default:
        addErrorMessage('UNSUPPORTED_BLOCK_TYPE');
        endChat();
        break;
    }
  }

  function goToNext(block: Block) {
    if (!block.nextBlockId) {
      endChat();
      return;
    }
    const next = blocks.find(b => b.id === block.nextBlockId);
    if (!next) {
      addErrorMessage('INVALID_NEXT_BLOCK');
      endChat();
      return;
    }
    currentBlockId.value = next.id;
    processBlock(next);
  }

  return {
    // estado
    messages,
    isWaitingForInput,
    currentChoices,
    isRunning,

    // ações
    start,
    stopChat,
    submitText,
    selectChoice,
  };
}
