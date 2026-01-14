import type { Block, Variable } from '@/types/chatbot';
import { useChatRuntime } from '../useChatRuntime';

export function createRuntime(
  blocks: Block[],
  variables: Record<string, Variable> = {}
) {
  return useChatRuntime({ blocks, variables });
}
