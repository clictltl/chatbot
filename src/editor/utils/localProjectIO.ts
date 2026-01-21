import JSZip from 'jszip';
import { getProjectData, setProjectData } from './projectData';
import { useAssetStore } from './useAssetStore';
import type { ProjectData } from '@/shared/types/project';

const assetStore = useAssetStore();

/**
 * EXPORTAR: Cria arquivo .clic (ZIP)
 */
export async function exportToComputer(filename = 'meu-chatbot') {
  const project = getProjectData();
  const zip = new JSZip();

  // 1. JSON Principal
  zip.file('project.json', JSON.stringify(project, null, 2));

  // 2. Pasta de Assets
  const assetsFolder = zip.folder('assets');
  
  if (project.assets && assetsFolder) {
    for (const [id, asset] of Object.entries(project.assets)) {
      // Salva apenas se for 'local'. Se for remote, já está na web.
      if (asset.source === 'local') {
        const blob = await assetStore.getAssetBlob(id);
        if (blob) {
          // Detecta extensão pelo mime type
          const ext = asset.type.split('/')[1] || 'bin';
          assetsFolder.file(`${id}.${ext}`, blob);
        }
      }
    }
  }

  // 3. Gerar e Baixar
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.clic`; // Extensão personalizada
  a.click();
  
  URL.revokeObjectURL(url);
}

/**
 * IMPORTAR: Lê arquivo .clic (ZIP) ou .json (Legacy)
 */
export function importFromComputer(
  onSuccess?: () => void,
  onError?: (error: any) => void
) {
  const input = document.createElement('input');
  input.type = 'file';
  // Aceita .clic, .zip ou .json (retrocompatibilidade)
  input.accept = '.clic,.zip,.json,application/json,application/zip';

  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      // Se for JSON antigo (retrocompatibilidade)
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        const text = await file.text();
        const data = JSON.parse(text) as ProjectData;
        assetStore.clearRegistry(); // Limpa anterior
        setProjectData(data);
        onSuccess?.();
        return;
      }

      // Se for ZIP/.CLIC
      const zip = await JSZip.loadAsync(file);
      
      // 1. Ler JSON
      const jsonFile = zip.file('project.json');
      if (!jsonFile) throw new Error('Arquivo project.json inválido no pacote.');
      
      const jsonStr = await jsonFile.async('string');
      const data = JSON.parse(jsonStr) as ProjectData;

      // 2. Preparar Memória
      assetStore.clearRegistry();

      // 3. Extrair Assets para Memória (Blobs)
      const assetsFolder = zip.folder('assets');
      if (assetsFolder && data.assets) {
        for (const [id, asset] of Object.entries(data.assets)) {
          if (asset.source === 'local') {
            const ext = asset.type.split('/')[1] || 'bin';
            const fileInZip = assetsFolder.file(`${id}.${ext}`);
            
            if (fileInZip) {
              const blob = await fileInZip.async('blob');
              assetStore.registerBlob(id, blob);
            }
          }
        }
      }

      // 4. Aplicar Projeto
      setProjectData(data);
      onSuccess?.();

    } catch (err) {
      console.error('Erro na importação:', err);
      onError?.(err);
    }
  };

  input.click();
}
