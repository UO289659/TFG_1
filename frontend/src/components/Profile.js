import React, { useEffect, useState } from "react";
import axios from "axios";
import { User, Mail, Shield, Key, Check, Star, Crown, Settings, Edit3, Save, X } from "lucide-react";
import "./Profile.css"
import PlanCard from "./PlanCard";

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        const token = localStorage.getItem("token");

        const response = await axios.get("http://localhost:4000/profile", {
           headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUserData(response.data);
        setFormData({
          name: response.data.name || "",
          surname:response.data.surname || "",
          email: response.data.email || "",
        });
      } catch (err) {
        setError("Error al cargar datos del usuario.");
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      console.log("token en profile.js: "+token);
      await axios.put("http://localhost:4000/profile", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Perfil actualizado con éxito");
    } catch (err) {
      alert("Error al actualizar perfil");
    }
  };

  if (loading) return <p>Cargando perfil...</p>; //ESTO IGUAL HAY QUE QUITARLO
  if (error) return <p>{error}</p>;

  const handlePasswordInputChange = (e) => {
  setPasswordData((prev) => ({
    ...prev,
    [e.target.name]: e.target.value,
  }));
};


  const handlePasswordChange = async (e) => { //está sin hacer
    e.preventDefault();
     if (passwordData.newPassword !== passwordData.repeatNewPassword) {
      alert("Las contraseñas no coinciden");
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

      alert("Perfil actualizado con éxito");
      setPasswordData({
        actualPassword: "",
        newPassword: "",
        repeatNewPassword: "",
      });
    } catch (err) {
      alert("Error al actualizar perfil");
    }
  };

   const handleUpgrade = () => {
    alert("Redirigiendo al proceso de suscripción...");
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
        <div className="alert alert-danger">
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
              <PlanCard type="basic" isSelected={!isPremium} isProfile={true} onSelect={() => {}} />
            </div>
            <div className="col-md-6">
              <PlanCard type="premium" isSelected={isPremium} isProfile={true} onSelect={handleUpgrade} />
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
                  className="gradient-btn-green d-flex align-items-center justify-content-center"
                >
                  <Key size={20} className="me-2" />
                  Actualizar Contraseña
                </button>
                </form>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default Profile;