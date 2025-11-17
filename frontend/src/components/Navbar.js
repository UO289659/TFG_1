// components/Navbar.js
import React, { useContext, useState } from "react";
import "./Navbar.css";
import { useLocation, useNavigate } from "react-router-dom";
import { UserContext } from '../context/UserContext';
import {Menu, X } from "lucide-react";
import SaldoSmartLogo from "./SaldoSmartLogo";

const Navbar = () => {
  const { user, logout } = useContext(UserContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
 
  const handleLogout = () => {
    logout();            // limpia token y user en el contexto
    navigate('/login');  // redirige al login
    setIsMenuOpen(false); // cierra el menú móvil
  };
  
  return (
    <nav className="navbar-professional">
      <div className="nav-content">
        {/* Logo section */}
        <div className="logo-container-new" onClick={() => navigate('/')}>
          { <SaldoSmartLogo size={45} /> }
          <h1 className="logo-text-new">SaldoSmart</h1>
        </div>
         {/* Menú de navegación */}
        <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <a className="nav-link" href="/track" >Transacciones</a> 
          <a className="nav-link" href="/profile" >Perfil</a>
          <a className="nav-link" href="/categories" >Categorías</a>
          <a className="nav-link" href="/contact" >Contacto</a>
          <a className="nav-link" href="/help" >Ayuda</a>
          
          {user.isPremium && (
            <a className="nav-link" href="/export-transactions">
              Exportar Transacciones
            </a>
          )}
          
          {user.isPremium && (
            <a className="nav-link" href="/friends" >Amigos</a>
          )}
          
          {/* Si el usuario está logueado (email existe), mostramos Cerrar sesión */}
          {user.email && (
            <button onClick={handleLogout} className="btn-primary-nav">
              Cerrar sesión
            </button>
          )}
        </div>

        {/* Botón móvil */}
          <button 
            className="mobile-menu-btn" aria-label="Abrir menú de navegación"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="menu-icon" /> : <Menu className="menu-icon" />}
          </button>
           </div>
       
        {/* Menú móvil */}
        {isMenuOpen && (
          <div className="mobile-menu">
          <a className="mobile-nav-link" href="/track" >Transacciones</a>
          <a className="mobile-nav-link" href="/profile" >Perfil</a>
          <a className="mobile-nav-link" href="/categories" >Categorias</a>
          <a className="mobile-nav-link" href="/contact" >Contacto</a>
          <a className="mobile-nav-link" href="/help" >Ayuda</a>
           {user.isPremium && (
            <a className="mobile-nav-link" href="/export-transactions">
              Exportar Transacciones
            </a>
          )}
          
          {user.isPremium && (
            <a className="mobile-nav-link" href="/friends" >Amigos</a>
          )}
          
          {/* Si el usuario está logueado (email existe), mostramos Cerrar sesión */}
          {user.email && (
            <div className="mobile-buttons">
            <button onClick={handleLogout} className="btn-primary-nav">
              Cerrar sesión
            </button>
            </div>
          )}
          </div>
        )}

       
     
    </nav>
  );
};

export default Navbar;