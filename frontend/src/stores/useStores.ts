// hooks/useStores.ts - Hook personnalisé pour combiner les stores
import { useDocumentStore } from './documentStore';
import { useEntitiesStore } from './entitiesStore';
import { useUIStore } from './uiStore';
import { useExportStore } from './exportStore';

export const useStores = () => {
  const documentStore = useDocumentStore();
  const entitiesStore = useEntitiesStore();
  const uiStore = useUIStore();
  const exportStore = useExportStore();
  
  return {
    document: documentStore,
    entities: entitiesStore,
    ui: uiStore,
    export: exportStore,
  };
};

// Selectors pour optimiser les re-renders
export const useFilteredEntities = () =>
  useEntitiesStore((state) => state.getFilteredEntities());

export const useEntityStats = () =>
  useEntitiesStore((state) => state.getStats());

export const useSelectedEntitiesData = () =>
  useEntitiesStore((state) => {
    const selectedIds = state.selectedEntities;
    return selectedIds.map(id => state.getEntityById(id)).filter(Boolean);
  });

export const useCanUndo = () =>
  useUIStore((state) => state.canUndo());

export const useCanRedo = () =>
  useUIStore((state) => state.canRedo());
