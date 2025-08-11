import { create } from 'zustand';

// Types communs
export type ProcessingMode = 'regex' | 'ia';
export type ProcessingStep = 'upload' | 'reading' | 'analysis' | 'interface' | 'complete';
export type EntityType = 'LOC' | 'ADDRESS' | 'EMAIL' | 'PHONE' | 'DATE' | 'IBAN' | 'SIREN' | 'SIRET' | 'PERSON' | 'ORG';
export type TabType = 'entities' | 'groups' | 'search' | 'rules';

// Interfaces
export interface ProcessedDocument {
  id: string;
  filename: string;
  format: 'pdf' | 'docx';
  size: number;
  content: string;
  uploadedAt: Date;
}

export interface DetectedEntity {
  id: string;
  type: EntityType;
  value: string;
  replacement: string;
  confidence?: number;
  source: 'regex' | 'ner' | 'manual';
  page: number;
  isModified: boolean;
  groupId?: string;
}

export interface EntityGroup {
  id: string;
  name: string;
  entities: string[];
  replacementPattern: string;
  color: string;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  autoClose?: boolean;
}

// DocumentStore
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

// EntitiesStore
interface EntitiesState {
  entities: DetectedEntity[];
  groups: EntityGroup[];
  selectedEntities: string[];
  confidenceThreshold: number;
  
  addEntity: (entity: Omit<DetectedEntity, 'id'>) => void;
  updateEntity: (id: string, updates: Partial<DetectedEntity>) => void;
  deleteEntity: (id: string) => void;
  selectEntity: (id: string, selected: boolean) => void;
  clearSelection: () => void;
  createGroup: (name: string, entityIds: string[]) => void;
  deleteGroup: (id: string) => void;
  setConfidenceThreshold: (threshold: number) => void;
  getFilteredEntities: () => DetectedEntity[];
  getStats: () => { total: number; modified: number; groups: number; coverage: number };
  reset: () => void;
}

export const useEntitiesStore = create<EntitiesState>((set, get) => ({
  entities: [],
  groups: [],
  selectedEntities: [],
  confidenceThreshold: 0.7,

  addEntity: (entityData) => set((state) => ({
    entities: [...state.entities, {
      ...entityData,
      id: `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }]
  })),

  updateEntity: (id, updates) => set((state) => ({
    entities: state.entities.map(entity =>
      entity.id === id ? { ...entity, ...updates, isModified: true } : entity
    )
  })),

  deleteEntity: (id) => set((state) => ({
    entities: state.entities.filter(entity => entity.id !== id),
    selectedEntities: state.selectedEntities.filter(entityId => entityId !== id),
  })),

  selectEntity: (id, selected) => set((state) => ({
    selectedEntities: selected 
      ? [...state.selectedEntities, id]
      : state.selectedEntities.filter(entityId => entityId !== id)
  })),

  clearSelection: () => set({ selectedEntities: [] }),

  createGroup: (name, entityIds) => set((state) => {
    const newGroup: EntityGroup = {
      id: `group_${Date.now()}`,
      name,
      entities: entityIds,
      replacementPattern: `${name.toUpperCase()}_[INDEX]`,
      color: 'bg-cyan-100 border-cyan-300 text-cyan-800'
    };
    
    return {
      groups: [...state.groups, newGroup],
      entities: state.entities.map(entity =>
        entityIds.includes(entity.id) ? { ...entity, groupId: newGroup.id } : entity
      ),
      selectedEntities: []
    };
  }),

  deleteGroup: (id) => set((state) => ({
    groups: state.groups.filter(group => group.id !== id),
    entities: state.entities.map(entity =>
      entity.groupId === id ? { ...entity, groupId: undefined } : entity
    )
  })),

  setConfidenceThreshold: (threshold) => set({ confidenceThreshold: threshold }),

  getFilteredEntities: () => {
    const { entities, confidenceThreshold } = get();
    return entities.filter(entity => 
      !entity.confidence || entity.confidence >= confidenceThreshold
    );
  },

  getStats: () => {
    const { entities, groups } = get();
    return {
      total: entities.length,
      modified: entities.filter(e => e.isModified).length,
      groups: groups.length,
      coverage: Math.round((entities.filter(e => !e.confidence || e.confidence >= get().confidenceThreshold).length / entities.length) * 100) || 0
    };
  },

  reset: () => set({
    entities: [],
    groups: [],
    selectedEntities: [],
    confidenceThreshold: 0.7,
  }),
}));

// UIStore
interface UIState {
  activeTab: TabType;
  searchQuery: string;
  isEditModalOpen: boolean;
  editingEntityId: string | null;
  notifications: Notification[];
  
  setActiveTab: (tab: TabType) => void;
  setSearchQuery: (query: string) => void;
  openEditModal: (entityId: string) => void;
  closeEditModal: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  reset: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'entities',
  searchQuery: '',
  isEditModalOpen: false,
  editingEntityId: null,
  notifications: [],

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  openEditModal: (entityId) => set({ 
    isEditModalOpen: true, 
    editingEntityId: entityId 
  }),
  
  closeEditModal: () => set({ 
    isEditModalOpen: false, 
    editingEntityId: null 
  }),

  addNotification: (notification) => set((state) => ({
    notifications: [...state.notifications, {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    }]
  })),

  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),

  clearNotifications: () => set({ notifications: [] }),

  reset: () => set({
    activeTab: 'entities',
    searchQuery: '',
    isEditModalOpen: false,
    editingEntityId: null,
    notifications: [],
  }),
}));

// Hook principal pour combiner les stores
export const useStores = () => {
  const document = useDocumentStore();
  const entities = useEntitiesStore();
  const ui = useUIStore();
  
  return { document, entities, ui };
};