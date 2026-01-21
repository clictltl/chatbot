import type { Block, Connection, Variable } from './chatbot';

export interface ProjectAsset {
  id: string;
  type: string;
  originalName: string;
  size: number;
  hash: string;
  source: 'local' | 'remote';
  url?: string;
}

export interface ProjectData {
  blocks: Block[];
  connections: Connection[];
  variables: Record<string, Variable>;
  assets: Record<string, ProjectAsset>;
}