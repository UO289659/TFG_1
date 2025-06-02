import React from "react";
import { Shield, Crown, Check } from "lucide-react";
import "./PlanCard.css";

const PlanCard = ({ type, isSelected, onSelect }) => {
  const planInfo = {
    basic: {
      icon: <Shield size={28} />,
      title: "Plan Básico",
      description: "Funciones esenciales",
      features: ["Acceso a funciones básicas", "Soporte por email", "Almacenamiento limitado"],
      buttonLabel: "Cambiar a Plan Básico"
    },
    premium: {
      icon: <Crown size={28} />,
      title: "Plan Premium",
      description: "Experiencia completa",
      features: ["Acceso completo a todas las funciones", "Soporte prioritario 24/7", "Almacenamiento ilimitado", "Funciones avanzadas"],
      buttonLabel: "Actualizar a Premium"
    }
  };

  const { icon, title, features, description, buttonLabel } = planInfo[type];

  return (
    <div className={`plan-card ${isSelected ? "active" : ""}`}>
      {isSelected && <div className="check-badge"><Check size={16} /></div>}

      <div className={`plan-icon ${type}`}>{icon}</div>
      <h3 className="h4 mb-2">{title}</h3>
      <p className="text-muted mb-3">{description}</p>
      <ul className="feature-list">
        {features.map((feature, idx) => (
          <li key={idx} className="feature-item">
            <Check size={16} className="feature-check" />
            {feature}
          </li>
        ))}
      </ul>

      {/* Botón solo si el plan NO está seleccionado */}
      {!isSelected && (
        <button className="gradient-btn mt-3" onClick={onSelect}>
          {buttonLabel}
        </button>
      )}

      {/* Badge si el plan está activo */}
      {isSelected && (
        <div className="active-plan-badge mt-3">Plan Activo</div>
      )}
    </div>
  );
};

export default PlanCard;
