import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ExportOptions {
  includeWatermark: boolean;
  includeAuditReport: boolean;
  preserveMetadata: boolean;
  format: 'docx';
  compression: boolean;
}

interface ExportState {
  options: ExportOptions;
  isExporting: boolean;
  exportProgress: number;
  lastExportUrl: string | null;
  exportHistory: Array<{
    id: string;
    filename: string;
    timestamp: Date;
    options: ExportOptions;
    success: boolean;
    size?: number;
  }>;
  
  // Actions
  setExportOptions: (options: Partial<ExportOptions>) => void;
  startExport: () => Promise<string>;
  setExportProgress: (progress: number) => void;
  completeExport: (url: string, success: boolean, size?: number) => void;
  clearExportUrl: () => void;
  getExportHistory: () => ExportState['exportHistory'];
  reset: () => void;
}

export const useExportStore = create<ExportState>()(
  devtools(
    (set, get) => ({
      // État initial
      options: {
        includeWatermark: false,
        includeAuditReport: false,
        preserveMetadata: true,
        format: 'docx',
        compression: true,
      },
      isExporting: false,
      exportProgress: 0,
      lastExportUrl: null,
      exportHistory: [],

      // Actions
      setExportOptions: (newOptions) =>
        set((state) => ({
          options: { ...state.options, ...newOptions },
        }), false, 'export/setExportOptions'),

      startExport: async () => {
        set({ isExporting: true, exportProgress: 0 }, false, 'export/startExport');
        
        try {
          // Simulation de l'export - dans une vraie app, ceci ferait appel à l'API
          for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            set({ exportProgress: i }, false, 'export/updateProgress');
          }
          
          const mockUrl = `blob:${window.location.origin}/${Date.now()}_document_anonymise.docx`;
          get().completeExport(mockUrl, true, 1024 * 1024); // 1MB simulé
          
          return mockUrl;
        } catch (error) {
          get().completeExport('', false);
          throw error;
        }
      },

      setExportProgress: (progress) =>
        set({ exportProgress: progress }, false, 'export/setExportProgress'),

      completeExport: (url, success, size) =>
        set((state) => {
          const exportEntry = {
            id: `export_${Date.now()}`,
            filename: `document_anonymise_${new Date().toISOString().slice(0, 10)}.docx`,
            timestamp: new Date(),
            options: { ...state.options },
            success,
            size,
          };
          
          return {
            isExporting: false,
            exportProgress: 100,
            lastExportUrl: success ? url : null,
            exportHistory: [exportEntry, ...state.exportHistory].slice(0, 20), // Garder les 20 derniers
          };
        }, false, 'export/completeExport'),

      clearExportUrl: () =>
        set({ lastExportUrl: null }, false, 'export/clearExportUrl'),

      getExportHistory: () => get().exportHistory,

      reset: () =>
        set({
          options: {
            includeWatermark: false,
            includeAuditReport: false,
            preserveMetadata: true,
            format: 'docx',
            compression: true,
          },
          isExporting: false,
          exportProgress: 0,
          lastExportUrl: null,
          exportHistory: [],
        }, false, 'export/reset'),
    }),
    {
      name: 'export-store',
    }
  )
);