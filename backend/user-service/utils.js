/**
 * @fileoverview Funciones auxiliares para User Service
 * @description Módulo que contiene funciones utilitarias para validación, autenticación y manipulación de datos
 * @version 1.0.0
 * @author Carmen Espinosa Martínez
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Valida que los campos requeridos estén presentes en el cuerpo de la solicitud
 * @function validateRequiredFields
 * @param {Object} req - Objeto de solicitud de Express
 * @param {string[]} requiredFields - Array de nombres de campos requeridos
 * @throws {Error} Si falta algún campo requerido
 * @example
 * validateRequiredFields(req, ['email', 'password']);
 */
function validateRequiredFields(req, requiredFields) {
  for (const field of requiredFields) {
    if (!(field in req.body)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  console.log("cumple required fields");
}

/**
 * Genera un token de restablecimiento de contraseña
 * @function generateResetToken
 * @returns {string} Token hexadecimal de 64 caracteres
 * @example
 * const token = generateResetToken();
 */
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}
// Exportar todas las funciones
module.exports = {
  validateRequiredFields,
  generateResetToken,
};

