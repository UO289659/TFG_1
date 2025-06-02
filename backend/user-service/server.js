require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./user-model')
const cors = require("cors");
const authMiddleware = require("../auth-middleware/index");
const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ [Auth Service] Conectado a MongoDB"))
  .catch((err) => console.error("❌ [Auth Service] Error al conectar:", err));

  // Function to validate required fields in the request body
function validateRequiredFields(req, requiredFields) {
  for (const field of requiredFields) {
    if (!(field in req.body)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  console.log("cumple required fields");
}

app.post('/register', async (req, res) => {
  
  try {
      // Check if required fields are present in the request body
      validateRequiredFields(req, ['nombre', 'apellido', 'email', 'password']);

      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        throw new Error("El correo ya está registrado");
      }
      // Encrypt the password before saving it
      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      const newUser = new User({
          name:req.body.nombre,
          surname: req.body.apellido,
          email: req.body.email,
          password: hashedPassword,
      });

      await newUser.save();
      res.json({ message: "Usuario registrado con éxito" });
  } catch (error) {
      res.status(400).json({ error: error.message }); 
  }});

  app.post('/login', async (req, res) => {
    try {
      // Check if required fields are present in the request body
      validateRequiredFields(req, ['email', 'password']);
  
      const { email, password } = req.body;
  
      // Find the user by username in the database
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: "Usuario no encontrado" });
      }
  
      // Check if the user exists and verify the password
      if (user && await bcrypt.compare(password, user.password)) {
        // Generate a JWT token
        const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '1h' });
        // Respond with the token and user information
        res.json({ token: token, email: email, createdAt: user.createdAt });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/profile', authMiddleware, async (req, res)=>{
    try{
      const userId = req.user.id;
      const user = await User.findById(userId);
        if (!user) {
        return res.status(401).json({ error: "Usuario no encontrado" });
      }
      console.log(user);
      return res.json(user);
    }catch (error) {
      console.log(error);
    res.status(500).json({ error: "Error del servidor" });
  }
  });

  app.put('/profile', authMiddleware, async (req, res) => {
  try {
    const clientId = req.user.id; // Se obtiene del middleware de autenticación
    const { name, surname } = req.body;

     console.log('req.user:', req.user);
    console.log('req.body:', req.body);

    if (!name || !surname) {
      return res.status(400).json({ message: "Faltan datos obligatorios." });
    }

    const user = await User.findById(clientId);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    user.name = name;
    user.surname = surname;

    await user.save();

    res.json({ message: "Perfil actualizado correctamente", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error del servidor" });
  }
});

app.put("/password", authMiddleware, async(req, res) => {
  try{
  const clientId = req.user.id; // Se obtiene del middleware de autenticación
  const { actualPassword, newPassword } = req.body;
  const user = await User.findById(clientId);
 if(await bcrypt.compare(actualPassword, user.password)){
  const newHashedPassword= await bcrypt.hash(newPassword, 10);
  user.password=newHashedPassword;
  await user.save();
  res.json({ message: "Contraseña actualizada correctamente" });
 }
  }catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error del servidor" });
  }
 
});

app.post("/subscribe", authMiddleware, async (req, res) => {
  try {
    const clientId = req.user.id;
    const { plan } = req.body;

    const user = await User.findById(clientId);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    user.isPremium = plan === 'premium'; // Si eligió premium, marcarlo
    await user.save();

    res.json({ message: "Plan actualizado correctamente", user });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar plan" });
  }
});


  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Auth service corriendo en puerto ${PORT}`);
  });