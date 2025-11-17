import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserContext } from './context/UserContext';

// Componente para rutas que requieren autenticación
const ProtectedRoute = ({ children }) => {
  const { user, token, loading } = useUserContext();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Cargando...
      </div>
    );
  }
  
  // Si no hay token o usuario, redirigir al login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Componente para rutas que requieren suscripción premium
export const PremiumRoute = ({ children }) => {
  const { user, token, loading } = useUserContext();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Cargando...
      </div>
    );
}
  // Primero verificar autenticación
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  
  // Verificar si tiene plan premium
  if (!user.isPremium) {
    console.log('Acceso denegado: usuario sin plan premium.', user.isPremium);
    return <Navigate to="/select-plan" replace />;
  }
  
  return children;
};

export default ProtectedRoute;