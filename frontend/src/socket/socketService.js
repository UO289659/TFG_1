// socketService.js
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.isDestroyed = false;
    this.connectionTimeout = null;
  }

  // Verificar si el servicio está disponible
  isServiceAvailable() {
    return !this.isDestroyed;
  }

  // Conectar al servidor Socket.IO
  connect(token) {
    // Verificar si el servicio está disponible
    if (!this.isServiceAvailable()) {
      console.warn('SocketService ha sido destruido, no se puede conectar');
      return;
    }

    if (this.socket && this.isConnected) {
      console.log('Socket ya está conectado');
      return;
    }

    // Validar token
    if (!token) {
      console.error('Token es requerido para conectar');
      return;
    }

    try {
      const serverURL = process.env.REACT_APP_PAYMENT_SERVICE_URL || 'https://0e42060e4d39.ngrok-free.app';
      
      // Limpiar socket anterior si existe
      if (this.socket) {
        this.cleanupSocket();
      }

      this.socket = io(serverURL, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      });

      this.setupEventListeners();
      this.reconnectAttempts = 0;

      // Timeout de conexión
      this.connectionTimeout = setTimeout(() => {
        if (!this.isConnected && this.socket) {
          console.warn('Timeout de conexión alcanzado');
          this.handleConnectionTimeout();
        }
      }, 15000);

    } catch (error) {
      console.error('Error al crear socket:', error);
      this.emit('connection-error', error);
    }
  }

  // Manejar timeout de conexión
  handleConnectionTimeout() {
    if (!this.isServiceAvailable()) {
      console.log('🚫 Servicio no disponible durante timeout de conexión');
      return;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.activeTimeouts.delete(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.socket && !this.isConnected) {
      console.warn('Conexión timeout, intentando reconectar...');
      this.cleanupSocket();
      this.handleReconnect();
    }
  }

  // Limpiar socket
  cleanupSocket() {
    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      } catch (error) {
        console.warn('Error limpiando socket:', error);
      }
      this.socket = null;
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    this.isConnected = false;
  }

  // Configurar event listeners
  setupEventListeners() {
    if (!this.socket || !this.isServiceAvailable()) return;

    this.socket.on('connect', () => {
      console.log('🔌 Conectado al servidor Socket.IO');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Limpiar timeout si existe
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      // Notificar a todos los listeners sobre la conexión
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Desconectado del servidor Socket.IO:', reason);
      this.isConnected = false;
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket.IO:', error);
      this.isConnected = false;
      
      // Solo intentar reconectar si el servicio sigue disponible
      if (this.isServiceAvailable()) {
        this.handleReconnect();
      }
    });

    // Escuchar eventos de actualización de token
    this.socket.on('token-updated', (data) => {
      console.log('✅ Token actualizado recibido');
      this.handleTokenUpdate(data);
    });

    this.socket.on('token-update-error', (error) => {
      console.error('❌ Error actualizando token:', error);
      this.emit('token-update-error', error);
    });

    // Escuchar eventos de cancelación de suscripción
    this.socket.on('subscription-cancelled', (data) => {
      console.log('📋 Suscripción cancelada:', data);
      this.emit('subscription-cancelled', data);
    });
  }

  // Manejar actualización de token
  handleTokenUpdate(data) {
    if (!this.isServiceAvailable()) return;

    try {
      // Actualizar token en localStorage solo si está disponible
      if (data.token && typeof(Storage) !== "undefined") {
        localStorage.setItem('token', data.token);
      }

      // Emitir evento para que los componentes puedan reaccionar
      this.emit('token-updated', data);
      
      // También puedes disparar un evento personalizado en window
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tokenUpdated', { 
          detail: data 
        }));
      }
    } catch (error) {
      console.error('Error manejando actualización de token:', error);
    }
  }

  // Manejar reconexión
  handleReconnect() {
    if (!this.isServiceAvailable()) return;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`🔄 Intentando reconectar en ${delay}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (!this.isConnected && this.socket && this.isServiceAvailable()) {
          try {
            this.socket.connect();
          } catch (error) {
            console.error('Error en reconexión:', error);
          }
        }
      }, delay);
    } else {
      console.error('❌ Máximo número de intentos de reconexión alcanzado');
      this.emit('reconnect-failed');
    }
  }

  // Solicitar actualización de token
  requestTokenUpdate() {
    if (!this.isServiceAvailable()) {
      console.warn('SocketService no está disponible');
      return;
    }

    if (this.socket && this.isConnected) {
      try {
        this.socket.emit('request-token-update');
      } catch (error) {
        console.error('Error solicitando actualización de token:', error);
      }
    } else {
      console.error('Socket no está conectado');
    }
  }

  // Desconectar
  disconnect() {
    console.log('Desconectando socket...');
    
    // Limpiar timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Limpiar socket
    this.cleanupSocket();
    
    // Limpiar listeners internos
    this.listeners.clear();
  }

  // Destruir completamente el servicio (para logout)
  destroy() {
    console.log('Destruyendo SocketService...');
    this.isDestroyed = true;
    this.disconnect();
  }

  // Reinicializar el servicio (después de logout)
  reinitialize() {
    console.log('Reinicializando SocketService...');
    this.isDestroyed = false;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.listeners.clear();
    this.socket = null;
    this.connectionTimeout = null;
    this.reconnectTimeout = null;
  }

  // Sistema de eventos interno
  on(event, callback) {
    if (!this.isServiceAvailable()) return;

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.isServiceAvailable()) return;

    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  // Verificar estado de conexión
  isSocketConnected() {
    return this.socket && this.isConnected && this.isServiceAvailable();
  }

  // Obtener información de conexión
  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      hasSocket: !!this.socket,
      isDestroyed: this.isDestroyed,
      isServiceAvailable: this.isServiceAvailable()
    };
  }
}

// Crear instancia singleton
const socketService = new SocketService();

export default socketService;