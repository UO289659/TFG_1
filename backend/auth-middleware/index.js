/**
 * @fileoverview Middleware de autenticación y autorización para la aplicación
 * @description Este módulo proporciona funciones middleware para validar tokens JWT
 * y verificar permisos de usuario premium en las rutas protegidas de la API
 * @author Carmen Espinosa Martínez
 * @version 1.0.0
 */

const jwt = require("jsonwebtoken");
require("dotenv").config();

/**
 * Clave secreta para firmar y verificar tokens JWT
 * @constant {string}
 * @private
 */
const SECRET_KEY = process.env.SECRET_KEY;
console.log("SECRET_KEY:", SECRET_KEY);

/**
 * Middleware de autenticación que verifica la validez del token JWT
 * @function authMiddleware
 * @description Extrae y valida el token JWT del header Authorization.
 * Si es válido, añade la información del usuario al objeto request.
 * @param {Object} req - Objeto de petición HTTP de Express
 * @param {Object} req.headers - Headers de la petición HTTP
 * @param {string} req.headers.authorization - Header de autorización con formato "Bearer <token>"
 * @param {Object} res - Objeto de respuesta HTTP de Express
 * @param {Function} next - Función para continuar al siguiente middleware
 * @returns {void|Object} Continúa al siguiente middleware o devuelve error 401
 * @throws {Error} Error 401 cuando el token no está presente, tiene formato incorrecto o es inválido
 * @example
 * // Uso en una ruta protegida
 * app.get('/api/protected', authMiddleware, (req, res) => {
 *   // req.user estará disponible aquí
 *   res.json({ message: 'Acceso autorizado', user: req.user });
 * });
 */
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
    req.user = { id: decoded.id || decoded.userId, email: decoded.email,isPremium: decoded.isPremium  };
    next();
  } catch (error) {
    console.log("Error verificando token:", error.message);
    return res.status(401).json({ error: "Token inválido" });
  }
}

/**
 * Middleware de autorización que verifica si el usuario tiene permisos premium
 * @function ensurePremium
 * @description Verifica que el usuario autenticado tenga suscripción premium.
 * Debe usarse después del middleware authMiddleware.
 * @param {Object} req - Objeto de petición HTTP de Express
 * @param {Object} req.user - Información del usuario (añadida por authMiddleware)
 * @param {boolean} req.user.isPremium - Estado de suscripción premium del usuario
 * @param {Object} res - Objeto de respuesta HTTP de Express
 * @param {Function} next - Función para continuar al siguiente middleware
 * @returns {void|Object} Continúa al siguiente middleware o devuelve error 403
 * @throws {Error} Error 403 cuando el usuario no tiene permisos premium
 * @requires authMiddleware - Debe ejecutarse después del middleware de autenticación
 * @example
 * // Uso en una ruta que requiere suscripción premium
 * app.get('/api/premium-content', authMiddleware, ensurePremium, (req, res) => {
 *   res.json({ message: 'Contenido exclusivo para usuarios premium' });
 * });
 */
function ensurePremium(req, res, next) {
  if (!req.user.isPremium) {
    return res.status(403).json({ error: 'Acceso restringido a usuarios premium' });
  }
  next();
}

module.exports = { authMiddleware, ensurePremium };
