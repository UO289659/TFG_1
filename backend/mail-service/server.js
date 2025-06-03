require('dotenv').config();  // Cargar las variables del archivo .env
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

// Inicializamos el servidor Express
const app = express();
const port = process.env.PORT || 5002;

// Middleware para parsear JSON
app.use(express.json());
app.use(cors());

// Configura tu transporte de correo con Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail', // Puedes usar otros servicios como SendGrid, Mailgun, etc.
  auth: {
    user: process.env.MAIL_USER, // Usa la variable de entorno para el correo
    pass: process.env.MAIL_PASS, // Usa la variable de entorno para la contraseña
    },
  tls: {
    rejectUnauthorized: false, // 👈 esto permite certificados autofirmados
  }
});


// Ruta para enviar correo
app.post('/send-email', (req, res) => {
     console.log("📨 Microservicio de correo recibió:", req.body); // 👈 agrega esto
  const { name, email, subject, message } = req.body;

    const mailOptions = {
        from:`"${name} (desde formulario web)" <${process.env.MAIL_USER}>`,
        to: "saldosmart.info@gmail.com",   // Correo de destino (fijo o dinámico)
        subject,
        text:message,
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

// Levantar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
