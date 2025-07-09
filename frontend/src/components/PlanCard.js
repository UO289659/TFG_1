import React from "react";
import { Shield, Crown, Check, CircleX } from "lucide-react";
import "./PlanCard.css";

const PlanCard = ({ type, isSelected, onSelect }) => {
  const planInfo = {
    basic: {
      icon: <Shield size={28} />,
      title: "Plan Básico",
      description: "Funciones esenciales",
      features: [
        { icon: <Check size={16} color="#10b981" />, text: "Acceso a funciones básicas" },
        { icon: <Check size={16} color="#10b981" />, text: "Soporte por email" },
        { icon: <CircleX size={16} color="#ef4444" />, text: "Añadir amigos" },
        { icon: <CircleX size={16} color="#ef4444" />, text: "Gastos compartidos" },
        { icon: <CircleX size={16} color="#ef4444" />, text: "Exportar transacciones" },
      ],
      buttonLabel: "Cambiar a Plan Básico"
    },
    premium: {
      icon: <Crown size={28} />,
      title: "Plan Premium",
      description: "Experiencia completa",
      features: [
        { icon: <Check size={16} color="#10b981" />, text: "Acceso completo a todas las funciones" },
        { icon: <Check size={16} color="#10b981" />, text: "Soporte prioritario 24/7" },
        { icon: <Check size={16} color="#10b981" />, text: "Añadir amigos" },
        { icon: <Check size={16} color="#10b981" />, text: "Gastos compartidos" },
        { icon: <Check size={16} color="#10b981" />, text: "Exportar transacciones" }
      ],
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
            <span className="feature-icon">{feature.icon}</span>
            <span className="feature-text">{feature.text}</span>
          </li>
        ))}
      </ul>

      {/* Botón solo si el plan NO está seleccionado */}
      {!isSelected && (
        <button className="gradient-btn" onClick={onSelect}>
          {buttonLabel}
        </button>
      )}

      {/* Badge si el plan está activo */}
      {isSelected && (
        <div className="active-plan-badge mt-3">Plan activo</div>
      )}
    </div>
  );
};

export default PlanCard;