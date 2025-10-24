require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require('axios');
const {authMiddleware, ensurePremium} = require("./auth-middleware/index");
console.log("Middleware cargado:", authMiddleware);
const app = express();

app.use(cors());
app.use(express.json());

const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:5000';
const statsServiceUrl = process.env.STATS_SERVICE_URL || 'http://localhost:5001';
const mailServiceUrl = process.env.MAIL_SERVICE_URL || 'http://localhost:5002';
const paymentsServiceUrl = process.env.PAYMENTS_SERVICE_URL || 'http://localhost:5003';

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

  try {
    const response = await axios.get(statsServiceUrl+'/gastos/rango', {
     params: { 
        start, 
        end,
        clientId: req.user.id || req.user.userId 
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

app.post('/track', async (req, res) => {
  try {
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
        Authorization: req.headers.authorization, // reenvía el token JWT
      },
     
    });

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
      Authorization: req.headers.authorization, // envía el header correcto
    },
    params: {
      clientId: req.user.userId, 
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
  try {
    const response = await axios.put(userServiceUrl + "/password", req.body, {
      headers: {
        Authorization: req.headers.authorization,
      },
      params: {
        clientId: req.user.userId,
      },
    });
    
    res.json(response.data);
  } catch (error) {
    console.error("Error en /password:", error.message);
    
    // Si el error viene del microservicio de usuarios
    if (error.response) {
      // El microservicio respondió con un código de error
      const status = error.response.status;
      const data = error.response.data;
      
      // Propagar el mismo status y mensaje del microservicio
      return res.status(status).json(data);
    
    } else {
      // Error en la configuración de la petición
      console.error("Error interno:", error.message);
      return res.status(500).json({ 
        message: "Error interno del servidor" 
      });
    }
  }
});

app.post('/send-email', async (req, res) => {
   console.log("📩 Recibida solicitud de envío de email:", req.body); 
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
        Authorization: req.headers.authorization, // reenvía el token JWT
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

app.get("/friends", authMiddleware, ensurePremium, async(req, res)=>{
  try{
    const response = await axios.get(userServiceUrl + '/friends', {
    headers: {
      Authorization: req.headers.authorization
    }
  });

    res.json(response.data);
  }catch (error) {
    console.error("Error en /friends:", error.message);
    res.status(500).json({ error: "Error al obtener amigos" });
  }
});
app.get("/users", async(req, res)=>{
  try{
    const response= await axios.get(userServiceUrl+'/users');
    res.json(response.data);
  }catch (error) {
    console.error("Error en /users:", error.message);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

app.post("/send-friend-request", authMiddleware, ensurePremium,async (req, res)=>{
  try{
    const { senderId, receiverId } = req.body;
    const response = await axios.post(userServiceUrl + "/send-friend-request",
     { senderId, receiverId },
    {
    headers: {
      Authorization: req.headers.authorization,
    },
  }
);
    res.json(response.data);
  }catch(error){
     console.error("Error en /send-friend-request:", error.message);
    res.status(500).json({ error: "Error al enviar solicitud de amistad" });
  }
});

app.get("/friend-requests/received", authMiddleware, ensurePremium, async(req, res)=>{
   try{
    const response = await axios.get(userServiceUrl + '/friend-requests/received', {
    headers: {
      Authorization: req.headers.authorization
    }
  });

    res.json(response.data);
  }catch (error) {
    console.error("Error en /friend-requests/received:", error.message);
    res.status(500).json({ error: "Error al obtener amigos" });
  }
});
app.get("/friend-requests/sent", authMiddleware, ensurePremium, async(req, res)=>{
   try{
    const response = await axios.get(userServiceUrl + '/friend-requests/sent', {
    headers: {
      Authorization: req.headers.authorization
    }
  });

    res.json(response.data);
  }catch (error) {
    console.error("Error en /friend-requests/sent:", error.message);
    res.status(500).json({ error: "Error al obtener solicitudes enviadas" });
  }
});

app.put("/friend-requests/:requestId/accept", authMiddleware, ensurePremium, async(req, res) => {
  try {
    console.log("🔄 Gateway: Procesando aceptación de solicitud:", req.params.requestId);
    
    const response = await axios.put(
      `${userServiceUrl}/friend-requests/${req.params.requestId}/accept`, 
      req.body, // Enviar el body si hay datos
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );
    
    console.log("✅ Gateway: Solicitud aceptada exitosamente");
    res.json(response.data);
  } catch (error) {
    console.error("❌ Gateway Error en /friend-requests/accept:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || "Error al aceptar solicitud de amistad",
      details: error.response?.data
    });
  }
});

// Rechazar solicitud de amistad 
app.put("/friend-requests/:requestId/reject", authMiddleware, ensurePremium, async(req, res) => {
  try {
    console.log("🔄 Gateway: Procesando rechazo de solicitud:", req.params.requestId);
    
    const response = await axios.put(
      `${userServiceUrl}/friend-requests/${req.params.requestId}/reject`, 
      req.body,
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );
    
    console.log("✅ Gateway: Solicitud rechazada exitosamente");
    res.json(response.data);
  } catch (error) {
    console.error("❌ Gateway Error en /friend-requests/reject:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || "Error al rechazar solicitud de amistad",
      details: error.response?.data
    });
  }
});
// Eliminar amigo 
app.delete("/friends/:friendId", authMiddleware, ensurePremium, async(req, res) => {
  try {
    console.log("🔄 Gateway: Eliminando amigo:", req.params.friendId);
    
    const response = await axios.delete(
      `${userServiceUrl}/friends/${req.params.friendId}`,
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );
    
    console.log("✅ Gateway: Amigo eliminado exitosamente");
    res.json(response.data);
  } catch (error) {
    console.error("❌ Gateway Error en /friends/delete:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || "Error al eliminar amigo",
      details: error.response?.data
    });
  }
});

// Obtener usuario por ID 
app.get("/users/:userId", authMiddleware, async(req, res) => {
  try {
    console.log("🔄 Gateway: Obteniendo usuario:", req.params.userId);
    
    const response = await axios.get(
      `${userServiceUrl}/users/${req.params.userId}`,
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error("❌ Gateway Error en /users/:userId:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || "Error al obtener usuario",
      details: error.response?.data
    });
  }
});

app.post("/create-checkout-session", authMiddleware, async(req, res) => {
  try { 
    const response = await axios.post(
      `${paymentsServiceUrl}/create-checkout-session`, req.body,
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
  res.status(error.response?.status || 500).json({
    error: error.message,
    code: error.code,
    response: error.response?.data
  });
}
});
app.post("/create-checkout-session", authMiddleware, async(req, res) => {
  try { 
    const response = await axios.post(
      `${paymentsServiceUrl}/create-checkout-session`, req.body,
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {

  res.status(error.response?.status || 500).json({
    error: error.message,
    code: error.code,
    response: error.response?.data
  });
}
});

app.post("/verify-payment", authMiddleware, async(req, res) => {
  try { 
    const response = await axios.post(
      `${paymentsServiceUrl}/verify-payment`, req.body,
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {

  res.status(error.response?.status || 500).json({
    error: error.message,
    code: error.code,
    response: error.response?.data
  });
}
});

app.post("/cancel-subscription", authMiddleware, async(req, res) => {
  try { 
    console.log("🔄 Gateway: Procesando cancelación de suscripción para usuario:", req.user.id);
    
    const response = await axios.post(
      `${paymentsServiceUrl}/cancel-subscription`, {},
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {

  res.status(error.response?.status || 500).json({
    error: error.message,
    code: error.code,
    response: error.response?.data
  });
}
});

app.get('track/:id/details', authMiddleware, async(req, res) => {
  try { 
    const response = await axios.get(
      `${statsServiceUrl}/track/${req.params.id}/details`,
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || "Error al obtener usuario",
      details: error.response?.data
    });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});