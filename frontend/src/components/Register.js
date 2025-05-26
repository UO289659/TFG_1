import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: "",
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
    try {
      const res = await axios.post("http://localhost:4000/register", formData);
      navigate("/bienvenida"); 
    } catch (error) {
      setError(error.response?.data?.error || "Hubo un error al registrarse. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex flex-column justify-content-center align-items-center bg-light">
      <nav className="navbar navbar-light w-100 px-5">
        <h1 className="navbar-brand">📘 Gestor de Finanzas</h1>
      </nav>

      <div className="card shadow p-4" style={{ width: "350px" }}>
        <h2 className="text-center">Crear Cuenta</h2>
        {/* Mostrar mensaje de error si existe */}
        {error && <div className="alert alert-danger text-center">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Nombre Completo</label>
            <input type="text" className="form-control" name="nombre" onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Correo Electrónico</label>
            <input type="email" className="form-control" name="email" onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Contraseña</label>
            <input type="password" className="form-control" name="password" onChange={handleChange} required />
          </div>
          <button type="submit" className="btn btn-primary w-100">Registrarse</button>
        </form>
      </div>
    </div>
  );
};

export default Register;
