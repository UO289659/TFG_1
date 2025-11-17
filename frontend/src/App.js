import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Hero from "./components/Hero";
import Login from "./components/Login";
import Register from "./components/Register";
import Track from "./components/Track";
import Navbar from "./components/Navbar";
import Profile from "./components/Profile"
import SelectPlan from "./components/SelectPlan";
import Subscribe from "./components/Subscribe";
import Contact from "./components/Contact";
import ConfigurarCategorias from "./components/ConfigurarCategorias";
import HelpPage from "./components/Help";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import ExportTransactions from "./components/ExportTransactions";
import { UserProvider, useUserContext } from './context/UserContext';
import FriendsSystem from "./components/Friends";
import { Toaster } from 'react-hot-toast';
import { SocketProvider, useSocket } from './socket/useSocket';
import SubscriptionListener from './socket/SubscriptionListener';
import ProtectedRoute, { PremiumRoute } from './ProtectedRoute';

function AppWrapper() {
  const location = useLocation();

  // Función para determinar si mostrar la Navbar
  const shouldShowNavbar = () => {
    const { pathname } = location;
    
    // Rutas exactas donde NO queremos mostrar la Navbar
    const exactNoNavbarRoutes = ["/", "/login", "/register", "/forgot-password"];
    
    // Verificar rutas exactas
    if (exactNoNavbarRoutes.includes(pathname)) {
      return false;
    }
    
    // Verificar si es una ruta de reset-password con token
    if (pathname.startsWith("/reset-password/")) {
      return false;
    }
    
    // Por defecto, mostrar la Navbar
    return true;
  };

  return (
    <>
      {shouldShowNavbar() && <Navbar />}
      <div className="main-content">
        <Routes>
          {/* Rutas públicas (solo accesibles sin autenticación) */}
          <Route path="/" element={<Hero />} />
          <Route 
            path="/register" 
            element={
                <Register />
            } 
          />
          <Route 
            path="/login" 
            element={
                <Login />
            } 
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          {/* Rutas protegidas (requieren autenticación) */}
          <Route 
            path="/track" 
            element={
              <ProtectedRoute>
                <Track />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/select-plan" 
            element={
              <ProtectedRoute>
                <SelectPlan />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/subscribe" 
            element={
              <ProtectedRoute>
                <Subscribe />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/contact" 
            element={
              <ProtectedRoute>
                <Contact />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/categories" 
            element={
              <ProtectedRoute>
                <ConfigurarCategorias />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/help" 
            element={
              <ProtectedRoute>
                <HelpPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Rutas premium (requieren autenticación + suscripción premium) */}
          <Route 
            path="/export-transactions" 
            element={
              <PremiumRoute>
                <ExportTransactions />
              </PremiumRoute>
            } 
          />
          <Route 
            path="/friends" 
            element={
              <PremiumRoute>
                <FriendsSystem />
              </PremiumRoute>
            } 
          />
        </Routes>
      </div>
    </>
  );
}

function SocketManager() {
  const { connectSocket, disconnectSocket, isConnected } = useSocket();
  const { user } = useUserContext();

  useEffect(() => {
    console.log('🔍 SocketManager - Debug info:');
    console.log('- User:', user);
    console.log('- User ID:', user?._id);
    console.log('- User email:', user?.email);
    console.log('- User isPremium:', user?.isPremium);

    // Obtener token del localStorage
    const token = localStorage.getItem('token');
    console.log('- Token exists:', !!token);
    console.log('- Token preview:', token ? `${token.substring(0, 20)}...` : 'No token');
    
    // Conectar automáticamente cuando hay token y usuario
    if (token && user) {
      console.log('🔌 Conectando socket para usuario:', user.email);
      connectSocket(token);
    } else {
      // Desconectar si no hay token/usuario
      disconnectSocket();
    }

    // Cleanup al desmontar
    return () => {
      disconnectSocket();
    };
  }, [user, connectSocket, disconnectSocket]);

  // Mostrar estado de conexión (opcional, para debugging)
  useEffect(() => {
    if (isConnected) {
      console.log('✅ Socket conectado');
    } else {
      console.log('❌ Socket desconectado');
    }
  }, [isConnected]);

  return null;
}

function App() {
  return (
    <UserProvider>
      <SocketProvider>
        <SocketManager />
        <SubscriptionListener />
        <Router>
          <AppWrapper />
          <Toaster />
        </Router>
      </SocketProvider>
    </UserProvider>
  );
}

export default App;