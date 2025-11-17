import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import Footer from "./Footer";
import toast, { Toaster } from 'react-hot-toast';

const ResetPassword = () => {
  //const GATEWAY_URL = 'https://gateway-tfg.azure-api.net/users' || 'http://localhost:4000';
  const GATEWAY_URL = process.env.REACT_APP_GATEWAY_URL;
  const { token } = useParams(); // Obtener el token de la URL
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    const passwordRegex = /^(?=.*\d).{8,}$/; // mínimo 8 caracteres y al menos un número

    if (!passwordRegex.test(password)) {
      toast.error("La contraseña debe tener al menos 8 caracteres y contener al menos un número.");
      return;
    }

    try {
      const res = await axios.post(GATEWAY_URL+`/reset-password/${token}`, {
        password,
      });

      setMessage(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.error || "Hubo un problema al restablecer la contraseña.");
    }
  };

  return (
    <>
    <div className="form-container">
      <div className="login-card">
        <h2>Restablecer Contraseña</h2>
        {message && <div className="alert alert-success text-center">{message}</div>}

        <form onSubmit={handleSubmit}>
          <label>Nueva Contraseña</label>
          <input
            type="password"
            placeholder="Nueva Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <label>Confirmar Contraseña</label>
          <input
            type="password"
            placeholder="Confirmar Contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button type="submit" className="btn primary full-width">Restablecer Contraseña</button>
        </form>
      </div>
    </div>
    <Footer className={"footer-forgot-password"}/>
    </>
  );
};

export default ResetPassword;
