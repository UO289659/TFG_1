import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { loadStripe } from '@stripe/stripe-js';
import { 
  Crown, 
  Shield, 
  CheckCircle, 
  ArrowLeft, 
  Lock,
  AlertCircle,
  Loader,
  Zap,
  Users,

} from "lucide-react";
import "./Subscribe.css";
import Footer from "./Footer";
import { useUserContext } from "../context/UserContext"; 

// Inicializar Stripe
let stripePromise = null;
//const GATEWAY_URL = 'https://gateway-tfg.azure-api.net/users' || 'http://localhost:4000';
const GATEWAY_URL = process.env.REACT_APP_GATEWAY_URL;

const initializeStripe = () => {
  try {
    const stripeKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
    
    // Verificar que la key existe y no es undefined/null/empty
    if (!stripeKey || stripeKey === 'undefined' || stripeKey.trim() === '') {
      return null;
    }
    
    // Verificar formato de la key
    if (!stripeKey.startsWith('pk_')) {
      return null;
    }
    
    // Solo cargar Stripe si la key es válida
    return loadStripe(stripeKey);
  } catch (error) {
    return null;
  }
};

// Inicializar Stripe de forma segura
try {
  stripePromise = initializeStripe();
} catch (error) {
  stripePromise = null;
}

const Subscribe = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estados
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [userData, setUserData] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [stripeError, setStripeError] = useState(false);
  const { login } = useUserContext();
  
  // Precios
  const prices = {
    monthly: { amount: 9.99, currency: "EUR" },
    yearly: { amount: 99.99, currency: "EUR", savings: "17%" }
  };

  // Verificar Stripe al cargar el componente
  useEffect(() => {
    // Verificar que las variables de entorno estén cargadas
    const checkStripeConfig = () => {
      const stripeKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
      const monthlyPriceId = process.env.REACT_APP_STRIPE_MONTHLY_PRICE_ID;
      const yearlyPriceId = process.env.REACT_APP_STRIPE_YEARLY_PRICE_ID;
      
      if (!stripeKey || stripeKey === 'undefined') {
        setStripeError(true);
        setError("Stripe no está configurado. Verifica las variables de entorno.");
        return false;
      }
      
      if (!monthlyPriceId || !yearlyPriceId) {
        setStripeError(true);
        setError("Los precios de Stripe no están configurados correctamente.");
        return false;
      }
      
      if (!stripePromise) {
        setStripeError(true);
        setError("Error al inicializar Stripe. Verifica la configuración.");
        return false;
      }
      
      return true;
    };
    
    checkStripeConfig();
  }, []);

  // Obtener datos del usuario
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get(GATEWAY_URL+"/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setUserData(response.data);
      } catch (err) {
        setError("Error al cargar datos del usuario");
      }
    };

    fetchUserData();
  }, [navigate]);

  // Manejar el éxito del pago (cuando regresa de Stripe)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
      handlePaymentSuccess(sessionId);
    }
  }, [location]);

  const handlePaymentSuccess = async (sessionId) => {
    try {
      const token = localStorage.getItem("token");
      
      // Verificar el pago con el backend
      const response = await axios.post(GATEWAY_URL+"/verify-payment",
        { sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const { token: newToken, user: updatedUser } = response.data;
        
        // Actualizar el token si es necesario
        if (newToken) {
          login(newToken);
        }
        
        setSuccess(true);
        
        // Redirigir después de 3 segundos
        setTimeout(() => {
          navigate("/profile", { 
            state: { message: "¡Suscripción Premium activada!" }
          });
        }, 3000);
      }
    } catch (err) {
      setError("Error al verificar el pago");
    }
  };

  // Crear sesión de Stripe Checkout
  const handleCheckout = async () => {
    try {
      setLoading(true);
      setError("");

      // Verificar que Stripe esté disponible
      if (!stripePromise) {
        throw new Error("Stripe no está configurado correctamente");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No hay sesión activa");
      }

      // Verificar que las variables de entorno estén definidas
      const monthlyPriceId = process.env.REACT_APP_STRIPE_MONTHLY_PRICE_ID;
      const yearlyPriceId = process.env.REACT_APP_STRIPE_YEARLY_PRICE_ID;

      if (!monthlyPriceId || !yearlyPriceId) {
        throw new Error("IDs de precios de Stripe no configurados");
      }

      // Crear sesión de checkout en el backend
      const response = await axios.post(GATEWAY_URL+"/create-checkout-session",
        {
          priceId: billingCycle === "monthly" ? monthlyPriceId : yearlyPriceId,
          billingCycle,
          plan: "premium"
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const { sessionId } = response.data;
      
      // Obtener instancia de Stripe
      const stripe = await stripePromise;
      
      if (!stripe) {
        throw new Error("Error al cargar Stripe");
      }

      // Redirigir a Stripe Checkout
      const { error } = await stripe.redirectToCheckout({
        sessionId: sessionId
      });

      if (error) {
        throw new Error(error.message);
      }

    } catch (err) {
      setError(err.message || "Error al crear la sesión de pago");
      setLoading(false);
    }
  };

  // Si hay error de configuración de Stripe
  if (stripeError) {
    return (
      <div className="subscribe-container">
        <div className="container">
          <div className="error-card">
            <div className="error-icon">
              <AlertCircle size={64} />
            </div>
            <h1 className="error-title">Error de Configuración</h1>
            <p className="error-message">
              Hay un problema con la configuración de pagos. Por favor, contacta con soporte técnico.
            </p>
            <button 
              className="back-btn"
              onClick={() => navigate("/profile")}
            >
              <ArrowLeft size={20} />
              Volver al Perfil
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              <div className="feature-item-subscribe">
                <Crown size={20} />
                <span>Acceso Premium</span>
              </div>
              <div className="feature-item-subscribe">
                <Zap size={20} />
                <span>Funciones Avanzadas</span>
              </div>
              <div className="feature-item-subscribe">
                <Users size={20} />
                <span>Soporte Prioritario</span>
              </div>
            </div>
            <div className="loading-redirect">
              <Loader className="animate-spin align-middle" size={20} />
              Redirigiendo a tu perfil...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="subscribe-container">
        <div className="container">
          {/* Header */}
          <div className="subscribe-header">
            <div className="header-content-subscribe">
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
                    <span className="amount">{prices[billingCycle].amount}</span>
                     <span className="currency">€</span>
                    <span className="period">/{billingCycle === "monthly" ? "mes" : "año"}</span>
                  </div>
                  {billingCycle === "yearly" && (
                    <div className="yearly-note">
                      Equivale a 8.33€/mes
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="features-list">
                  <h4>Incluye:</h4>
                  <div className="feature-item-subscribe">
                    <CheckCircle size={16} />
                    <span>Acceso ilimitado a todas las funciones</span>
                  </div>
                  <div className="feature-item-subscribe">
                    <CheckCircle size={16} />
                    <span>Soporte prioritario 24/7</span>
                  </div>
                  <div className="feature-item-subscribe">
                    <CheckCircle size={16} />
                    <span>Funciones avanzadas</span>
                  </div>
                  <div className="feature-item-subscribe">
                    <CheckCircle size={16} />
                    <span>Actualizaciones prioritarias</span>
                  </div>
                </div>

                {/* Security Badge */}
                <div className="security-badge">
                  <Lock size={16} />
                  <span>Pago 100% seguro con Stripe</span>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="col-lg-7">
              <div className="payment-form">
                <h3>Proceder al Pago</h3>
                
                {error && (
                  <div className="error-alert">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="checkout-info">
                  <div className="payment-method-info">
                    <div>
                      <h4>Pago Seguro con Stripe</h4>
                      <p>Serás redirigido a Stripe para completar tu pago de forma segura. Aceptamos todas las tarjetas principales.</p>
                    </div>
                  </div>


               <div className="billing-summary">
        <div className="summary-header">
          <Shield size={20} className="text-primary" />
          <span className="summary-title">Resumen de Facturación</span>
        </div>
        
        <div className="summary-item">
          <div className="item-label">Cliente:</div>
          <div className="user-info">
            <div className="user-info-text">{userData?.email}</div>
          </div>
        </div>
        
        <div className="summary-item">
          <div className="item-label">Plan:</div>
          <div className="plan-badge">
            <Crown size={12} />
            Premium
          </div>
        </div>
        
        <div className="summary-item">
          <div className="item-label">Ciclo de facturación:</div>
          <div className="item-value">
            {billingCycle === "monthly" ? "Mensual" : "Anual"}
          </div>
        </div>
        
        <div className="summary-item">
          <div className="item-label">Precio del plan:</div>
          <div className="item-value">{prices[billingCycle].amount}€</div>
        </div>
        
        {billingCycle === "yearly" && (
          <div className="summary-item">
            <div className="item-label">Descuento anual:</div>
            <div className="discount-badge">-17%</div>
          </div>
        )}
        
        <div className="summary-item">
          <div className="item-label">Total a pagar:</div>
          <div className="item-value">{prices[billingCycle].amount}€</div>
        </div>
      </div>

      <div className="security-notice">
        <div className="security-content">
          <div className="security-icon">
            <Lock size={20} />
          </div>
          <div className="security-text">
            <div className="security-title">Pago 100% Seguro</div>
            <div className="security-subtitle">
              Procesado por Stripe con encriptación SSL. Tus datos están protegidos.
            </div>
          </div>
        </div>
      </div>
                </div>

                {/* Checkout Button */}
                <button
                  className="subscribe-btn"
                  onClick={handleCheckout}
                  disabled={loading || stripeError}
                >
                 {loading ? (
                  <>
                      <Loader className="animate-spin align-middle" size={20} />
                    Creando sesión...
                  </>
                ) : (
                  <>
                    <Crown size={20} />
                    Continuar con Stripe Checkout
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
      <Footer className={"footer-forgot-password"}/>
    </>
  );
};

export default Subscribe;