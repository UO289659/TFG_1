import React from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Unsubscribe = () => {
  const navigate = useNavigate();

  const handleConfirmDowngrade = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:4000/subscribe", 
        { plan: "basic" }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Tu plan se ha cambiado a básico");
      navigate("/profile");
    } catch (error) {
      alert("Error al cambiar a plan básico");
    }
  };

  return (
    <div className="unsubscribe-container">
      <h2>¿Seguro que deseas cancelar tu suscripción Premium?</h2>
      <p>Perderás acceso a funciones avanzadas y soporte prioritario.</p>
      <button onClick={handleConfirmDowngrade} className="btn btn-danger">Confirmar</button>
      <button onClick={() => navigate("/profile")} className="btn btn-secondary">Cancelar</button>
    </div>
  );
};

export default Unsubscribe;
