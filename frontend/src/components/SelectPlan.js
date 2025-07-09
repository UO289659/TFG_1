import React, { useState } from "react";
import PlanCard from "./PlanCard"; 
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Star, ArrowRight, Check  } from "lucide-react";
import "./SelectPlan.css";
import toast from 'react-hot-toast';
import Footer from "./Footer";

const SelectPlan = () => {
  const [selectedPlan, setSelectedPlan] = useState("basic");
  const navigate = useNavigate();

  const handleSubscribe = async (plan) => {
    try {
      const token = localStorage.getItem("token");
      // await axios.post(
      //   "http://localhost:4000/subscribe",
      //   { plan },
      //   { headers: { Authorization: `Bearer ${token}` } }
      // );
      navigate("/subscribe");
    } catch (error) {
      toast.error("Error al actualizar el plan");
    }
  };

    const handleContinueWithCurrent = () => {
    // Simplemente navegar de vuelta al perfil sin cambios
    navigate("/track");
  };

  return (
    <div className="container-fluid">
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
            isSelected={selectedPlan === "basic"}
            isProfile={false} // para que no muestre botón suscribirse, solo badge Seleccionar
            onSelect={setSelectedPlan}
          />
        </div>
        <div className="col-md-6">
          <PlanCard
            type="premium"
            isSelected={selectedPlan === "premium"}
            isProfile={true}  // muestra botón Suscribirse en premium
            onSelect={() => handleSubscribe("premium")}
          />
        </div>
      </div>
      {/* Sección de acciones principales */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
                
                {/* Información del plan actual */}
                <div className="text-center text-md-start">
                  <h6 className="mb-1 fw-semibold text-dark">¿No necesitas cambiar ahora?</h6>
                  <p className="mb-0 text-muted small">
                    Puedes continuar con tu plan actual y actualizarlo cuando lo necesites
                  </p>
                </div>

                {/* Botones de acción */}
                <div className="d-flex gap-2 flex-shrink-0">
                  <button
                    className="btn btn-primary d-flex align-items-center gap-2 px-4 py-2 fw-medium shadow-sm btn-continue"
                    onClick={handleContinueWithCurrent}
                  >
                    <Check size={16} />
                    Continuar con plan actual
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nota informativa más profesional */}
      <div className="row mt-3">
        <div className="col-12">
          <div className="text-center">
            <div className="d-inline-flex align-items-center gap-2 px-3 py-2 bg-light rounded-pill">
              <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center" 
                   style={{width: '16px', height: '16px'}}>
                <span style={{fontSize: '10px', color: 'white', fontWeight: 'bold'}}>i</span>
              </div>
              <small className="text-muted mb-0 fw-medium">
                Sin compromisos • Cancela cuando quieras • Cambios instantáneos
              </small>
            </div>
          </div>
        </div>
      </div>
      <Footer/>
    </div>
  );
};

export default SelectPlan;