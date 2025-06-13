// index.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

const SECRET_KEY = process.env.SECRET_KEY;
console.log("SECRET_KEY:", SECRET_KEY);

function authMiddleware(req, res, next) {
   console.log("Middleware ejecutado");
  const authHeader = req.headers.authorization;
 console.log("Authorization Header:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("No autorizado: falta token o formato incorrecto");
    return res.status(401).json({ error: "No autorizado: falta token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = { id: decoded.id || decoded.userId };
    next();
  } catch (error) {
    console.log("Error verificando token:", error.message);
    return res.status(401).json({ error: "Token inválido" });
  }
}
function ensurePremium(req, res, next) {
  if (!req.user.isPremium) {
    return res.status(403).json({ error: 'Acceso restringido a usuarios premium' });
  }
  next();
}

module.exports = { authMiddleware, ensurePremium };
