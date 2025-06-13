require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require('axios');
const {authMiddleware, ensurePremium} = require("../backend/auth-middleware/index");
console.log("Middleware cargado:", authMiddleware);
const app = express();
app.use(cors());
app.use(express.json());

const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:5000';
const statsServiceUrl = process.env.STATS_SERVICE_URL || 'http://localhost:5001';
const mailServiceUrl = process.env.MAIL_SERVICE_URL || 'http://localhost:5002';

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 API Gateway corriendo en puerto ${PORT}`);
});

app.post('/login', async (req, res) => {
  try {
    // Forward the login request to the authentication service
    const authResponse = await axios.post(userServiceUrl+'/login', req.body);
    res.json(authResponse.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || "Error interno en la API Gateway"
    });
  }
});

app.post('/register', async (req, res) => {
  console.log("entre por gateway");
  try {
    // Forward the add user request to the user service
    const userResponse = await axios.post(userServiceUrl+'/register', req.body);
    res.json(userResponse.data);
  } catch (error) {
    console.log(error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || "Error interno"
    });
  }
});
app.get('/gastos/rango', authMiddleware, async (req, res) => {
  const { start, end } = req.query;
   // Verificar si las fechas están siendo recibidas correctamente
  console.log("🔎 Start:", start, "End:", end);

  try {
    const response = await axios.get(statsServiceUrl+'/gastos/rango', {
     params: { 
        start, 
        end,
        clientId: req.user.id || req.user.userId // ✅ Agregar clientId
      },
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error desde el gateway:", error.message);
    res.status(500).json({ error: "Error en gateway" });
  }
});

app.get("/gastos/:period", authMiddleware, async (req, res) => {
  console.log("Entro por gastos / period");
   try {
    const period = req.params.period; 
    const response = await axios.get(statsServiceUrl+'/gastos/'+period, {
      headers: {
        Authorization: req.headers.authorization, // reenvías el token JWT
      },
      params: {
        clientId: req.user.id, 
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error en /gastos:", error.message);
    res.status(500).json({ error: "Error al obtener gastos" });
  }
});



/* app.get("/track", async (req, res) => {
  try {
    const response = await axios.get(`${statsServiceUrl}/gastos`);
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error en /track:", error.message);
    res.status(500).json({ error: "Error al obtener gastos" });
  }
}); */

app.post('/track', async (req, res) => {
  try {
    console.log("Entra por la gategay para guardar ingresos");
    // Forward 
    const statsResponse = await axios.post(statsServiceUrl+'/track', req.body);
    res.json(statsResponse.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || "Error interno en la API Gateway"
    });
  }
});

app.get("/profile", authMiddleware, async (req, res) => {
   try {
    const response = await axios.get(userServiceUrl+'/profile', {
      headers: {
        Authorization: req.headers.authorization, // reenvías el token JWT
      },
     
    });
    console.log("Usuario en gateway:", req.user);

    res.json(response.data);
  } catch (error) {
    console.error("Error en /profile:", error.message);
    res.status(500).json({ error: "Error al obtener gastos" });
  }
});

app.put("/profile", authMiddleware, async (req, res) => {
   try {
    const response = await axios.put(userServiceUrl + '/profile',req.body, // datos a enviar en el body
  {
    headers: {
      Authorization: req.headers.authorization, // envías el header correcto
    },
    params: {
      clientId: req.user.userId, // si usas params, pero parece que no es necesario para editar perfil
    },
  }
); 
    res.json(response.data);
  } catch (error) {
    console.error("Error en /profile:", error.message);
    res.status(500).json({ error: "Error al editar perfil" });
  }
});

app.put("/password", authMiddleware, async (req, res) => {
  try{
     const response = await axios.put(userServiceUrl + "/password",req.body, // datos a enviar en el body
  {
    headers: {
      Authorization: req.headers.authorization, // envías el header correcto
    },
    params: {
      clientId: req.user.userId, // si usas params, pero parece que no es necesario para editar perfil
    },
  }
); 
    res.json(response.data);
  } catch (error) {
    console.error("Error en /password:", error.message);
    res.status(500).json({ error: "Error al editar contraseña" });
  }
});

app.post("/subscribe", authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(userServiceUrl + "/subscribe", req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/send-email', async (req, res) => {
   console.log("📩 Recibida solicitud de envío de email:", req.body); // 👈 agrega esto
  try {
    // Enviar directamente el cuerpo de la solicitud al servicio de correo
    const response = await axios.post(mailServiceUrl+'/send-email', req.body);

    // Si el correo se envía correctamente, respondemos con un mensaje de éxito
    res.status(200).send('Correo enviado correctamente');
  } catch (error) {
    // Si ocurre un error al redirigir la solicitud, respondemos con un error
    console.error('Error al enviar el correo:', error);
    res.status(500).send('Error al enviar el correo');
  }
});

app.put('/track/:id', async (req, res) => {
  try{
    const response = await axios.put(
  statsServiceUrl + '/track/' + req.params.id,
  req.body,
  {
    headers: {
      Authorization: req.headers.authorization,
    },
  }
);

   res.status(response.status).json(response.data);
  }catch (err) {
    console.error("Error en PUT /track/:id desde API Gateway:", err.message);
    res.status(err.response?.status || 500).json({
      message: "Error al actualizar la transacción",
      error: err.message,
    });
  }
});

app.delete('/track/:id', async (req, res) => {
  try {
    const response = await axios.delete(`${statsServiceUrl}/track/${req.params.id}`, {
      headers: { Authorization: req.headers.authorization },
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Error al eliminar en API Gateway:", error.message);
    res.status(error.response?.status || 500).json({
      message: "Error al eliminar transacción",
      error: error.message,
    });
  }
});

app.get("/categories", authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${statsServiceUrl}/categories`, {
      headers: { Authorization: req.headers.authorization },
    });
    res.json(response.data);
  } catch (err) {
    console.error("Error en /categorias:", err.message);
    res.status(err.response?.status || 500).json({ error: "Error al obtener categorías" });
  }
});

app.post("/categories", authMiddleware, async (req, res) => {
  const response = await axios.post(`${statsServiceUrl}/categories`, req.body, {
    headers: { Authorization: req.headers.authorization }
  });
  res.json(response.data);
});

app.delete("/categorie", authMiddleware, async (req, res) => {
  const response = await axios.delete(`${statsServiceUrl}/categorie`, {
    headers: { Authorization: req.headers.authorization },
    data: req.body,
  });
  res.json(response.data);
});

app.get("/icons", authMiddleware, async (req, res) => {
  try {
    const response = await axios.get(`${statsServiceUrl}/icons`, {
      headers: { Authorization: req.headers.authorization },
    });
    res.json(response.data);
  } catch (err) {
    console.error("Error en /icons:", err.message);
    res.status(err.response?.status || 500).json({ error: "Error al obtener iconos" });
  }
});

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // Enviar la solicitud al microservicio de autenticación
    const response = await axios.post(userServiceUrl+"/forgot-password", { email });

    // Pasar la respuesta del microservicio al cliente
    res.json(response.data);
  } catch (error) {
    // Si el error viene del microservicio, pasamos la información de ese error
    if (error.response) {
      // Error de respuesta del microservicio
      return res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      // Error de solicitud (el microservicio no respondió)
      console.error("No se recibió respuesta del microservicio:", error);
      return res.status(500).json({ error: "El servicio de autenticación no respondió." });
    } else {
      // Error general en la configuración o la ejecución de la solicitud
      console.error("Error en la configuración de la solicitud:", error);
      return res.status(500).json({ error: "Hubo un problema al intentar restablecer la contraseña." });
    }
  }
});

// Ruta para restablecer la contraseña
app.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;  // Obtener el token de la URL
  const { password } = req.body; // Obtener la nueva contraseña del cuerpo de la solicitud

  try {
    // Hacer una solicitud al microservicio de autenticación para restablecer la contraseña
    const response = await axios.post(userServiceUrl+`/reset-password/${token}`, { password });

    // Pasar la respuesta del microservicio al cliente
    res.json(response.data);
  } catch (error) {
    console.error("Error al restablecer la contraseña en el gateway:", error);
    res.status(500).json({ error: "Error al procesar la solicitud de restablecimiento de contraseña." });
  }
});

app.get("/export", authMiddleware, ensurePremium, async (req, res) => {
   try {
    const response = await axios.get(statsServiceUrl+'/export', {
      headers: {
        Authorization: req.headers.authorization, // reenvías el token JWT
      },
      params: {
        clientId: req.user.id, 
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error en /export:", error.message);
    res.status(500).json({ error: "Error al obtener gastos" });
  }
});