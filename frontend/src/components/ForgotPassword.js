import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; 

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await axios.post("http://localhost:4000/forgot-password", { email });
      setMessage(res.data.message); // Mensaje de éxito (ej. "Revisa tu correo para restablecer la contraseña.")
      setTimeout(() => navigate("/login"), 5000); // Redirigir al login después de 5 segundos
    } catch (err) {
      setError(err.response?.data?.error || "Hubo un problema con la solicitud.");
    }
  };

  return (
    <div className="form-container">
      <nav className="navbar">
        <h1 className="logo">📘 Gestor de Finanzas</h1>
      </nav>

      <div className="login-card">
        <h2>Olvidé mi Contraseña</h2>
        <p className="subtitle">Ingresa tu correo electrónico para recibir un enlace de restablecimiento.</p>

        {error && <div className="alert alert-danger text-center">{error}</div>}
        {message && <div className="alert alert-success text-center">{message}</div>}

        <form onSubmit={handleSubmit}>
          <label>Correo Electrónico</label>
          <input 
            type="email" 
            name="email" 
            className="form-control"
            placeholder="Correo Electrónico" 
            value={email} 
            onChange={handleChange} 
            required 
          />

          <button type="submit" className="btn primary full-width">Enviar enlace</button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
