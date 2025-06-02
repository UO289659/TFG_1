// PlanCard.js
import React from "react";
import { Shield, Crown, Check } from "lucide-react";
import "./PlanCard.css"; // O crea un CSS separado si prefieres

const PlanCard = ({ type, isSelected, onSelect, isProfile }) => {
  const planInfo = {
    basic: {
      icon: <Shield size={28} />,
      title: "Plan Básico",
      description: "Funciones esenciales",
      features: ["Acceso a funciones básicas", "Soporte por email", "Almacenamiento limitado"],
    },
    premium: {
      icon: <Crown size={28} />,
      title: "Plan Premium",
      description: "Experiencia completa",
      features: ["Acceso completo a todas las funciones", "Soporte prioritario 24/7", "Almacenamiento ilimitado", "Funciones avanzadas"],
    },
  };

  const { icon, title, features, description } = planInfo[type];

  return (
    <div
      className={`plan-card ${isSelected ? "active" : ""}`}>{/* Check badge si está seleccionado */}
      {isSelected && (
        <div className="check-badge">
          <Check size={16} />
        </div>
      )}
      <div className={`plan-icon ${type}`}>
        {icon}
      </div>
      <h3 className="h4 mb-2">{title}</h3>
      <p className="text-muted mb-3">{description}</p>
      <ul className="feature-list">
        {features.map((feature, index) => (
          <li key={index} className="feature-item">
            <Check size={16} className="feature-check" />
            {feature}
          </li>
        ))}
      </ul>
       {/* Botones internos según plan */}
      {isSelected ? (
        <div className="active-plan-badge mt-3">Plan Activo</div>
      ) : (
        isProfile ? (
          <button onClick={() => onSelect(type)} className="gradient-btn mt-3">
            Suscribirse
          </button>
        ) : (
          <div className="active-plan-badge mt-3">Seleccionar</div>
        )
      )}
    </div>
  );
};

export default PlanCard;
