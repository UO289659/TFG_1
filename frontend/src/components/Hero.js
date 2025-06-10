import React from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "./Hero.css"; // Importamos los estilos

const Hero = () => {
  const navigate = useNavigate(); 

  // Componente SVG del logo
const SaldoSmartLogo = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 120" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Escudo */}
    <path
      d="M50 10 L20 25 L20 70 C20 85, 35 110, 50 110 C65 110, 80 85, 80 70 L80 25 Z"
      fill="#FF9FC7"
      stroke="#4A5568"
      strokeWidth="2"
    />
    
    {/* Contenedor del símbolo de dinero */}
    <rect
      x="35"
      y="35"
      width="30"
      height="25"
      rx="8"
      fill="#4A5568"
      stroke="#2D3748"
      strokeWidth="1.5"
    />
    
    {/* Símbolo de dólar */}
    <text
      x="50"
      y="52"
      textAnchor="middle"
      fill="#FF9FC7"
      fontSize="16"
      fontWeight="bold"
      fontFamily="Arial, sans-serif"
    >
      $
    </text>
    
    {/* Base del contenedor */}
    <ellipse
      cx="50"
      cy="62"
      rx="12"
      ry="3"
      fill="#4A5568"
    />
  </svg>
);

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
        <div 
          className="logo-container" 
          onClick={() => handleNavigation('/')}
          tabIndex={0}
          role="button"
          aria-label="Ir al inicio"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleNavigation('/');
            }
          }}
        >
          <SaldoSmartLogo size={45} />
          <h1 className="logo-text">Gestor de Finanzas</h1>
        </div>
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
