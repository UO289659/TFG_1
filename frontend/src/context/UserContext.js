// src/context/UserContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. Crea el contexto
export const UserContext = createContext();

// 2. Provider
export function UserProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState({ isPremium: false, email: null, _id:null });

  useEffect(() => {
    if (!token) {
      setUser({ isPremium: false, email: null, _id:null });
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const id = payload.userId || payload.id || null;

      setUser({
        isPremium: !!payload.isPremium,
        email: payload.email || null,
        _id: id
      });
        // Guardar userId en localStorage
      localStorage.setItem('userId', id);
    } catch {
      setUser({ isPremium: false, email: null, _id: null});
    }
  }, [token]);

  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };
  const logout = () => {
    localStorage.removeItem('token');
     localStorage.removeItem('userId');
    setToken(null);
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

// 3. Exporta el hook para consumir el contexto
export function useUserContext() {
  return useContext(UserContext);
}
