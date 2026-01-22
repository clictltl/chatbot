import JSZip from 'jszip';
import { getProjectData, setProjectData } from './projectData';
import { useAssetStore } from './useAssetStore';
import type { ProjectData } from '@/shared/types/project';

const assetStore = useAssetStore();

/**
 * EXPORTAR: Cria arquivo .clic (ZIP)
 */
export async function exportToComputer(filename = 'meu-chatbot') {
  // Clona o projeto para não alterar o estado "vivo" do editor
  // Precisamos modificar o JSON que vai para o ZIP (remote -> local)
  const originalData = getProjectData();
  const projectToSave = JSON.parse(JSON.stringify(originalData)) as ProjectData;
  
  const zip = new JSZip();
  const assetsFolder = zip.folder('assets');

  // Processar Assets (Local e Remoto)
  if (projectToSave.assets && assetsFolder) {
    const assetPromises = Object.entries(projectToSave.assets).map(async ([id, asset]) => {
      
      try {
        let blob: Blob | null = null;

        // CASO A: Asset já é local (está na memória/IndexedDB)
        if (asset.source === 'local') {
          blob = await assetStore.getAssetBlob(id);
        }
        
        // CASO B: Asset é remoto (URL do WordPress) -> Baixar e converter para Local
        else if (asset.source === 'remote' && asset.url) {
          const res = await fetch(asset.url);
          if (res.ok) {
            blob = await res.blob();
            
            // Transforma o asset em 'local' DENTRO DO ZIP
            // Assim, ao importar, ele não dependerá mais da internet/WP
            asset.source = 'local';
            delete asset.url;       // Remove a URL antiga
            delete asset.externalId; // Remove vínculo com ID do WP
          } else {
            console.warn(`Não foi possível baixar asset remoto: ${asset.url}`);
          }
        }

        // Se conseguimos o blob (seja local ou baixado agora), salva no ZIP
        if (blob) {
          // Garante extensão correta
          const ext = asset.type.split('/')[1] || 'bin';
          assetsFolder.file(`${id}.${ext}`, blob);
        }

      } catch (err) {
        console.error(`Erro ao processar asset ${id} para exportação:`, err);
        // Em caso de erro, o asset permanece como 'remote' no JSON,
        // garantindo que o link original não se perca.
      }
    });

    // Aguarda todos os downloads/leituras terminarem
    await Promise.all(assetPromises);
  }

  // Salva o JSON modificado (onde tudo que baixamos virou 'local')
  zip.file('project.json', JSON.stringify(projectToSave, null, 2));

  // Gerar e Baixar
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
