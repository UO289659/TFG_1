import React from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "./Hero.css"; // Importamos los estilos

const Hero = () => {
  const navigate = useNavigate(); 
   const data = [
    { month: "Ene", balance: 400 },
    { month: "Feb", balance: 300 },
    { month: "Mar", balance: 500 },
    { month: "Abr", balance: 700 },
    { month: "May", balance: 600 },
    { month: "Jun", balance: 800 },
    { month: "Jul", balance: 750 },
  ];

  return (
    <div className="hero-container">
      <nav className="navbar">
        <h1 className="logo">📘 Gestor de Finanzas </h1>
        <div>
          <button className="btn primary" onClick={() => navigate("/login")}>Iniciar Sesión</button>
          <button className="btn secondary" onClick={() => navigate("/register")}>Registrarse</button>
        </div>
      </nav>

      <div className="hero-content">
        <h2>
          Gestor  <span className="highlight">SaldoSmart</span>
        </h2>
        <p>
          Toma el control de tus finanzas con IA y accede a productos exclusivos para decisiones más efectivas.
        </p>
        <div className="hero-buttons">
          <button className="btn primary" onClick={() => navigate("/login")}>Empieza Ahora →</button>
          <button className="btn secondary" onClick={() => navigate("/contact")}>Contactar</button>
        </div>
      </div>
      <div className="chart-container-hero">
              <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="balance" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
     
  );
};

export default Hero;
