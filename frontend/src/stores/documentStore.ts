import { create } from 'zustand';

export type ProcessingMode = 'regex' | 'ia';
export type ProcessingStep = 'upload' | 'reading' | 'analysis' | 'interface' | 'complete';

export interface ProcessedDocument {
  id: string;
  filename: string;
  format: 'pdf' | 'docx';
  size: number;
  content: string;
  uploadedAt: Date;
}

interface DocumentState {
  currentDoc: ProcessedDocument | null;
  processingMode: ProcessingMode;
  currentPage: number;
  zoomLevel: number;
  showOriginal: boolean;
  isProcessing: boolean;
  processingStep: ProcessingStep;
  processingProgress: number;
  
  setDocument: (doc: ProcessedDocument) => void;
  setProcessingMode: (mode: ProcessingMode) => void;
  setCurrentPage: (page: number) => void;
  setZoomLevel: (zoom: number) => void;
  toggleView: () => void;
  updateProcessing: (step: ProcessingStep, progress: number) => void;
  reset: () => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  currentDoc: null,
  processingMode: 'regex',
  currentPage: 1,
  zoomLevel: 100,
  showOriginal: false,
  isProcessing: false,
  processingStep: 'upload',
  processingProgress: 0,

  setDocument: (doc) => set({ currentDoc: doc, currentPage: 1 }),
  setProcessingMode: (mode) => set({ processingMode: mode }),
  setCurrentPage: (page) => set({ currentPage: Math.max(1, page) }),
  setZoomLevel: (zoom) => set({ zoomLevel: Math.max(50, Math.min(200, zoom)) }),
  toggleView: () => set((state) => ({ showOriginal: !state.showOriginal })),
  updateProcessing: (step, progress) => set({ 
    processingStep: step, 
    processingProgress: progress,
    isProcessing: step !== 'complete'
  }),
  reset: () => set({
    currentDoc: null,
    currentPage: 1,
    zoomLevel: 100,
    showOriginal: false,
    isProcessing: false,
    processingStep: 'upload',
    processingProgress: 0,
  }),
}));
