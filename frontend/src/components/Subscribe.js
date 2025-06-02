import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  Crown, 
  CreditCard, 
  Shield, 
  CheckCircle, 
  ArrowLeft, 
  Lock,
  AlertCircle,
  Loader,
  Star,
  Zap,
  Users,
  Download
} from "lucide-react";
import "./Subscribe.css";

const Subscribe = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estados
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [userData, setUserData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [billingCycle, setBillingCycle] = useState("monthly");
  
  // Datos de la tarjeta
  const [cardData, setCardData] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: "",
    email: "",
  });

  // Precios
  const prices = {
    monthly: { amount: 9.99, currency: "EUR" },
    yearly: { amount: 99.99, currency: "EUR", savings: "17%" }
  };

  // Obtener datos del usuario
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get("http://localhost:4000/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setUserData(response.data);
        setCardData(prev => ({
          ...prev,
          email: response.data.email
        }));
      } catch (err) {
        setError("Error al cargar datos del usuario");
      }
    };

    fetchUserData();
  }, [navigate]);

  // Manejar cambios en los inputs de la tarjeta
  const handleCardInputChange = (e) => {
    let { name, value } = e.target;
    
    // Formatear número de tarjeta
    if (name === "number") {
      value = value.replace(/\D/g, "").substring(0, 16);
      value = value.replace(/(\d{4})(?=\d)/g, "$1 ");
    }
    
    // Formatear fecha de expiración
    if (name === "expiry") {
      value = value.replace(/\D/g, "").substring(0, 4);
      if (value.length >= 2) {
        value = value.substring(0, 2) + "/" + value.substring(2);
      }
    }
    
    // Formatear CVC
    if (name === "cvc") {
      value = value.replace(/\D/g, "").substring(0, 3);
    }

    setCardData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validar datos de la tarjeta
  const validateCardData = () => {
    const { number, expiry, cvc, name } = cardData;
    
    if (!number || number.replace(/\s/g, "").length !== 16) {
      throw new Error("Número de tarjeta inválido");
    }
    
    if (!expiry || expiry.length !== 5) {
      throw new Error("Fecha de expiración inválida");
    }
    
    if (!cvc || cvc.length !== 3) {
      throw new Error("CVC inválido");
    }
    
    if (!name.trim()) {
      throw new Error("Nombre del titular requerido");
    }
  };

  // Procesar pago
  const handleSubscribe = async () => {
    try {
      setLoading(true);
      setError("");

      // Validar datos
      validateCardData();

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No hay sesión activa");
      }

      // Simular procesamiento de pago con Stripe
      // En producción, esto se haría con Stripe Elements o similar
      const paymentData = {
        plan: "premium",
        billingCycle,
        amount: prices[billingCycle].amount,
        currency: prices[billingCycle].currency,
        paymentMethod: {
          type: paymentMethod,
          card: {
            number: cardData.number.replace(/\s/g, ""),
            expiry: cardData.expiry,
            cvc: cardData.cvc,
            name: cardData.name
          }
        }
      };

      // Llamada al backend para procesar el pago
      const response = await axios.post(
        "http://localhost:4000/process-payment",
        paymentData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSuccess(true);
        
        // Actualizar el plan del usuario
        await axios.post(
          "http://localhost:4000/subscribe",
          { plan: "premium" },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Redirigir después de 3 segundos
        setTimeout(() => {
          navigate("/profile", { 
            state: { message: "¡Suscripción Premium activada!" }
          });
        }, 3000);
      }
    } catch (err) {
      setError(err.message || "Error al procesar el pago");
    } finally {
      setLoading(false);
    }
  };

  // Si el pago fue exitoso
  if (success) {
    return (
      <div className="subscribe-container">
        <div className="container">
          <div className="success-card">
            <div className="success-icon">
              <CheckCircle size={64} />
            </div>
            <h1 className="success-title">¡Pago Exitoso!</h1>
            <p className="success-message">
              Tu suscripción Premium ha sido activada. Ya puedes disfrutar de todas las funciones avanzadas.
            </p>
            <div className="success-features">
              <div className="feature-item">
                <Crown size={20} />
                <span>Acceso Premium</span>
              </div>
              <div className="feature-item">
                <Zap size={20} />
                <span>Funciones Avanzadas</span>
              </div>
              <div className="feature-item">
                <Users size={20} />
                <span>Soporte Prioritario</span>
              </div>
            </div>
            <div className="loading-redirect">
              <Loader className="spinner" size={20} />
              <span>Redirigiendo a tu perfil...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="subscribe-container">
      <div className="container">
        {/* Header */}
        <div className="subscribe-header">
    
          
          <div className="header-content">
            <div className="premium-badge-large">
              <Crown size={24} />
            </div>
            <h1>Actualizar a Premium</h1>
            <p>Desbloquea todas las funciones avanzadas</p>
          </div>
        </div>

        <div className="row">
          {/* Plan Details */}
          <div className="col-lg-5">
            <div className="plan-summary">
              <h3>Plan Premium</h3>
              
              {/* Billing Cycle Toggle */}
              <div className="billing-toggle">
                <div className="toggle-buttons">
                  <button
                    className={billingCycle === "monthly" ? "active" : ""}
                    onClick={() => setBillingCycle("monthly")}
                  >
                    Mensual
                  </button>
                  <button
                    className={billingCycle === "yearly" ? "active" : ""}
                    onClick={() => setBillingCycle("yearly")}
                  >
                    Anual
                    <span className="savings-badge">Ahorra {prices.yearly.savings}</span>
                  </button>
                </div>
              </div>

              {/* Price Display */}
              <div className="price-display">
                <div className="price">
                  <span className="currency">€</span>
                  <span className="amount">{prices[billingCycle].amount}</span>
                  <span className="period">/{billingCycle === "monthly" ? "mes" : "año"}</span>
                </div>
                {billingCycle === "yearly" && (
                  <div className="yearly-note">
                    Equivale a €8.33/mes
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="features-list">
                <h4>Incluye:</h4>
                <div className="feature-item">
                  <CheckCircle size={16} />
                  <span>Acceso ilimitado a todas las funciones</span>
                </div>
                <div className="feature-item">
                  <CheckCircle size={16} />
                  <span>Soporte prioritario 24/7</span>
                </div>
                <div className="feature-item">
                  <CheckCircle size={16} />
                  <span>Funciones avanzadas de análisis</span>
                </div>
                <div className="feature-item">
                  <CheckCircle size={16} />
                  <span>Sin límites de uso</span>
                </div>
                <div className="feature-item">
                  <CheckCircle size={16} />
                  <span>Actualizaciones prioritarias</span>
                </div>
              </div>

              {/* Security Badge */}
              <div className="security-badge">
                <Lock size={16} />
                <span>Pago 100% seguro y encriptado</span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="col-lg-7">
            <div className="payment-form">
              <h3>Información de Pago</h3>
              
              {error && (
                <div className="error-alert">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Payment Method Selection */}
              <div className="payment-methods">
                <div className="method-option">
                  <input
                    type="radio"
                    id="card"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <label htmlFor="card">
                    <CreditCard size={20} />
                    <span>Tarjeta de Crédito/Débito</span>
                  </label>
                </div>
              </div>

              {/* Card Details Form */}
              <div className="card-form">
                <div className="form-group">
                  <label>Número de Tarjeta</label>
                  <input
                    type="text"
                    name="number"
                    value={cardData.number}
                    onChange={handleCardInputChange}
                    placeholder="1234 5678 9012 3456"
                    className="form-control"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha de Expiración</label>
                    <input
                      type="text"
                      name="expiry"
                      value={cardData.expiry}
                      onChange={handleCardInputChange}
                      placeholder="MM/YY"
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>CVC</label>
                    <input
                      type="text"
                      name="cvc"
                      value={cardData.cvc}
                      onChange={handleCardInputChange}
                      placeholder="123"
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Nombre del Titular</label>
                  <input
                    type="text"
                    name="name"
                    value={cardData.name}
                    onChange={handleCardInputChange}
                    placeholder="Juan Pérez"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Email de Facturación</label>
                  <input
                    type="email"
                    name="email"
                    value={cardData.email}
                    onChange={handleCardInputChange}
                    className="form-control"
                    disabled
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                className="subscribe-btn"
                onClick={handleSubscribe}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader className="spinner" size={20} />
                    Procesando Pago...
                  </>
                ) : (
                  <>
                    <Crown size={20} />
                    Suscribirse por €{prices[billingCycle].amount}
                  </>
                )}
              </button>

              {/* Terms */}
              <div className="terms">
                <p>
                  Al continuar, aceptas nuestros{" "}
                  <a href="/terms">Términos de Servicio</a> y{" "}
                  <a href="/privacy">Política de Privacidad</a>.
                  Tu suscripción se renovará automáticamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscribe;