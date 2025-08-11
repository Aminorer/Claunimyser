import { useEffect } from 'react';
import { useStores } from '../stores';

export const useKeyboardShortcuts = () => {
  const { document, entities, ui } = useStores();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { ctrlKey, metaKey, key, shiftKey } = event;
      const isModifier = ctrlKey || metaKey;

      // Éviter les conflits avec les champs de saisie
      if ((event.target as HTMLElement).tagName === 'INPUT' || 
          (event.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      // Select All (Ctrl+A)
      if (isModifier && key === 'a') {
        event.preventDefault();
        const allEntityIds = entities.entities.map(e => e.id);
        allEntityIds.forEach(id => entities.selectEntity(id, true));
      }

      // Delete selected entities (Delete/Backspace)
      if (key === 'Delete' || key === 'Backspace') {
        if (entities.selectedEntities.length > 0) {
          event.preventDefault();
          entities.selectedEntities.forEach(id => entities.deleteEntity(id));
        }
      }

      // Escape - Clear selection and close modals
      if (key === 'Escape') {
        entities.clearSelection();
        ui.closeEditModal();
      }

      // Toggle view (Ctrl+H)
      if (isModifier && key === 'h') {
        event.preventDefault();
        document.toggleView();
      }

      // Zoom controls
      if (isModifier && key === '=') {
        event.preventDefault();
        document.setZoomLevel(document.zoomLevel + 10);
      }

      if (isModifier && key === '-') {
        event.preventDefault();
        document.setZoomLevel(document.zoomLevel - 10);
      }

      // Tab navigation (1-4 pour les onglets)
      if (!isModifier && ['1', '2', '3', '4'].includes(key)) {
        const tabs: TabType[] = ['entities', 'groups', 'search', 'rules'];
        const tabIndex = parseInt(key) - 1;
        if (tabs[tabIndex]) {
          event.preventDefault();
          ui.setActiveTab(tabs[tabIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [document, entities, ui]);
};