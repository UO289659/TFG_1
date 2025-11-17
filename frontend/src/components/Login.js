import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom"; // Para la redirección
import axios from "axios";
import "./Login.css";
import { useUserContext } from '../context/UserContext';
import Footer from "./Footer";

const Login = () => {
  //const GATEWAY_URL = 'https://gateway-tfg.azure-api.net/users' || 'http://localhost:4000';
  const GATEWAY_URL = process.env.REACT_APP_GATEWAY_URL;
  const { login } = useUserContext();
  const navigate = useNavigate(); // Hook para redirigir al usuario
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      localStorage.removeItem("token");
      const res = await axios.post(GATEWAY_URL+"/login", formData);

      // Guardar el token en localStorage o sessionStorage
      login(res.data.token); 

      // Redirigir a la página de bienvenida
      navigate("/track");
    } catch (error) {
      setError("Correo o contraseña incorrectos.");
    }finally{
      setIsSubmitting(false);
    }
  };

   const handleBack = () => {
    navigate("/"); 
  };

  return (
    <>
    <div className="form-container">
      <nav className="navbar">
        <h1 className="logo">📘 Gestor de Finanzas</h1>
      </nav>

      <div className="login-card">
        <h2>Iniciar Sesión</h2>
        <p className="subtitle">Ingresa a tu cuenta para gestionar tus finanzas</p>

        <div className="icon-lock">🔒</div>

        {error && <div className="alert alert-danger text-center">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Correo Electrónico</label>
          <input type="email" name="email" placeholder="Correo Electrónico" onChange={handleChange} required />

          <label>Contraseña</label>
          <div className="password-container">
            <input type="password" name="password" placeholder="Contraseña" onChange={handleChange} required />
          </div>

          <button type="submit" className="btn primary full-width" >Iniciar Sesión</button>
          <button type="button" className="btn btn-secondary w-100 mt-3" onClick={handleBack} disabled={isSubmitting}>
            ← Volver atrás
          </button>
        </form>

        <div className="links">
          <a href="/forgot-password">¿Olvidaste tu contraseña?</a>
          <p>¿No tienes una cuenta? <a href="/register">Regístrate</a></p>
        </div>
      </div>
    </div>
    <Footer className={"footer-forgot-password"}/>
    </>
  );
};

export default Login;
