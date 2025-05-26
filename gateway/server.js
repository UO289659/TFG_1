require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require('axios');
const authMiddleware = require("../backend/auth-middleware/index");
console.log("Middleware cargado:", authMiddleware);
const app = express();
app.use(cors());
app.use(express.json());

const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:5000';
const statsServiceUrl = process.env.STATS_SERVICE_URL || 'http://localhost:5001';

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
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || "Error interno"
    });
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
      params: {
        clientId: req.user.userId , 
      },
    });
    
    res.json(response.data);
  } catch (error) {
    console.error("Error en /profile:", error.message);
    res.status(500).json({ error: "Error al obtener gastos" });
  }
});