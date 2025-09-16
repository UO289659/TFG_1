/**
 * @fileoverview Microservicio de correo electrónico para la aplicación de finanzas
 * @description Servidor Express que proporciona endpoints para el envío de correos
 * electrónicos incluyendo formulario de contacto, restablecimiento de contraseñas
 * y confirmaciones de registro utilizando Nodemailer y Gmail SMTP
 * @author Carmen Espinosa Martínez
 * @version 1.0.0
 * @requires express
 * @requires nodemailer
 * @requires cors
 * @requires mongoose
 * @requires dotenv
 */

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const mongoose = require('mongoose'); 

require('dotenv').config();  // Cargar las variables del archivo .env

// Inicializamos el servidor Express
const app = express();
const port = process.env.PORT || 5002;

// Middleware para parsear JSON
app.use(express.json());
app.use(cors());

mongoose
  .connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ [Mail Service] Conectado a MongoDB"))
  .catch((err) => console.error("❌ [Mail Service] Error al conectar:", err));

// Configura tu transporte de correo con Nodemailer
const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 2525,
  auth: {
    user: "apikey",
    pass: process.env.SENDGRID_API_KEY
  }
});


/**
 * Endpoint para enviar correos desde el formulario de contacto
 * @function
 * @name POST /send-email
 * @description Procesa y envía correos electrónicos del formulario de contacto web
 * @param {Object} req - Objeto de petición HTTP
 * @param {Object} req.body - Cuerpo de la petición
 * @param {string} req.body.name - Nombre del remitente
 * @param {string} req.body.email - Correo electrónico del remitente
 * @param {string} req.body.subject - Asunto del mensaje
 * @param {string} req.body.message - Contenido del mensaje
 * @param {Object} res - Objeto de respuesta HTTP
 * @returns {Object} JSON con resultado del envío o error
 * @throws {Error} Error 400 si faltan campos requeridos
 * @throws {Error} Error 500 si falla el envío del correo
 * @example
 * // POST /send-email
 * {
 *   "name": "Juan Pérez",
 *   "email": "juan@ejemplo.com",
 *   "subject": "Consulta sobre la aplicación",
 *   "message": "Tengo una pregunta sobre las funcionalidades..."
 * }
 */
app.post('/send-email', (req, res) => {
     console.log("📨 Microservicio de correo recibió:", req.body); // 👈 agrega esto
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

    const mailOptions = {
        from: process.env.MAIL_USER,
        to: "saldosmart.info@gmail.com",   // Correo de destino (fijo o dinámico)
        subject: `[Contacto Web] ${subject} - ${name}`,
        replyTo: email,
        text:`
        📧 NUEVO MENSAJE DE CONTACTO

        👤 Información del contacto:
          • Nombre: ${name}
          • Email: ${email}
          • Asunto: ${subject}

        💬 Mensaje:
        ${message}

        ---
        📅 Enviado: ${new Date().toLocaleString('es-ES')}
            `
          };

  // Enviar el correo
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      return res.status(500).send('Error al enviar el correo');
    }
    res.status(200).send('Correo enviado correctamente');
  });
});

/**
 * Endpoint para enviar correos de restablecimiento de contraseña
 * @function
 * @name POST /send-reset-email
 * @description Envía correos electrónicos con enlaces de restablecimiento de contraseña
 * @param {Object} req - Objeto de petición HTTP
 * @param {Object} req.body - Cuerpo de la petición
 * @param {string} req.body.to - Dirección de correo del destinatario
 * @param {string} req.body.resetLink - Enlace de restablecimiento de contraseña
 * @param {Object} res - Objeto de respuesta HTTP
 * @returns {Object} JSON con resultado del envío o error
 * @throws {Error} Error 400 si faltan parámetros requeridos
 * @throws {Error} Error 500 si falla el envío del correo
 * @example
 * // POST /send-reset-email
 * {
 *   "to": "usuario@ejemplo.com",
 *   "resetLink": "https://miapp.com/reset-password?token=abc123"
 * }
 */
app.post('/send-reset-email', (req, res) => {
  console.log("📨 Enviando correo de restablecimiento:", req.body);
  
  const { to, resetLink } = req.body;

  if (!to || !resetLink) {
    return res.status(400).json({ error: "Faltan parámetros requeridos" });
  }

  const mailOptions = {
    from: process.env.MAIL_USER,
    to: to,
    subject: "Restablecimiento de Contraseña - Gestor de Finanzas",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Restablecimiento de Contraseña</h2>
        <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #007bff; 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    display: inline-block;">
            Restablecer Contraseña
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Si no solicitaste este cambio, puedes ignorar este correo.
          <br>Este enlace expirará en 1 hora.
        </p>
      </div>
    `,
    text: `Haz clic en el siguiente enlace para restablecer tu contraseña: ${resetLink}`
  };

  // Enviar el correo
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error al enviar correo:", error);
      return res.status(500).json({ error: 'Error al enviar el correo' });
    }
    console.log("Correo enviado:", info.messageId);
    res.json({ message: 'Correo de restablecimiento enviado correctamente' });
  });
});

/**
 * Endpoint para enviar correos de confirmación de registro
 * @function
 * @name POST /send-registration-email
 * @description Envía correos electrónicos de confirmación cuando se registra un nuevo usuario
 * @param {Object} req - Objeto de petición HTTP
 * @param {Object} req.body - Cuerpo de la petición
 * @param {string} req.body.to - Dirección de correo del destinatario
 * @param {string} req.body.subject - Asunto del correo de confirmación
 * @param {string} req.body.message - Mensaje de confirmación
 * @param {Object} res - Objeto de respuesta HTTP
 * @returns {Object} JSON con resultado del envío o error
 * @throws {Error} Error 400 si faltan parámetros requeridos
 * @throws {Error} Error 500 si falla el envío del correo
 * @example
 * // POST /send-registration-email
 * {
 *   "to": "nuevousuario@ejemplo.com",
 *   "subject": "Bienvenido a la aplicación",
 *   "message": "Tu registro se ha completado exitosamente..."
 * }
 */
app.post('/send-registration-email', (req, res) => {
  console.log("📨 Enviando correo de registro:", req.body);

  const { to, subject, message } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ error: "Faltan parámetros requeridos" });
  }

  const mailOptions = {
    from: process.env.MAIL_USER,
    to: to,
    subject: subject,
    text: message, // El mensaje que se enviará como texto
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Confirmación de Registro</h2>
        <p>${message}</p>
      </div>
    `, // Si deseas enviar el correo con formato HTML
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error al enviar correo:", error);
      return res.status(500).json({ error: 'Error al enviar el correo' });
    }
    console.log("Correo enviado:", info.messageId);
    res.json({ message: 'Correo de registro enviado correctamente' });
  });
});


// Levantar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

module.exports = app;