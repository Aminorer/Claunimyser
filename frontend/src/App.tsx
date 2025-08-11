import { useState, useEffect } from 'react';
import UploadPage from './components/UploadPage';
import ProgressPage from './components/ProgressPage';
import EditorInterface from './components/EditorInterface';
import NotificationContainer from './components/NotificationContainer';
import { useStores } from './stores';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

type AppPage = 'upload' | 'progress' | 'editor';

interface NavigationData {
  page: AppPage;
  data?: any;
}

const App = () => {
  const [currentPage, setCurrentPage] = useState<AppPage>('upload');
  const [navigationData, setNavigationData] = useState<any>(null);
  const { ui } = useStores();

  // Hook pour les raccourcis clavier
  useKeyboardShortcuts();

  // Écouter les événements de navigation personnalisés
  useEffect(() => {
    const handleNavigation = (event: CustomEvent<NavigationData>) => {
      setCurrentPage(event.detail.page);
      setNavigationData(event.detail.data);
    };

    window.addEventListener('navigate', handleNavigation as EventListener);
    return () => window.removeEventListener('navigate', handleNavigation as EventListener);
  }, []);

  // Auto-fermeture des notifications
  useEffect(() => {
    ui.notifications.forEach((notification) => {
      if (notification.autoClose !== false) {
        const timer = setTimeout(() => {
          ui.removeNotification(notification.id);
        }, 5000);
        return () => clearTimeout(timer);
      }
    });
  }, [ui.notifications, ui]);

  const renderPage = () => {
    switch (currentPage) {
      case 'upload':
        return <UploadPage />;
      case 'progress':
        return <ProgressPage data={navigationData} />;
      case 'editor':
        return <EditorInterface data={navigationData} />;
      default:
        return <UploadPage />;
    }
  };

  return (
    <div className="app">
      {renderPage()}
      <NotificationContainer />
      
      {/* Dev Tools - À retirer en production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
          Page: {currentPage} | Mode: {navigationData?.mode || 'N/A'}
        </div>
      )}
    </div>
  );
};

export default App;