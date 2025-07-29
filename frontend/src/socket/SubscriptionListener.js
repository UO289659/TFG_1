// components/SubscriptionListener.js
import { useEffect, useState } from 'react';
import { useTokenUpdates } from '../socket/useSocket';
import { useUserContext } from '../context/UserContext';

function SubscriptionListener() {
  const [notification, setNotification] = useState(null);
  const { user } = useUserContext();
  const { requestTokenUpdate } = useTokenUpdates();

  useEffect(() => {
    // Escuchar evento de suscripción cancelada
    const handleSubscriptionCancelled = (event) => {
      console.log('🔔 Suscripción cancelada:', event.detail);
      setNotification({
        type: 'warning',
        message: 'Tu suscripción ha sido cancelada. Tendrás acceso hasta el final del período actual.'
      });
      
      // Auto-ocultar notificación después de 5 segundos
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    };

    // Escuchar evento de token actualizado
    const handleTokenUpdated = (event) => {
      console.log('🔔 Token actualizado:', event.detail);
      setNotification({
        type: 'success',
        message: 'Tu información de suscripción ha sido actualizada.'
      });
      
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    };

    // Escuchar evento de error de token
    const handleTokenUpdateError = (event) => {
      console.error('🔔 Error actualizando token:', event.detail);
      setNotification({
        type: 'error',
        message: 'Error actualizando tu información. Intenta refrescar la página.'
      });
    };

    // Agregar listeners
    window.addEventListener('subscriptionCancelled', handleSubscriptionCancelled);
    window.addEventListener('userDataUpdated', handleTokenUpdated);
    window.addEventListener('tokenUpdateError', handleTokenUpdateError);

    // Cleanup
    return () => {
      window.removeEventListener('subscriptionCancelled', handleSubscriptionCancelled);
      window.removeEventListener('userDataUpdated', handleTokenUpdated);
      window.removeEventListener('tokenUpdateError', handleTokenUpdateError);
    };
  }, []);

  // Renderizar notificación
  if (!notification) return null;

  return (
    <div className={`notification ${notification.type}`} style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '15px 20px',
      borderRadius: '5px',
      color: 'white',
      zIndex: 1000,
      backgroundColor: 
        notification.type === 'success' ? '#4CAF50' :
        notification.type === 'warning' ? '#FF9800' :
        notification.type === 'error' ? '#F44336' : '#2196F3'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>{notification.message}</span>
        <button 
          onClick={() => setNotification(null)}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'white', 
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default SubscriptionListener;