import type { Block, Connection, Variable } from './chatbot';

export interface ProjectData {
  blocks: Block[];
  connections: Connection[];
  variables: Record<string, Variable>;
}