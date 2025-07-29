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
  }

  // Conectar al servidor Socket.IO
  connect(token) {
    if (this.socket && this.isConnected) {
      console.log('Socket ya está conectado');
      return;
    }

    const serverURL = process.env.REACT_APP_PAYMENT_SERVICE_URL || 'https://0e42060e4d39.ngrok-free.app';
    
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
  }

  // Configurar event listeners
  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('🔌 Conectado al servidor Socket.IO');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
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
      this.handleReconnect();
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
    // Actualizar token en localStorage
    if (data.token) {
      localStorage.setItem('token', data.token);
    }

    // Emitir evento para que los componentes puedan reaccionar
    this.emit('token-updated', data);
    
    // También puedes disparar un evento personalizado en window
    window.dispatchEvent(new CustomEvent('tokenUpdated', { 
      detail: data 
    }));
  }

  // Manejar reconexión
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`🔄 Intentando reconectar en ${delay}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (!this.isConnected) {
          this.socket.connect();
        }
      }, delay);
    } else {
      console.error('❌ Máximo número de intentos de reconexión alcanzado');
      this.emit('reconnect-failed');
    }
  }

  // Solicitar actualización de token
  requestTokenUpdate() {
    if (this.socket && this.isConnected) {
      this.socket.emit('request-token-update');
    } else {
      console.error('Socket no está conectado');
    }
  }

  // Desconectar
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  // Sistema de eventos interno
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
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
    return this.socket && this.isConnected;
  }

  // Obtener información de conexión
  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      hasSocket: !!this.socket
    };
  }
}

// Crear instancia singleton
const socketService = new SocketService();

export default socketService;