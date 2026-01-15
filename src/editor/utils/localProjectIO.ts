import { getProjectData, setProjectData } from './projectData';
import type { ProjectData } from '@/shared/types/project';

/**
 * ---------------------------------------------------
 * EXPORTAR PROJETO PARA O COMPUTADOR
 * ---------------------------------------------------
 * Serializa o estado atual do editor e dispara download.
 * Não altera estado do editor nem do projeto.
 */
export function exportToComputer(filename = 'chatbot.json') {
  const data = getProjectData();

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * ---------------------------------------------------
 * IMPORTAR PROJETO DO COMPUTADOR
 * ---------------------------------------------------
 * Lê um arquivo JSON e aplica o snapshot no editor.
 * NÃO decide nada sobre ciclo de vida de projeto.
 */
export function importFromComputer(
  onSuccess?: () => void,
  onError?: (error: any) => void
) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';

  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as ProjectData;
        setProjectData(data);
        onSuccess?.();
      } catch (err) {
        console.error('Erro ao importar JSON:', err);
        onError?.(err);
      }
    };

    reader.readAsText(file);
  };

  input.click();
}
