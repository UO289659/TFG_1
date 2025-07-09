// hooks/useSocket.js
import { useEffect, useContext, createContext, useState } from 'react';
import socketService from './socketService';
import { useUserContext } from "../context/UserContext"; 

// Crear contexto para el socket
const SocketContext = createContext();

// Provider component
export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState({
    isConnected: false,
    reconnectAttempts: 0,
    hasSocket: false
  });

  const connectSocket = (token) => {
    if (token) {
      socketService.connect(token);
    }
  };

  const disconnectSocket = () => {
    socketService.disconnect();
    setIsConnected(false);
  };

  const requestTokenUpdate = () => {
    socketService.requestTokenUpdate();
  };

  useEffect(() => {
    // Configurar listeners del socket service
    const handleConnected = () => {
      setIsConnected(true);
      setConnectionInfo(socketService.getConnectionInfo());
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setConnectionInfo(socketService.getConnectionInfo());
    };

    const handleReconnectFailed = () => {
      setIsConnected(false);
      setConnectionInfo(socketService.getConnectionInfo());
    };

    // Agregar listeners
    socketService.on('connected', handleConnected);
    socketService.on('disconnected', handleDisconnected);
    socketService.on('reconnect-failed', handleReconnectFailed);

    // Cleanup
    return () => {
      socketService.off('connected', handleConnected);
      socketService.off('disconnected', handleDisconnected);
      socketService.off('reconnect-failed', handleReconnectFailed);
    };
  }, []);

  const value = {
    isConnected,
    connectionInfo,
    connectSocket,
    disconnectSocket,
    requestTokenUpdate,
    socketService
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Hook para usar el contexto del socket
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// Hook personalizado para manejar eventos específicos
export const useSocketEvent = (eventName, callback) => {
  useEffect(() => {
    if (typeof callback === 'function') {
      socketService.on(eventName, callback);
      
      return () => {
        socketService.off(eventName, callback);
      };
    }
  }, [eventName, callback]);
};

// Hook para manejar actualizaciones de token
export const useTokenUpdates = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const { login, setUserData } = useUserContext();

  const handleTokenUpdate = (data) => {
    console.log('Token actualizado:', data);
    
    if (data.token) {
       login(data.token);
        setToken(data.token);
    }
    
    if (data.user) {
      setUser(data.user);
        setUserData(data.user);
    }

    // Opcional: Recargar la página o actualizar el estado global
    // window.location.reload();
  };

  const handleTokenUpdateError = (error) => {
    console.error('Error actualizando token:', error);
    // Manejar error, tal vez mostrar notificación
  };

  const handleSubscriptionCancelled = (data) => {
    console.log('Suscripción cancelada:', data);
    // Manejar cancelación de suscripción
    // Tal vez mostrar notificación al usuario
  };

  useSocketEvent('token-updated', handleTokenUpdate);
  useSocketEvent('token-update-error', handleTokenUpdateError);
  useSocketEvent('subscription-cancelled', handleSubscriptionCancelled);

  return {
    user,
    token,
    requestTokenUpdate: () => socketService.requestTokenUpdate()
  };
};

export default useSocket;