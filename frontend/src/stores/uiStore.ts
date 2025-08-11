export type TabType = 'entities' | 'groups' | 'search' | 'rules';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  autoClose?: boolean;
}

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