export type EntityType = 'LOC' | 'ADDRESS' | 'EMAIL' | 'PHONE' | 'DATE' | 'IBAN' | 'SIREN' | 'SIRET' | 'PERSON' | 'ORG';

export interface DetectedEntity {
  id: string;
  type: EntityType;
  value: string;
  replacement: string;
  confidence?: number;
  source: 'regex' | 'ner';
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