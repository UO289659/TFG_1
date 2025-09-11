import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.css";
import Footer from "./Footer";

const Register = () => {
  const GATEWAY_URL = process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:4000';

  // 🔍 DEBUG - Agregar logs para ver qué está pasando
  console.log('🔍 Environment DEBUG:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('NEXT_PUBLIC_API_GATEWAY_URL:', process.env.REACT_APP_API_GATEWAY_URL);
  console.log('GATEWAY_URL final:', GATEWAY_URL);
  console.log('All NEXT_PUBLIC vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP')));

  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: "",
    apellido:"",
    email: "",
    password: "",
  });

  const [error, setError] = useState(""); 

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const password = formData.password;
    const passwordRegex = /^(?=.*\d).{8,}$/; // mínimo 8 caracteres y al menos un número

    if (!passwordRegex.test(password)) {
      setError("La contraseña debe tener al menos 8 caracteres y contener al menos un número.");
      return;
    }
    try {
      const res = await axios.post(GATEWAY_URL+"/register", formData);
       localStorage.setItem("token", res.data.token);
      navigate("/select-plan"); 
    } catch (error) {
      setError(error.response?.data?.error || "Hubo un error al registrarse. Inténtalo de nuevo.");
    }
  };

  return (
    <>
    <div className="form-container">
      <nav className="navbar navbar-light w-100 px-5">
        <h1 className="logo">📘 Gestor de Finanzas</h1>
      </nav>

      <div className="login-card" >
        <h2 className="text-center">Crear Cuenta 🔒</h2>
        {/* Mostrar mensaje de error si existe */}
        {error && <div className="alert alert-danger text-center">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label>Nombre</label>
            <input type="text" placeholder="Nombre" className="form-control" name="nombre" onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label >Apellido</label>
            <input type="text"  placeholder="Apellido" className="form-control" name="apellido" onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label >Correo Electrónico</label>
            <input type="email" placeholder="Correo Electrónico" className="form-control" name="email" onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label>Contraseña</label>
            <input type="password"  placeholder="Contraseña" className="form-control" name="password" onChange={handleChange} required />
          </div>
          <button type="submit" className="btn btn-primary w-100">Registrarse</button>
        </form>
      </div>
    </div>
     <Footer className={"footer-forgot-password"} />
     </>
  );
};

export default Register;
