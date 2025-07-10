require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./user-model');
const FriendsRequest = require('./friends-request-model');
const cors = require("cors");
const {authMiddleware, ensurePremium} = require("../auth-middleware/index");
const crypto = require("crypto");
const axios = require("axios");
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
          isPremium: false,
      });

      await newUser.save();
    
      const token = jwt.sign({ userId: newUser._id, isPremium: newUser.isPremium, email:newUser.email }, process.env.SECRET_KEY, { expiresIn: '1h' });
       // Crear el mensaje de correo informativo
    const mailServiceUrl = process.env.MAIL_SERVICE_URL || 'http://localhost:5002';

    // Enviar un correo informativo al usuario
    await axios.post(`${mailServiceUrl}/send-registration-email`, {
      to: req.body.email,
      subject: 'Cuenta Creada - Gestor de Finanzas',
      message: `¡Hola ${req.body.nombre} ${req.body.apellido}!

      Tu cuenta en Gestor de Finanzas ha sido creada exitosamente. Ahora puedes comenzar a gestionar tus finanzas.

      Si no realizaste este registro, por favor contáctanos de inmediato.

      ¡Gracias por unirte a nosotros!
      `,
    });
      res.json({ message: "Usuario registrado con éxito. Se ha enviado un correo de confirmación.", token });
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
        const token = jwt.sign({ userId: user._id, isPremium: user.isPremium, email: user.email }, process.env.SECRET_KEY, { expiresIn: '1h' });
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
 }else{
  console.log("la contrasela actual es incorrecta");
  return res.status(400).json({ message: "La contraseña actual es incorrecta." });
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
    
    // Validar el plan
    if (!plan || !['basic', 'premium'].includes(plan)) {
      return res.status(400).json({ 
        message: "Plan inválido. Debe ser 'basic' o 'premium'" 
      });
    }  
    const user = await User.findById(clientId);
  
    if (!user) {    
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Actualizar el plan del usuario
    user.isPremium = plan === 'premium';
    user.billingCycle = null;
    user.planExpirationDate = null;
    user.stripeSubscriptionId=null;
   
    await user.save();  
    
    // Generar un NUEVO token con la información actualizada
    const tokenPayload = { 
      userId: user._id,
      email: user.email,
      isPremium: user.isPremium 
    };
    
    const newToken = jwt.sign(
      tokenPayload,
     process.env.SECRET_KEY,
      { expiresIn: '7d' }
    );
    
    // Preparar respuesta
    const responseData = { 
      message: "Plan actualizado correctamente",
      token: newToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        isPremium: user.isPremium
      }
    };
    
    // UNA SOLA RESPUESTA
    res.json(responseData);
  } catch (error) {
    // Verificar si ya se envió una respuesta
    if (res.headersSent) {
      console.error('⚠️ SUBSCRIBE: Headers ya enviados - no se puede enviar respuesta de error');
      return;
    }
    
    res.status(500).json({ 
      message: "Error al actualizar plan",
      error: error.message 
    });
  }
});

// Ruta para solicitar el restablecimiento de la contraseña
app.post("/forgot-password", async (req, res) => {
  
  const { email } = req.body;
  if (!email) {
  return res.status(400).json({ error: "El correo electrónico es requerido" });
}

  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ error: "No se encontró un usuario con ese correo electrónico." });
    }

    // Generar un token de restablecimiento
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Aquí puedes guardar el token en la base de datos, junto con su vencimiento, para usarlo en la verificación
    user.resetToken = resetToken;
    user.resetTokenExpiration = Date.now() + 3600000; // 1 hora de validez

    await user.save();

  // Enviar el correo a través del mail-service
    const mailServiceUrl = process.env.MAIL_SERVICE_URL || 'http://localhost:5002';
    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
    
    const mailResponse =await axios.post(`${mailServiceUrl}/send-reset-email`, {
      to: email,
      resetLink: resetLink
    });

    // Si el correo fue enviado correctamente, devolver un mensaje de éxito
    if (mailResponse.status === 200) {
      return res.status(200).json({ message: "Correo de restablecimiento enviado correctamente. Revisa tu bandeja de entrada." });
    } else {
      // Si el servicio de correo respondió con un error, manejarlo
      return res.status(500).json({ error: "Hubo un problema al enviar el correo." });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al procesar la solicitud." });
  }
});


app.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() }, // Verifica que el token no haya expirado
    });

    if (!user) {
      return res.status(400).json({ error: "Token de restablecimiento inválido o expirado." });
    }

    const newHashedPassword= await bcrypt.hash(password, 10);
    user.password=newHashedPassword;
    user.resetToken = undefined; // Limpiar el token de restablecimiento
    user.resetTokenExpiration = undefined; // Limpiar la expiración del token
    await user.save();

    res.json({ message: "Contraseña restablecida con éxito. Puede cerrar esta ventana." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al restablecer la contraseña." });
  }
});

app.get("/friends", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends.userId', 'name surname email')
      .select('friends');
    
    // Filtrar solo amigos activos
    const activeFriends = user.friends
      .filter(friend => friend.status === 'active')
      .map(friend => ({
        _id: friend.userId._id,
        name: friend.userId.name,
        surname: friend.userId.surname,
        email: friend.userId.email,
        avatar: friend.userId.avatar,
        friendSince: friend.friendSince
      }));
    
    res.json(activeFriends);
  } catch (error) {
    console.error("Error al obtener amigos:", error);
    res.status(500).json({ error: error.message });
  }
});
  app.get('/users', async (req, res)=>{
    try{
      const users = await User.find({isPremium:true});
       console.log(users);
      return res.json(users);
    }catch (error) {
      console.log(error);
    res.status(500).json({ error: "Error del servidor" });
  }
  });


// Endpoint para actualizar datos de usuario (usado por payments-service)
app.patch('/users/:userId', async (req, res, next) => {
  // Permitir acceso si la clave interna es válida
  if (req.headers['x-internal-api-key'] === process.env.INTERNAL_API_KEY) {
    return next();
  }
  // Si no, usar el authMiddleware normal
  return authMiddleware(req, res, next);
}, async (req, res) => {
  try {
    const userId = req.params.userId;
    // Validar que el ID sea válido
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    // Campos que se pueden actualizar desde payments-service
    const allowedFields = [
      'isPremium',  
      'planExpirationDate', 
      'subscriptionActive', 
      'stripeCustomerId', 
      'stripeSubscriptionId', 
      'billingCycle'
    ];
    // Actualizar solo los campos permitidos
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });
    await user.save();
    console.log(`✅ Usuario ${user.email} actualizado desde payments-service`);
    res.json({ 
      message: "Usuario actualizado correctamente",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        isPremium: user.isPremium,
        planExpirationDate: user.planExpirationDate,
        subscriptionActive: user.subscriptionActive,
        billingCycle: user.billingCycle
      }
    });
  } catch (error) {
    console.error("❌ Error al actualizar usuario:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

  app.post("/send-friend-request", authMiddleware, ensurePremium,async (req, res)=>{
    try{
    const { senderId, receiverId } = req.body;

      const newFriendRequest=new FriendsRequest({
        senderId:senderId,
        receiverId: receiverId,
        status:"pending",
      });
      await newFriendRequest.save();
      res.json({ message: "Solicitud de amistad enviada con éxito." });
    }catch(error){
       res.status(400).json({ error: error.message }); 
    }
  });

  app.get('/friend-requests/received', authMiddleware, ensurePremium, async (req, res)=>{
    try{
      const userId = req.user.id;
      const requests= await FriendsRequest.find({receiverId:userId, status:"pending"})
      .populate('senderId', 'name surname email') // Campos que quieres obtener
      .sort({ createdAt: -1 });
      res.json(requests);
    }catch (error) {
      console.log(error);
    res.status(500).json({ error: "Error del servidor" });
  }
  });
  app.get('/friend-requests/sent', authMiddleware, ensurePremium, async (req, res)=>{
    try{
      const userId = req.user.id;
      const requests= await FriendsRequest.find({senderId:userId, status:"pending"})
       .populate('receiverId', 'name surname email') // Campos que quieres obtener
      res.json(requests);
    }catch (error) {
      console.log(error);
    res.status(500).json({ error: "Error del servidor" });
  }
  });

  // Aceptar solicitud
app.put("/friend-requests/:requestId/accept", authMiddleware, ensurePremium, async (req, res) => {
  try {
    const request = await FriendsRequest.findById(req.params.requestId)
      .populate('senderId', 'name surname email')
      .populate('receiverId', 'name surname email');
        
    if (!request) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }
        
    if (request.receiverId._id.toString() !== req.user.id) {
      return res.status(403).json({ error: "No autorizado" });
    }

    // Verificar que la solicitud esté pendiente
    if (request.status !== "pending") {
      return res.status(400).json({ error: "La solicitud ya ha sido procesada" });
    }
        
    // Actualizar estado de la solicitud
    request.status = "accepted";
    await request.save();
        
    // Agregar la relación de amistad en ambos usuarios
    const senderId = request.senderId._id;
    const receiverId = request.receiverId._id;
    
    // Agregar el sender a la lista de amigos del receiver
    await User.findByIdAndUpdate(
      receiverId,
      { 
        $addToSet: { 
          friends: {
            userId: senderId,
            friendSince: new Date(),
            status: 'active'
          }
        }
      }
    );
    
    // Agregar el receiver a la lista de amigos del sender
    await User.findByIdAndUpdate(
      senderId,
      { 
        $addToSet: { 
          friends: {
            userId: receiverId,
            friendSince: new Date(),
            status: 'active'
          }
        }
      }
    );
        
    res.json({
      message: "Solicitud aceptada y amistad creada",
      request,
      friendship: {
        user1: request.senderId.name,
        user2: request.receiverId.name,
        createdAt: new Date()
      }
    });
        
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Rechazar solicitud
app.put("/friend-requests/:requestId/reject", authMiddleware, ensurePremium, async (req, res) => {
  try {
    const request = await FriendsRequest.findById(req.params.requestId);
    
    if (!request) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }
    
    if (request.receiverId.toString() !== req.user.id) {
      return res.status(403).json({ error: "No autorizado" });
    }
    
    request.status = 'rejected';
    await request.save();
    
    res.json({ message: "Solicitud rechazada" });
    
  } catch (error) {
    console.error("Error al rechazar solicitud:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/friends/:friendId", authMiddleware,ensurePremium, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.friendId;
    
    // Remover de ambos usuarios
    await User.findByIdAndUpdate(userId, {
      $pull: { friends: { userId: friendId } }
    });
    
    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: { userId: userId } }
    });
    
    res.json({ message: "Amigo eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar amigo:", error);
    res.status(500).json({ error: error.message });
  }
});

  app.get('/users/:userId', async (req, res, next) => {
     // Permitir acceso si la clave interna es válida
  if (req.headers['x-internal-api-key'] === process.env.INTERNAL_API_KEY) {
    return next();
  }
  // Si no, usar el authMiddleware normal
  return authMiddleware(req, res, next);
}, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Validar que el ID sea válido
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }
    
    const user = await User.findById(userId).select('name surname email avatar _id');
    
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    console.log("✅ Usuario encontrado:", user);
    res.json(user);
  } catch (error) {
    console.error("❌ Error al obtener usuario por ID:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Auth service corriendo en puerto ${PORT}`);
  });

// Agregar INTERNAL_API_KEY a las variables requeridas
const requiredEnvVars = [
  'MONGO_URI', 'SECRET_KEY', 'INTERNAL_API_KEY'
];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Variable de entorno requerida no encontrada: ${varName}`);
    process.exit(1);
  }
});