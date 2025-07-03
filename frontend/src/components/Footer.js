import React from 'react';
import "./Footer.css"

const Footer = ({ className }) => {
  return (
    <footer className={`footer ${className || 'elegant-footer'}`}>
         <div className="footer-content">
      <p className="p-footer">&copy; {new Date().getFullYear()} Mi Sitio Web. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
};

export default Footer;
