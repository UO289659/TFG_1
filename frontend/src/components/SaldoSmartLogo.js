// Componente SVG del logo mejorado
  const SaldoSmartLogo = ({ size = 45, className = "" }) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 120 140" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="100%" stopColor="#764ba2" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.3"/>
        </filter>
      </defs>
      
      {/* Escudo principal */}
      <path
        d="M60 15 L25 32 L25 85 C25 105, 42 125, 60 125 C78 125, 95 105, 95 85 L95 32 Z"
        fill="url(#shieldGradient)"
        filter="url(#shadow)"
        stroke="#4A5568"
        strokeWidth="1"
      />
      
      {/* Símbolo de dinero */}
      <circle cx="60" cy="65" r="20" fill="#ffffff" opacity="0.95"/>
      <text
        x="60"
        y="75"
        textAnchor="middle"
        fill="#667eea"
        fontSize="24"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        $
      </text>
      
      {/* Elementos decorativos */}
      <circle cx="45" cy="45" r="2" fill="#ffffff" opacity="0.7"/>
      <circle cx="75" cy="45" r="2" fill="#ffffff" opacity="0.7"/>
      <circle cx="45" cy="85" r="2" fill="#ffffff" opacity="0.7"/>
      <circle cx="75" cy="85" r="2" fill="#ffffff" opacity="0.7"/>
    </svg>
  );

  export default SaldoSmartLogo;