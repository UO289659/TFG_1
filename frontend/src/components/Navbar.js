// components/Navbar.js
import React from "react";
import "./Navbar.css";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <ul className="navbar-list">
        <li><Link to="/">Inicio</Link></li>
        <li><Link to="/track">Track</Link></li>
        <li><Link to="/profile">Perfil</Link></li>
         <li><Link to="/categories">Categorias</Link></li>
         <li><Link to="/contact">Contacto</Link></li>
         <li><Link to="/help">Ayuda</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar;
