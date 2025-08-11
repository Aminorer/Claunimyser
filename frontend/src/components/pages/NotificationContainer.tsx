import { useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useStores } from '../stores';

const NotificationContainer = () => {
  const { ui } = useStores();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // Auto-suppression des notifications après 5 secondes
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

  if (ui.notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {ui.notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg border shadow-lg animate-slide-in ${getStyles(notification.type)}`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {getIcon(notification.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {notification.message}
              </p>
              <p className="text-xs opacity-75 mt-1">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
            
            <button
              onClick={() => ui.removeNotification(notification.id)}
              className="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;