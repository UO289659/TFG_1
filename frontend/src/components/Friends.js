import React, { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, Check, X, Users, Bell, Trash2, Mail, MessageCircle } from 'lucide-react';
import axios from "axios";
import toast from 'react-hot-toast';
import "./Friends.css";
import Swal from 'sweetalert2';
import Footer from "./Footer.js";

const FriendsSystem = () => {
  //const GATEWAY_URL = 'https://gateway-tfg.azure-api.net/users' || 'http://localhost:4000';
  const GATEWAY_URL = process.env.REACT_APP_GATEWAY_URL;
  const [activeTab, setActiveTab] = useState('friends');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [usersCache, setUsersCache] = useState({}); // Cache para usuarios

  useEffect(() => {
    const token = localStorage.getItem("token");
    setToken(token);
    if (!token) {
      return;
    }

    const fetchFriends = async () => {
      try {
        const res = await axios.get(GATEWAY_URL+"/friends", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFriends(res.data);
      } catch (err) {
        console.error("Error al cargar amigos:", err);
      }
    };

    const fetchFriendRequests = async () => {
      try {
        const res = await axios.get(GATEWAY_URL+"/friend-requests/received", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        // Con populate, ya vienen los datos del sender
        setFriendRequests(res.data);
      } catch (err) {
        console.error("Error al cargar solicitudes recibidas:", err);
      }
    };

  const fetchSentRequests = async () => {
    try {
      const res = await axios.get(GATEWAY_URL+"/friend-requests/sent", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSentRequests(res.data);
    } catch (err) {
      console.error("Error al cargar solicitudes enviadas:", err);
    }
  }; 

  // Ejecutar las tres funciones
  fetchFriends();
   fetchFriendRequests();
  fetchSentRequests(); 
}, []);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    setCurrentUserId(id);
  }, []);

   // Función para verificar si un usuario ya es amigo
  const isAlreadyFriend = (userId) => {
    return friends.some(friend => friend._id === userId);
  };
  // Función para verificar si ya se envió una solicitud a este usuario
  const hasSentRequest = (userId) => {
    return sentRequests.some(request => 
      request.receiverId === userId || request.receiverId?._id === userId
    );
  };

  // Función para verificar si hay una solicitud pendiente de este usuario
  const hasReceivedRequest = (userId) => {
    return friendRequests.some(request => 
      request.senderId === userId || request.senderId?._id === userId
    );
  };

  // Función de búsqueda optimizada con filtrado
  const performSearch = useCallback(async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const result = await axios.get(GATEWAY_URL+"/users");
      const users = result.data
        .filter(user => user._id !== currentUserId) // Excluir usuario actual
        .filter(user => 
          user.name.toLowerCase().startsWith(term.toLowerCase()) ||
          user.surname.toLowerCase().startsWith(term.toLowerCase()) ||
          user.email.split('@')[0].toLowerCase().includes(term.toLowerCase())
        )
        .filter(user => !isAlreadyFriend(user._id)) // Excluir amigos existentes
        .filter(user => !hasSentRequest(user._id)) // Excluir usuarios con solicitudes enviadas
        .filter(user => !hasReceivedRequest(user._id)); // Excluir usuarios con solicitudes recibidas

      setSearchResults(users);
    } catch (error) {
      console.error("Error en búsqueda:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, friends, sentRequests, friendRequests]);

  // Debounce para la búsqueda en tiempo real
  useEffect(() => {
    if (activeTab !== 'search') return;

    const debounceTimer = setTimeout(() => {
      performSearch(searchTerm);
    }, 300); // 300ms de delay

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, performSearch, activeTab]);

  // Buscar usuarios (mantener para compatibilidad)
  const handleSearch = async () => {
    performSearch(searchTerm);
  };

  // Manejar cambio en el input de búsqueda
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Enviar solicitud de amistad
  const sendFriendRequest = async (userId) => {
    try {
      await axios.post(GATEWAY_URL+"/send-friend-request",
        { senderId: currentUserId, receiverId: userId },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      const user = searchResults.find(u => u._id === userId);
      setSentRequests(prev => [...prev, {
        id: Date.now(),
        receiverId: user,
        createdAt: new Date().toISOString().split('T')[0]
      }]);
      
      setSearchResults(prev => prev.filter(u => u._id !== userId));
      toast.success('Solicitud enviada correctamente');
    } catch (error) {
      toast.error('Error al enviar solicitud');
    }
  };

  // Aceptar solicitud
  const acceptRequest = async (requestId) => {
    try {
      const request = friendRequests.find(r => r._id === requestId);
      
      await axios.put(GATEWAY_URL+`/friend-requests/${requestId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // El senderId ya viene populado con los datos del usuario
      setFriends(prev => [...prev, request.senderId]);
      setFriendRequests(prev => prev.filter(r => r._id !== requestId));
      
      toast.success('Solicitud aceptada');
    } catch (error) {
      toast.error('Error al aceptar solicitud');
    }
  };

  // Rechazar solicitud
  const rejectRequest = async (requestId) => {
    try {
      await axios.put(GATEWAY_URL+`/friend-requests/${requestId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFriendRequests(prev => prev.filter(r => r._id !== requestId));
      toast.success('Solicitud rechazada');
    } catch (error) {
      toast.error('Error al rechazar solicitud');
    }
  };

  // Eliminar amigo
  const removeFriend = async (friendId) => {
    const friend = friends.find(f => f._id === friendId);
    
    const result = await Swal.fire({
      title: '¿Eliminar amigo?',
      text: `¿Estás seguro de que quieres eliminar a ${friend?.name} ${friend?.surname} de tu lista de amigos?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      footer: '<small>Esta acción no se puede deshacer</small>'
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(GATEWAY_URL+`/friends/${friendId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFriends(prev => prev.filter(f => f._id !== friendId));
        
        Swal.fire({
          title: '¡Amigo eliminado!',
          text: `${friend?.name} ha sido eliminado de tu lista de amigos`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        
      } catch (error) {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo eliminar el amigo. Inténtalo de nuevo.',
          icon: 'error'
        });
      }
    }
  };

  return (
   
      <div className="friends-container">
        <div className="header-section">
          <h1 className="header-title">Gestión de Amigos</h1>
          <p className="friend-header-subtitle">
            Conecta con otros usuarios y comparte tus experiencias financieras de manera segura
          </p>
        </div>

        <div className="tabs-container">
          <button
            onClick={() => setActiveTab('friends')}
            className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
          >
            <Users size={18} />
            Mis amigos
            <span className="badge">{friends.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
          >
            <Bell size={18} />
            Solicitudes
            <span className="badge">{friendRequests.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
          >
            <Search size={18} />
            Buscar amigos
          </button>
        </div>

        <div className="content-section">
          {activeTab === 'friends' && (
            <div>
              <h2 className="section-title">
                <Users size={24} />
                Mis amigos
              </h2>
              {friends.length === 0 ? (
                <div className="empty-state">
                  <Users className="empty-state-icon" size={80} />
                  <h3>Aún no tienes amigos agregados</h3>
                  <p>¡Comienza a buscar usuarios y envía solicitudes de amistad para construir tu red!</p>
                </div>
              ) : (
                <div className="cards-grid">
                  {friends.map(friend => (
                    <div key={friend._id} className="friend-card">
                      <div className="card-content">
                        <div className="avatar">{friend.avatar}</div>
                       
                          <div className="user-name">{friend.name} {friend.surname}</div>
                          <div className="user-email">
                            <Mail size={14} />
                            {friend.email}
                         
                        </div>
                        <div className="card-actions">
                          <button
                            className="action-button delete-btn"
                            onClick={() => removeFriend(friend._id)}
                            title="Eliminar amigo"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div>
              <h2 className="section-title">
                <Bell size={24} />
                Solicitudes de Amistad
              </h2>
              
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 className="subsection-title">Solicitudes recibidas</h3>
                {friendRequests.length === 0 ? (
                  <div className="empty-state">
                    <Bell className="empty-state-icon" size={60} />
                    <h3>No tienes solicitudes pendientes</h3>
                    <p>Las nuevas solicitudes de amistad aparecerán aquí</p>
                  </div>
                ) : (
                  <div className="requests-list">
                    {friendRequests.map(request => (
                      <div key={request._id} className="request-card request-received">
                        <div className="card-content">
                          <div className="avatar">{request.senderId?.avatar}</div>
                          <div className="user-info">
                            <div className="user-name">
                              {request.senderId?.name} {request.senderId?.surname}
                            </div>
                            <div className="user-email">
                              <Mail size={14} />
                              {request.senderId?.email}
                            </div>
                            <div className="user-date">
                              Enviada el {new Date(request.createdAt).toLocaleDateString('es-ES')}
                            </div>
                          </div>
                          <div className="card-actions">
                            <button
                              className="action-button accept-btn"
                              onClick={() => acceptRequest(request._id)}
                              title="Aceptar solicitud"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              className="action-button reject-btn"
                              onClick={() => rejectRequest(request._id)}
                              title="Rechazar solicitud"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="subsection-title">Solicitudes enviadas</h3>
                {sentRequests.length === 0 ? (
                  <div className="empty-state">
                    <UserPlus className="empty-state-icon" size={60} />
                    <h3>No has enviado solicitudes</h3>
                    <p>Las solicitudes que envíes aparecerán aquí</p>
                  </div>
                ) : (
                  <div className="requests-list">
                    {sentRequests.map(request => (
                      <div key={request.id} className="request-card request-sent">
                        <div className="card-content">
                          <div className="avatar">{request.receiverId?.avatar}</div>
                          <div className="user-info">
                            <div className="user-name">
                              {request.receiverId?.name} {request.receiverId?.surname}
                            </div>
                            <div className="user-email">
                              <Mail size={14} />
                              {request.receiverId?.email}
                            </div>
                            <div className="user-date">Enviada el {new Date(request.createdAt).toLocaleDateString('es-ES')}</div>
                          </div>
                          <div className="card-actions">
                            <span className="status-badge">Pendiente</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <div>
              <h2 className="section-title">
                <Search size={24} />
                Buscar nuevos amigos
              </h2>
              
              <div className="search-section">
                <div className="search-container">
                  <div className="search-input-group">
                    <label htmlFor="search-friends-input" className="search-label">
                      Buscar usuarios:
                    </label>
                    <div className="search-input-wrapper">
                    <Search className="search-icon" />
                    <input
                      id="search-friends-input"
                      type="text"
                      placeholder="Buscar por nombre, apellido o email..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="search-input"
                    />
                 
                    {loading && <div className="search-loading">🔍</div>}
                  </div>
                   </div>
                  <button
                    onClick={handleSearch}
                    disabled={loading || !searchTerm.trim()}
                    className="search-button"
                  >
                    {loading ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div>
                  <h3 className="subsection-title">Resultados de búsqueda</h3>
                  <div className="cards-grid">
                    {searchResults.map(user => (
                      <div key={user._id} className="friend-card">
                        <div className="card-content">
                          <div className="avatar">{user.avatar}</div>
                          <div className="user-info">
                            <div className="user-name">{user.name} {user.surname}</div>
                            <div className="user-email">
                              <Mail size={14} />
                              {user.email}
                            </div>
                          </div>
                          <div className="card-actions">
                            <button
                              onClick={() => sendFriendRequest(user._id)}
                              className="add-friend-btn"
                            >
                              <UserPlus size={16} />
                              Agregar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchTerm && searchResults.length === 0 && !loading && (
                <div className="empty-state">
                  <Search className="empty-state-icon" size={80} />
                  <h3>No se encontraron usuarios</h3>
                  <p>Intenta con otro término de búsqueda o verifica la ortografía</p>
                </div>
              )}
            </div>
          )}
        </div>
        <Footer/>
      </div>
    
  );
};

export default FriendsSystem;