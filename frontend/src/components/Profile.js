import React, { useEffect, useState } from "react";
import axios from "axios";
import { User, Mail, Shield, Key, Check, Star, Crown, Settings, Edit3, Save, X, AlertCircle } from "lucide-react";
import "./Profile.css"
import PlanCard from "./PlanCard";
import { useNavigate } from "react-router-dom";
import Footer from "./Footer";

const Profile = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Estados para errores específicos
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
  });

  const [passwordData, setPasswordData] = useState({
    actualPassword: "",
    newPassword: "",
    repeatNewPassword: "",
  });

  const isPremium = userData?.isPremium === 1 || userData?.isPremium === true;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(""); // Limpiar errores previos
        const token = localStorage.getItem("token");

        const response = await axios.get("http://localhost:4000/profile", {
           headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUserData(response.data);
        setFormData({
          name: response.data.name || "",
          surname: response.data.surname || "",
          email: response.data.email || "",
        });
      } catch (err) {
        console.error('Error al cargar datos del usuario:', err);
        setError(err.response?.data?.message || "Error al cargar datos del usuario.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    // Limpiar errores cuando el usuario empiece a escribir
    if (profileError) setProfileError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    
    try {
      const token = localStorage.getItem("token");
      console.log("token en profile.js: "+token);
      
      await axios.put("http://localhost:4000/profile", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProfileSuccess("Perfil actualizado con éxito");
      // Limpiar el mensaje de éxito después de 3 segundos
      setTimeout(() => setProfileSuccess(""), 3000);
    } catch (err) {
      console.error('Error al actualizar perfil:', err);
      setProfileError(err.response?.data?.message || "Error al actualizar perfil");
    }
  };

  const handlePasswordInputChange = (e) => {
    setPasswordData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    // Limpiar errores cuando el usuario empiece a escribir
    if (passwordError) setPasswordError("");
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordData.newPassword !== passwordData.repeatNewPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }

    const passwordRegex = /^(?=.*\d).{8,}$/;
    if (!passwordRegex.test(passwordData.newPassword)) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres y contener al menos un número.");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await axios.put("http://localhost:4000/password", {
        actualPassword: passwordData.actualPassword,
        newPassword: passwordData.newPassword,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPasswordSuccess("Contraseña actualizada con éxito");
      setPasswordData({
        actualPassword: "",
        newPassword: "",
        repeatNewPassword: "",
      });
      // Limpiar el mensaje de éxito después de 3 segundos
      setTimeout(() => setPasswordSuccess(""), 3000);
    } catch (err) {
      console.error('Error al actualizar contraseña:', err);
      setPasswordError(err.response?.data?.message || "Error al actualizar contraseña");
    }
  };

  const handleUpgrade = () => {
    navigate("/subscribe");
  };

  // Componente para mostrar alertas
  const AlertMessage = ({ message, type = "danger", onClose }) => {
    if (!message) return null;
    
    return (
      <div className={`alert alert-${type} alert-dismissible fade show`} role="alert">
        <AlertCircle size={16} className="me-2" />
        {message}
        {onClose && (
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            aria-label="Close"
          ></button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="text-muted">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-container">
        <div className="alert alert-danger d-flex align-items-center">
          <AlertCircle size={20} className="me-2" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="container-fluid fade-in">
          {/* Header Section */}
          <div className="gradient-header">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <div className="avatar-container me-4">
                  <User size={40} />
                  {isPremium && (
                    <div className="premium-badge">
                      <Crown size={16} />
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="h2 mb-2">{userData?.name} {userData?.surname}</h1>
                  <p className="mb-2 d-flex align-items-center opacity-75">
                    <Mail size={16} className="me-2" />
                    {userData?.email}
                  </p>
                  <div>
                    {isPremium ? (
                      <span className="premium-status-badge d-inline-flex align-items-center">
                        <Crown size={14} className="me-1" />
                        Premium
                      </span>
                    ) : (
                      <span className="status-badge">
                        Plan Básico
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Plans Section */}
          <div className="mb-5">
            <div className="section-header">
              <div className="section-icon">
                <Star size={24} />
              </div>
              <h2 className="h3 mb-0">Planes de Suscripción</h2>
            </div>
            
            <div className="row">
              <div className="col-md-6">
                <PlanCard 
                  type="basic" 
                  isSelected={!isPremium}
                  onSelect={() => {
                    if (isPremium) {
                      navigate("/unsubscribe");
                    }
                  }}
                />
              </div>
              <div className="col-md-6">
                <PlanCard 
                  type="premium" 
                  isSelected={isPremium}
                  onSelect={() => {
                    if (!isPremium) {
                      navigate("/subscribe");
                    }
                  }}
                />
              </div>
            </div>  
          </div>

          <div className="row">
            {/* Profile Form */}
            <div className="col-lg-6">
              <div className="professional-card">
                <div className="section-header">
                  <div className="section-icon">
                    <User size={24} />
                  </div>
                  <h2 className="h4 mb-0">Información Personal</h2>
                </div>

                {/* Alertas para el perfil */}
                <AlertMessage 
                  message={profileError} 
                  type="danger" 
                  onClose={() => setProfileError("")}
                />
                <AlertMessage 
                  message={profileSuccess} 
                  type="success" 
                  onClose={() => setProfileSuccess("")}
                />

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Nombre</label>
                    <input
                      name="name"
                      type="text"
                      className="form-control form-control-modern"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Apellido</label>
                    <input
                      name="surname"
                      type="text"
                      className="form-control form-control-modern"
                      value={formData.surname}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Email</label>
                    <input
                      name="email"
                      type="email"
                      className="form-control form-control-modern"
                      value={formData.email}
                      disabled={true}
                    />
                  </div>
                  
                  <button type="submit" className="btn btn-primary w-100">
                    Guardar cambios
                  </button>
                </form>
              </div>
            </div>

            {/* Password Form */}
            <div className="col-lg-6">
              <div className="professional-card">
                <div className="section-header">
                  <div className="section-icon">
                    <Key size={24} />
                  </div>
                  <h2 className="h4 mb-0">Cambiar Contraseña</h2>
                </div>

                {/* Alertas para la contraseña */}
                <AlertMessage 
                  message={passwordError} 
                  type="danger" 
                  onClose={() => setPasswordError("")}
                />
                <AlertMessage 
                  message={passwordSuccess} 
                  type="success" 
                  onClose={() => setPasswordSuccess("")}
                />

                <form onSubmit={handlePasswordChange}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Contraseña Actual</label>
                    <input
                      name="actualPassword"
                      type="password"
                      className="form-control form-control-modern"
                      value={passwordData.actualPassword}
                      onChange={handlePasswordInputChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Nueva Contraseña</label>
                    <input
                      name="newPassword"
                      type="password"
                      className="form-control form-control-modern"
                      value={passwordData.newPassword}
                      onChange={handlePasswordInputChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Confirmar Nueva Contraseña</label>
                    <input
                      name="repeatNewPassword"
                      type="password"
                      className="form-control form-control-modern"
                      value={passwordData.repeatNewPassword}
                      onChange={handlePasswordInputChange}
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                  >
                    <Key size={20} className="me-2" />
                    Actualizar Contraseña
                  </button>
                </form>
              </div>
            </div>
          </div>
      </div>
      <Footer/>
    </div>
  );
};

export default Profile;