// components/Navbar.js
import React , { useContext }from "react";
import "./Navbar.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { UserContext } from '../context/UserContext';

const Navbar = () => {
  const { user, logout } = useContext(UserContext);
  const location = useLocation();
  const navigate = useNavigate();
 
  const handleLogout = () => {
    logout();            // limpia token y user en el contexto
    navigate('/login');  // redirige al login
  };

console.log('Navbar user:', user);
  return (
   
    <nav className="navbar">
      <ul className="navbar-list">
        <li><Link to="/">Inicio</Link></li>
        <li><Link to="/track">Track</Link></li>
        <li><Link to="/profile">Perfil</Link></li>
         <li><Link to="/categories">Categorias</Link></li>
         <li><Link to="/contact">Contacto</Link></li>
         <li><Link to="/help">Ayuda</Link></li>
          {user.isPremium && (
          <li><a href="/export-transactions">Exportar Transacciones</a></li>
        )}
        
        {user.isPremium && (
          <li><a href="/friends">Amigos</a></li>
        )}
         {/* Si el usuario está logueado (email existe), mostramos Cerrar sesión */}
        {user.email && (
          <li>
            <button onClick={handleLogout} className="logout-button">
              Cerrar sesión
            </button>
          </li>
          )}
      </ul>
    </nav>
  );
};

export default Navbar;
