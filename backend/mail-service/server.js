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
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ [Mail Service] Conectado a MongoDB"))
  .catch((err) => console.error("❌ [Mail Service] Error al conectar:", err));

// Configura tu transporte de correo con Nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',        
  port: 587,                     
  secure: false,                 
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,   
    ciphers: 'SSLv3'            
  }
});


// Ruta para enviar correo a través de 'contactar'
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

// Ruta específica para enviar correos de restablecimiento de contraseña
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