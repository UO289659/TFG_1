import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { TrendingUp, Network , BookCheck, ChartLine, ArrowRight, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Hero.css";
import Footer from "./Footer.js";
import SaldoSmartLogo from "./SaldoSmartLogo.js";

const Hero = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [animatedValue, setAnimatedValue] = useState(0);
  const navigate = useNavigate(); 

  // Animación contador
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimatedValue(prev => prev < 850 ? prev + 10 : 850);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  

  const data = [
    { month: "Ene", balance: 400, savings: 200 },
    { month: "Feb", balance: 300, savings: 180 },
    { month: "Mar", balance: 500, savings: 320 },
    { month: "Abr", balance: 700, savings: 450 },
    { month: "May", balance: 600, savings: 380 },
    { month: "Jun", balance: 800, savings: 520 },
    { month: "Jul", balance: 750, savings: 490 },
  ];

  const features = [
     {
      icon: <BookCheck className="feature-icon-svg" />,
      title: "Categorización de transacciones",
      description: "Análisis de gastos e ingresos por categorías"
    },
    {
      icon: <ChartLine className="feature-icon-svg" />,
      title: "Visualización de gráficos",
      description: "Gráficos de evolución y balance por sectores en tiempo real"
    },
    {
      icon: <Network className="feature-icon-svg" />,
      title: "Gastos compartidos",
      description: "Añade a tus amigos para registrar gastos compartidos"
    },
    
  ];


  const stats = [
    {value: "∞", label: "Transacciones" },
    { value: "11", label: "Categorías principales" },
    { value: "100%", label: "Control total" },
    { value: "24/7", label: "Disponible" }
  ];

  const handleNavigation = (path) => {
    console.log(`Navegando a: ${path}`);
    // Aquí iría la lógica de navegación
  };

  return (
    <div className="my-container">
      {/* Navegación */}
      <nav className="navbar-professional">
        <div className="nav-content">
          <div className="logo-container-new" onClick={() => handleNavigation('/')}>
            <SaldoSmartLogo size={45} />
            <h1 className="logo-text-new">SaldoSmart</h1>
          </div>
          
          {/* Menú desktop */}
          <div className="nav-menu">
            <a href="#features" className="nav-link">Características</a>
            <a href="#pricing" className="nav-link">Precios</a>
            <a href="#about" className="nav-link">Nosotros</a>
            <button className="btn-secondary-nav"  onClick={() => navigate("/login")}>Iniciar Sesión</button>
            <button className="btn-primary-nav" onClick={() => navigate("/register")}>Registrarse</button>
          </div>

          {/* Botón móvil */}
          <button 
            className="mobile-menu-btn"
            aria-label="Abrir menú de navegación"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="menu-icon" /> : <Menu className="menu-icon" />}
          </button>
        </div>

        {/* Menú móvil */}
        {isMenuOpen && (
          <div className="mobile-menu">
            <a href="#features" className="mobile-nav-link">Características</a>
            <a href="#pricing" className="mobile-nav-link">Precios</a>
            <a href="#about" className="mobile-nav-link">Nosotros</a>
            <div className="mobile-buttons">
              <button className="btn-secondary-nav" onClick={() => navigate("/login")}>Iniciar Sesión</button>
              <button className="btn-primary-nav" onClick={() => navigate("/register")}>Registrarse</button>
            </div>
          </div>
        )}
      </nav>

      {/* Contenido principal */}
      <div className="hero-content-new">
        <div className="my-text">
          
          <h1 className="hero-title">
            El futuro de las
            <span className="title-gradient"> finanzas personales</span>
          </h1>
          
          <p className="hero-subtitle">
            Toma control total de tu dinero con nuestra plataforma y disfruta de las ventajas de la salud financiera. 
          </p>

          <div className="hero-buttons-new">
            <button className="btn-primary-large" onClick={() => navigate("/login")}>
              Comenzar gratis
              <ArrowRight className="button-icon" />
            </button>
            <button className="btn-secondary-large">
              Ver demo
            </button>
          </div>

          {/* Estadísticas */}
          <div className="stats-container-new">
            {stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico mejorado */}
        <div className="chart-section">
          <div className="chart-container-new">
            <div className="chart-header">
              <h3 className="chart-title">Evolución de tu patrimonio</h3>
              <div className="chart-value">
                €{animatedValue.toLocaleString()}
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f093fb" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f093fb" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748b"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#64748b"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#667eea"
                  fillOpacity={1}
                  fill="url(#colorBalance)"
                  strokeWidth={3}
                  name="Balance total"
                />
                <Area
                  type="monotone"
                  dataKey="savings"
                  stroke="#f093fb"
                  fillOpacity={1}
                  fill="url(#colorSavings)"
                  strokeWidth={3}
                  name="Ahorros"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Características */}
      <div className="features-section">
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Elementos decorativos de fondo */}
      <div className="background-elements">
        <div className="floating-element floating-1"></div>
        <div className="floating-element floating-2"></div>
        <div className="floating-element floating-3"></div>
      </div>
      <Footer className={"footer-forgot-password"}/>
    </div>
  );
};

export default Hero;