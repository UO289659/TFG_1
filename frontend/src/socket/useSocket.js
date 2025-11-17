// hooks/useSocket.js
import { useEffect, useContext, createContext, useState, useCallback, useRef } from 'react';
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
    hasSocket: false,
    isDestroyed: false,
    isServiceAvailable: true
  });

  const isUnmountingRef = useRef(false);

  const connectSocket = useCallback((token) => {
    if (token && !isUnmountingRef.current) {
      try {
        socketService.connect(token);
      } catch (error) {
        console.error('Error conectando socket:', error);
      }
    }
  }, []);

  const disconnectSocket = useCallback(() => {
    try {
      socketService.disconnect();
      setIsConnected(false);
      updateConnectionInfo();
    } catch (error) {
      console.error('Error desconectando socket:', error);
    }
  }, []);

  const destroySocket = useCallback(() => {
    try {
      socketService.destroy();
      setIsConnected(false);
      updateConnectionInfo();
    } catch (error) {
      console.error('Error destruyendo socket:', error);
    }
  }, []);

  const reinitializeSocket = useCallback(() => {
    try {
      socketService.reinitialize();
      setIsConnected(false);
      updateConnectionInfo();
    } catch (error) {
      console.error('Error reinicializando socket:', error);
    }
  }, []);

  const requestTokenUpdate = useCallback(() => {
    try {
      socketService.requestTokenUpdate();
    } catch (error) {
      console.error('Error solicitando actualización de token:', error);
    }
  }, []);

  const updateConnectionInfo = useCallback(() => {
    if (!isUnmountingRef.current) {
      try {
        setConnectionInfo(socketService.getConnectionInfo());
      } catch (error) {
        console.error('Error obteniendo información de conexión:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Configurar listeners del socket service
    const handleConnected = () => {
      if (!isUnmountingRef.current) {
        setIsConnected(true);
        updateConnectionInfo();
      }
    };

    const handleDisconnected = () => {
      if (!isUnmountingRef.current) {
        setIsConnected(false);
        updateConnectionInfo();
      }
    };

    const handleReconnectFailed = () => {
      if (!isUnmountingRef.current) {
        setIsConnected(false);
        updateConnectionInfo();
      }
    };

    const handleConnectionError = (error) => {
      console.error('Error de conexión:', error);
      if (!isUnmountingRef.current) {
        setIsConnected(false);
        updateConnectionInfo();
      }
    };

    // Nuevo: manejar cuando se necesita una nueva conexión completa
    const handleReconnectRequiresNewConnection = () => {
      console.log('🔄 Reconexión requiere nueva conexión completa');
      if (!isUnmountingRef.current) {
        // Aquí podrías intentar reconectar con el token actual si está disponible
        const currentToken = localStorage.getItem('token');
        if (currentToken) {
          console.log('🔄 Intentando crear nueva conexión con token actual');
          connectSocket(currentToken);
        } else {
          console.warn('⚠️ No hay token disponible para reconexión');
          setIsConnected(false);
          updateConnectionInfo();
        }
      }
    };

    const handleReconnectError = (error) => {
      console.error('Error en reconexión:', error);
      if (!isUnmountingRef.current) {
        setIsConnected(false);
        updateConnectionInfo();
      }
    };

    try {
      // Agregar listeners
      socketService.on('connected', handleConnected);
      socketService.on('disconnected', handleDisconnected);
      socketService.on('reconnect-failed', handleReconnectFailed);
      socketService.on('connection-error', handleConnectionError);
      socketService.on('reconnect-requires-new-connection', handleReconnectRequiresNewConnection);
      socketService.on('reconnect-error', handleReconnectError);

      // Actualizar estado inicial
      updateConnectionInfo();
    } catch (error) {
      console.error('Error configurando listeners:', error);
    }

    // Cleanup
    return () => {
      isUnmountingRef.current = true;
      try {
        socketService.off('connected', handleConnected);
        socketService.off('disconnected', handleDisconnected);
        socketService.off('reconnect-failed', handleReconnectFailed);
        socketService.off('connection-error', handleConnectionError);
        socketService.off('reconnect-requires-new-connection', handleReconnectRequiresNewConnection);
        socketService.off('reconnect-error', handleReconnectError);
      } catch (error) {
        console.error('Error limpiando listeners:', error);
      }
    };
  }, [updateConnectionInfo, connectSocket]);

  const value = {
    isConnected,
    connectionInfo,
    connectSocket,
    disconnectSocket,
    destroySocket,
    reinitializeSocket,
    requestTokenUpdate,
    socketService: socketService.isServiceAvailable() ? socketService : null
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
  const callbackRef = useRef(callback);
  const isUnmountedRef = useRef(false);

  // Actualizar ref cuando cambie el callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    isUnmountedRef.current = false;

    const wrappedCallback = (data) => {
      if (!isUnmountedRef.current && typeof callbackRef.current === 'function') {
        try {
          callbackRef.current(data);
        } catch (error) {
          console.error('Error in socket event callback:', error);
        }
      }
    };

    try {
      if (socketService.isServiceAvailable()) {
        socketService.on(eventName, wrappedCallback);
      }
    } catch (error) {
      console.error('Error agregando listener de socket:', error);
    }
    
    return () => {
      isUnmountedRef.current = true;
      try {
        if (socketService.isServiceAvailable()) {
          socketService.off(eventName, wrappedCallback);
        }
      } catch (error) {
        console.error('Error removiendo listener de socket:', error);
      }
    };
  }, [eventName]);
};

// Hook para manejar actualizaciones de token
export const useTokenUpdates = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('token');
    } catch (error) {
      console.error('Error accediendo localStorage:', error);
      return null;
    }
  });
  
  const { login, setUserData } = useUserContext();
  const isUnmountedRef = useRef(false);

  const handleTokenUpdate = useCallback((data) => {
    if (isUnmountedRef.current) return;

    console.log('Token actualizado:', data);
    
    try {
      if (data.token && typeof login === 'function') {
        login(data.token);
        setToken(data.token);
      }
      
      if (data.user && typeof setUserData === 'function') {
        setUser(data.user);
        setUserData(data.user);
      }
    } catch (error) {
      console.error('Error manejando actualización de token:', error);
    }
  }, [login, setUserData]);

  const handleTokenUpdateError = useCallback((error) => {
    if (isUnmountedRef.current) return;
    
    console.error('Error actualizando token:', error);
    // Aquí puedes agregar lógica adicional para manejar errores
  }, []);

  const handleSubscriptionCancelled = useCallback((data) => {
    if (isUnmountedRef.current) return;
    
    console.log('Suscripción cancelada:', data);
    // Aquí puedes agregar lógica adicional para manejar cancelaciones
  }, []);

  const requestTokenUpdate = useCallback(() => {
    try {
      if (socketService.isServiceAvailable()) {
        socketService.requestTokenUpdate();
      }
    } catch (error) {
      console.error('Error solicitando actualización de token:', error);
    }
  }, []);

  useSocketEvent('token-updated', handleTokenUpdate);
  useSocketEvent('token-update-error', handleTokenUpdateError);
  useSocketEvent('subscription-cancelled', handleSubscriptionCancelled);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  return {
    user,
    token,
    requestTokenUpdate
  };
};

export default useSocket;