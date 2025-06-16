import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Check, X, Users, Bell, Trash2, Mail } from 'lucide-react';
import axios from "axios";

const FriendsSystem = () => {
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
      console.error("No hay token disponible");
      return;
    }

    const fetchFriends = async () => {
      try {
        const res = await axios.get("http://localhost:4000/friends", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFriends(res.data);
      } catch (err) {
        console.error("Error al cargar amigos:", err);
      }
    };

    const fetchFriendRequests = async () => {
      try {
        const res = await axios.get("http://localhost:4000/friend-requests/received", {
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
      const res = await axios.get("http://localhost:4000/friend-requests/sent", {
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
    console.log("id del usuario autenticado" + id);
    setCurrentUserId(id);
  }, []);

  // Función para obtener datos de usuario por ID (con cache)
  const getUserById = async (userId) => {
    // Si ya tenemos el usuario en cache, lo devolvemos
    if (usersCache[userId]) {
      return usersCache[userId];
    }

    try {
      const res = await axios.get(`http://localhost:4000/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Guardamos en cache
      setUsersCache(prev => ({
        ...prev,
        [userId]: res.data
      }));
      
      return res.data;
    } catch (error) {
      console.error("Error al obtener usuario:", error);
      return {
        _id: userId,
        name: "Usuario desconocido",
        email: "email@desconocido.com",
        avatar: "👤"
      };
    }
  };

  // Buscar usuarios
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const result = await axios.get("http://localhost:4000/users");
      const users = result.data
        .filter(user => user._id !== currentUserId) 
        .filter(user => 
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      setSearchResults(users);
    } catch (error) {
      console.error("Error en búsqueda:", error);
    } finally {
      setLoading(false);
    }
  };

  // Enviar solicitud de amistad
  const sendFriendRequest = async (userId) => {
    try {
      console.log('Enviando solicitud a usuario:', userId);
      await axios.post("http://localhost:4000/send-friend-request",
        { senderId: currentUserId, receiverId: userId },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      const user = searchResults.find(u => u._id === userId);
      setSentRequests(prev => [...prev, {
        id: Date.now(),
        receiverId: user,
        created_at: new Date().toISOString().split('T')[0]
      }]);
      
      setSearchResults(prev => prev.filter(u => u._id !== userId));
      alert('Solicitud enviada correctamente');
    } catch (error) {
      console.error("❌ Error al enviar solicitud:", error);
      alert('Error al enviar solicitud');
    }
  };

  // Aceptar solicitud
  const acceptRequest = async (requestId) => {
    try {
      const request = friendRequests.find(r => r._id === requestId);
      
      await axios.put(`http://localhost:4000/friend-requests/${requestId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // El senderId ya viene populado con los datos del usuario
      setFriends(prev => [...prev, request.senderId]);
      setFriendRequests(prev => prev.filter(r => r._id !== requestId));
      
      alert('Solicitud aceptada');
    } catch (error) {
      console.error('Error al aceptar solicitud:', error);
      alert('Error al aceptar solicitud');
    }
  };

  // Rechazar solicitud
  const rejectRequest = async (requestId) => {
    try {
      await axios.put(`http://localhost:4000/friend-requests/${requestId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFriendRequests(prev => prev.filter(r => r._id !== requestId));
      alert('Solicitud rechazada');
    } catch (error) {
      console.error('Error al rechazar solicitud:', error);
      alert('Error al rechazar solicitud');
    }
  };

  // Eliminar amigo
  const removeFriend = async (friendId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este amigo?')) {
      try {
        await axios.delete(`http://localhost:4000/friends/${friendId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFriends(prev => prev.filter(f => f._id !== friendId));
        alert('Amigo eliminado');
      } catch (error) {
        console.error('Error al eliminar amigo:', error);
        alert('Error al eliminar amigo');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestión de Amigos</h1>
        <p className="text-gray-600">Conecta con otros usuarios y comparte tus finanzas</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex items-center px-4 py-2 rounded-md transition-colors ${
            activeTab === 'friends' 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Users className="w-4 h-4 mr-2" />
          Mis Amigos ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center px-4 py-2 rounded-md transition-colors ${
            activeTab === 'requests' 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Bell className="w-4 h-4 mr-2" />
          Solicitudes ({friendRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center px-4 py-2 rounded-md transition-colors ${
            activeTab === 'search' 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Search className="w-4 h-4 mr-2" />
          Buscar Amigos
        </button>
      </div>

      {/* Contenido según tab activo */}
      {activeTab === 'friends' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Mis Amigos</h2>
          {friends.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Aún no tienes amigos agregados</p>
              <p className="text-sm">¡Busca usuarios y envía solicitudes de amistad!</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {friends.map(friend => (
                <div key={friend._id} className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{friend.avatar || '👤'}</div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{friend.name} {friend.surname}</h3>
                        <p className="text-sm text-gray-600">{friend.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFriend(friend._id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded"
                      title="Eliminar amigo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Solicitudes de Amistad</h2>
          
          {/* Solicitudes recibidas */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 text-gray-700">Solicitudes Recibidas</h3>
            {friendRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No tienes solicitudes pendientes</p>
            ) : (
              <div className="space-y-3">
                {friendRequests.map(request => (
                  <div key={request._id} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{request.senderId?.avatar || '👤'}</div>
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            {request.senderId?.name} {request.senderId?.surname}
                          </h4>
                          <p className="text-sm text-gray-600">{request.senderId?.email}</p>
                          <p className="text-xs text-gray-500">
                            Enviada el {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => acceptRequest(request._id)}
                          className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-colors"
                          title="Aceptar"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => rejectRequest(request._id)}
                          className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                          title="Rechazar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Solicitudes enviadas */}
          <div>
            <h3 className="text-lg font-medium mb-3 text-gray-700">Solicitudes Enviadas</h3>
            {sentRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No has enviado solicitudes</p>
            ) : (
              <div className="space-y-3">
                {sentRequests.map(request => (
                  <div key={request.id} className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{request.receiverId?.avatar || '👤'}</div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          {request.receiverId?.name} {request.receiverId?.surname}
                        </h4>
                        <p className="text-sm text-gray-600">{request.receiverId?.email}</p>
                        <p className="text-xs text-gray-500">Enviada el {request.createdAt}</p>
                      </div>
                      <div className="ml-auto">
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                          Pendiente
                        </span>
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
          <h2 className="text-xl font-semibold mb-4">Buscar Nuevos Amigos</h2>
          
          {/* Buscador */}
          <div className="mb-6">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading || !searchTerm.trim()}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>

          {/* Resultados */}
          {searchResults.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Resultados de búsqueda</h3>
              <div className="space-y-3">
                {searchResults.map(user => (
                  <div key={user._id} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{user.avatar || '👤'}</div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{user.name} {user.surname}</h4>
                          <p className="text-sm text-gray-600 flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => sendFriendRequest(user._id)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Agregar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchTerm && searchResults.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No se encontraron usuarios</p>
              <p className="text-sm">Intenta con otro término de búsqueda</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FriendsSystem;