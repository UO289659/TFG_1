import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { User, Mail, Shield, Key, Check, Star, Crown, Settings, Edit3, Save, X, AlertCircle } from "lucide-react";
import "./Profile.css"
import PlanCard from "./PlanCard";
import { useNavigate } from "react-router-dom";
import Footer from "./Footer";
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useUserContext} from "../context/UserContext"; 


const Profile = () => {
  //const GATEWAY_URL = 'https://gateway-tfg.azure-api.net/users' || 'http://localhost:4000';
  const GATEWAY_URL = process.env.REACT_APP_GATEWAY_URL;
  const navigate = useNavigate();
  
  // Usar el contexto de usuario con manejo de errores
  let userContext;
  try {
    userContext = useUserContext();
  } catch (error) {
    return (
      <div className="loading-container">
        <div className="alert alert-danger">
          <AlertCircle size={20} className="me-2" />
          Error: Inténtelo más tarde
        </div>
      </div>
    );
  }
  
  const { user, login } = userContext;
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
        setError(""); // Limpiar errores previos
        const token = localStorage.getItem("token");

        const response = await axios.get(GATEWAY_URL+"/profile", {
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem("token");
      
      await axios.put(GATEWAY_URL+"/profile", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUserData(prev => ({
      ...prev,
      name: formData.name,
      surname: formData.surname,
      // email no se actualiza porque está deshabilitado
    }));

     toast.success('Perfil actualizado con éxito', {
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#10b981',
          color: 'white',
        },
        iconTheme: {
          primary: 'white',
          secondary: '#10b981',
        },
      });
    } catch (err) {
      // Mostrar toast de error
      toast.error(err.response?.data?.message || "Error al actualizar perfil", {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#ef4444',
          color: 'white',
        },
        iconTheme: {
          primary: 'white',
          secondary: '#ef4444',
        },
      });
    }
  };

  const handlePasswordInputChange = (e) => {
    setPasswordData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.repeatNewPassword) {
       toast.error("Las contraseñas no coinciden", {
        duration: 3000,
        position: 'top-right',
      });
      return;
    }

    const passwordRegex = /^(?=.*\d).{8,}$/;
    if (!passwordRegex.test(passwordData.newPassword)) {
      toast.error("La contraseña debe tener al menos 8 caracteres y contener al menos un número.", {
        duration: 4000,
        position: 'top-right',
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await axios.put(GATEWAY_URL+"/password", {
        actualPassword: passwordData.actualPassword,
        newPassword: passwordData.newPassword,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Mostrar toast de éxito
      toast.success('Contraseña actualizada con éxito', {
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#10b981',
          color: 'white',
        },
        iconTheme: {
          primary: 'white',
          secondary: '#10b981',
        },
      });
      setPasswordData({
        actualPassword: "",
        newPassword: "",
        repeatNewPassword: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al actualizar contraseña", {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#ef4444',
          color: 'white',
        },
        iconTheme: {
          primary: 'white',
          secondary: '#ef4444',
        },
      });
    }
  };

  // Función para mostrar confirmación de cancelación con SweetAlert2
  const handleUnsubscribe = async () => {
    const result = await Swal.fire({
      title: '¿Cancelar suscripción Premium?',
      html: `
        <div class="text-start">
          <p><strong>Perderás acceso a:</strong></p>
          <ul class="text-muted">
            <li>Funciones avanzadas</li>
            <li>Soporte prioritario</li>
            <li>Características premium exclusivas</li>
          </ul>
          <p class="text-muted mt-3">Tu plan se cambiará inmediatamente a básico.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, cancelar suscripción',
      cancelButtonText: 'No, mantener Premium',
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup: 'swal2-popup-custom',
        title: 'swal2-title-custom',
        htmlContainer: 'swal2-html-custom'
      }
    });

    if (result.isConfirmed) {
      await handleConfirmUnsubscribe();
    }
  };

  // Función para confirmar la cancelación de suscripción
  const handleConfirmUnsubscribe = async () => {
    try {
      // Mostrar loading
      Swal.fire({
        title: 'Procesando...',
        text: 'Cambiando tu plan a básico',
        icon: 'info',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const token = localStorage.getItem("token");
      
      const response= await axios.post(GATEWAY_URL+"/cancel-subscription",
        {}, // cuerpo vacío (o null)
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
          
      // Mostrar éxito
      await Swal.fire({
        title: '¡Listo!',
        text: 'Tu plan se cambiará cuando llegue tu fecha de expiración',
        icon: 'success',
        confirmButtonColor: '#28a745',
        timer: 2000,
        timerProgressBar: true
      });
      
    } catch (error) {
      
      // Mostrar error
      await Swal.fire({
        title: 'Error',
        text: 'Hubo un problema al cambiar tu plan. Por favor, intenta nuevamente.',
        icon: 'error',
        confirmButtonColor: '#dc3545'
      });
    }
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
                  {user.isPremium && (
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
                    {user.isPremium ? (
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
                  isSelected={!user.isPremium}
                  onSelect={() => {
                    if (isPremium) {
                      handleUnsubscribe();
                    }
                  }}
                />
              </div>
              <div className="col-md-6">
                <PlanCard 
                  type="premium" 
                  isSelected={user.isPremium}
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
                  <h2 className="h4 mb-0">Información personal</h2>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="name" className="form-label fw-semibold">Nombre </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      className="form-control form-control-modern"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                   
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="surname" className="form-label fw-semibold">Apellido  </label>
                    <input
                      id="surname"
                      name="surname"
                      type="text"
                      className="form-control form-control-modern"
                      value={formData.surname}
                      onChange={handleChange}
                      required
                    />
                  
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="email" className="form-label fw-semibold">Email</label>
                    <input
                      id="email"
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
                  <h2 className="h4 mb-0">Cambiar contraseña</h2>
                </div>

                <form onSubmit={handlePasswordChange}>
                  <div className="mb-3">
                    <label htmlFor="actualPassword" className="form-label fw-semibold">Contraseña actual</label>
                    <input
                      id="actualPassword"
                      name="actualPassword"
                      type="password"
                      className="form-control form-control-modern"
                      value={passwordData.actualPassword}
                      onChange={handlePasswordInputChange}
                      required
                    />
                    
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="newPassword" className="form-label fw-semibold">Nueva contraseña </label>
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      className="form-control form-control-modern"
                      value={passwordData.newPassword}
                      onChange={handlePasswordInputChange}
                      required
                    />
                   
                  </div>
                  
                  <div className="mb-4">
                    <label htmlfor="repeatNewPassword" className="form-label fw-semibold">Confirmar nueva contraseña </label>
                    <input
                      id="repeatNewPassword"
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
                    Actualizar contraseña
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