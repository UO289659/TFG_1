/**
 * @fileoverview Servicio de autenticación y gestión de usuarios
 * @description API REST para manejo de autenticación, perfiles de usuario, amistades y funcionalidades premium
 * @version 1.0.0
 * @author Carmen Espinosa Martínez
 */
require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./user-model');
const FriendsRequest = require('./friends-request-model');
const cors = require("cors");
const {authMiddleware, ensurePremium} = require("./auth-middleware/index");
const crypto = require("crypto");
const axios = require("axios");
const { 
  validateRequiredFields, 
  generateResetToken,
} = require('./utils');
const app = express();
app.use(cors());
app.use(express.json());


mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ [Auth Service] Conectado a MongoDB"))
  .catch((err) => console.error("❌ [Auth Service] Error al conectar:", err));

/**
 * Registra un nuevo usuario en el sistema
 * @route POST /register
 * @description Crea una nueva cuenta de usuario con validación de email único y envío de correo de confirmación
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} req.body - Datos del nuevo usuario
 * @param {string} req.body.nombre - Nombre del usuario
 * @param {string} req.body.apellido - Apellido del usuario
 * @param {string} req.body.email - Correo electrónico único del usuario
 * @param {string} req.body.password - Contraseña del usuario (será encriptada)
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<void>} Token JWT y mensaje de confirmación
 * 
 * @example
 * // Solicitud exitosa
 * POST /register
 * Content-Type: application/json
 * 
 * {
 *   "nombre": "Juan",
 *   "apellido": "Pérez", 
 *   "email": "juan@ejemplo.com",
 *   "password": "mipassword123"
 * }
 * 
 * // Respuesta exitosa (200)
 * {
 *   "message": "Usuario registrado con éxito. Se ha enviado un correo de confirmación.",
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 * 
 * @throws {400} Email ya registrado o campos faltantes
 * @throws {500} Error interno del servidor o servicio de correo
 * 
 * @since 1.0.0
 */
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

       res.json({ message: "Usuario registrado con éxito. Se ha enviado un correo de confirmación.", token });

       // Crear el mensaje de correo informativo
    //const mailServiceUrl = process.env.MAIL_SERVICE_URL || 'http://localhost:5002';
    const mailServiceUrl = 'https://mail-service-tfg-ade3ftcea6fpb6fz.germanywestcentral-01.azurewebsites.net'

    // Enviar un correo informativo al usuario
    axios.post(`${mailServiceUrl}/send-registration-email`, {
      to: req.body.email,
      subject: 'Cuenta Creada - Gestor de Finanzas',
      message: `¡Hola ${req.body.nombre} ${req.body.apellido}!

      Tu cuenta en Gestor de Finanzas ha sido creada exitosamente. Ahora puedes comenzar a gestionar tus finanzas.

      Si no realizaste este registro, por favor contáctanos de inmediato.

      ¡Gracias por unirte a nosotros!
      `,
    }).catch(err => console.error('Error enviando correo:', err.message));
     
} catch (error) {
      res.status(400).json({ error: error.message }); 
      
  }});

  /**
 * Autentica un usuario existente
 * @route POST /login
 * @description Verifica credenciales y genera token JWT para acceso a la aplicación
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} req.body - Credenciales de acceso
 * @param {string} req.body.email - Correo electrónico del usuario
 * @param {string} req.body.password - Contraseña del usuario
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<void>} Token JWT y email del usuario
 * 
 * @example
 * // Solicitud exitosa
 * POST /login
 * Content-Type: application/json
 * 
 * {
 *   "email": "juan@ejemplo.com",
 *   "password": "mipassword123"
 * }
 * 
 * // Respuesta exitosa (200)
 * {
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "email": "juan@ejemplo.com"
 * }
 * 
 * @throws {400} Campos faltantes
 * @throws {401} Credenciales inválidas o usuario no encontrado
 * 
 * @since 1.0.0 
 */
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
        res.json({ token: token, email: email });
        
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      res.status(400).json({ error: error.message }); 
    }
  });

  /**
 * Obtiene el perfil del usuario autenticado
 * @route GET /profile
 * @description Recupera toda la información del perfil del usuario autenticado
 * @middleware authMiddleware - Requiere autenticación de usuario
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} req.user - Información del usuario autenticado (proporcionada por authMiddleware)
 * @param {string} req.user.id - ID único del usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<void>} Objeto completo del usuario
 * 
 * @example
 * // Solicitud exitosa
 * GET /profile
 * Authorization: Bearer <token>
 * 
 * // Respuesta exitosa (200)
 * {
 *   "_id": "60d21b4667d0d8992e610c85",
 *   "name": "Juan",
 *   "surname": "Pérez",
 *   "email": "juan@ejemplo.com",
 *   "isPremium": false,
 *   "friends": [],
 *   "createdAt": "2021-06-22T10:30:00.000Z"
 * }
 * 
 * @throws {401} Usuario no autenticado o no encontrado
 * @throws {500} Error interno del servidor
 * 
 * @since 1.0.0
 */
  app.get('/profile', authMiddleware, async (req, res)=>{
    try{
      const userId = req.user.id;
      const user = await User.findById(userId);
        if (!user) {
        return res.status(401).json({ error: "Usuario no encontrado" });
      }
      return res.json(user);
    }catch (error) {
    res.status(500).json({ error: "Error del servidor" });
  }
  });

  /**
 * Actualiza el perfil del usuario autenticado
 * @route PUT /profile
 * @description Permite al usuario actualizar su nombre y apellido
 * @middleware authMiddleware - Requiere autenticación de usuario
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} req.body - Nuevos datos del perfil
 * @param {string} req.body.name - Nuevo nombre del usuario
 * @param {string} req.body.surname - Nuevo apellido del usuario
 * @param {Object} req.user - Información del usuario autenticado
 * @param {string} req.user.id - ID único del usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<void>} Mensaje de confirmación y datos actualizados del usuario
 * 
 * @example
 * // Solicitud exitosa
 * PUT /profile
 * Authorization: Bearer <token>
 * Content-Type: application/json
 * 
 * {
 *   "name": "Juan Carlos",
 *   "surname": "Pérez García"
 * }
 * 
 * // Respuesta exitosa (200)
 * {
 *   "message": "Perfil actualizado correctamente",
 *   "user": {
 *     "_id": "60d21b4667d0d8992e610c85",
 *     "name": "Juan Carlos",
 *     "surname": "Pérez García",
 *     "email": "juan@ejemplo.com"
 *   }
 * }
 * 
 * @throws {400} Datos obligatorios faltantes
 * @throws {401} Usuario no autenticado
 * @throws {404} Usuario no encontrado
 * @throws {500} Error interno del servidor
 * 
 * @since 1.0.0
 */
  app.put('/profile', authMiddleware, async (req, res) => {
  try {
    const clientId = req.user.id; // Se obtiene del middleware de autenticación
    const { name, surname } = req.body;

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
    res.status(500).json({ message: "Error del servidor" });
  }
});

/**
 * Cambia la contraseña del usuario autenticado
 * @route PUT /password
 * @description Permite al usuario cambiar su contraseña actual por una nueva
 * @middleware authMiddleware - Requiere autenticación de usuario
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} req.body - Datos para cambio de contraseña
 * @param {string} req.body.actualPassword - Contraseña actual del usuario
 * @param {string} req.body.newPassword - Nueva contraseña deseada
 * @param {Object} req.user - Información del usuario autenticado
 * @param {string} req.user.id - ID único del usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<void>} Mensaje de confirmación del cambio
 * 
 * @example
 * // Solicitud exitosa
 * PUT /password
 * Authorization: Bearer <token>
 * Content-Type: application/json
 * 
 * {
 *   "actualPassword": "passwordViejo123",
 *   "newPassword": "passwordNuevo456"
 * }
 * 
 * // Respuesta exitosa (200)
 * {
 *   "message": "Contraseña actualizada correctamente"
 * }
 * 
 * @throws {400} Datos faltantes o contraseña actual incorrecta
 * @throws {401} Usuario no autenticado
 * @throws {404} Usuario no encontrado
 * @throws {500} Error interno del servidor
 * 
 * @since 1.0.0
 */
app.put("/password", authMiddleware, async(req, res) => {
  try{
  const clientId = req.user.id; // Se obtiene del middleware de autenticación
  const { actualPassword, newPassword } = req.body;
  if(!actualPassword || !newPassword){
    return res.status(400).json({ message: "Faltan datos obligatorios." });
  }
  const user = await User.findById(clientId);
  if(!user){
    return res.status(404).json({ message: "Usuario no encontrado" });
  }
 if(await bcrypt.compare(actualPassword, user.password)){
  const newHashedPassword= await bcrypt.hash(newPassword, 10);
  user.password=newHashedPassword;
  await user.save();
  res.json({ message: "Contraseña actualizada correctamente" });
 }else{
  return res.status(400).json({ message: "La contraseña actual es incorrecta." });
 }
  }catch (error) {
    res.status(500).json({ message: "Error del servidor" });
  }
 
});

/**
 * Solicita restablecimiento de contraseña
 * @route POST /forgot-password
 * @description Genera token de restablecimiento y envía correo con enlace de recuperación
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} req.body - Datos para solicitud de restablecimiento
 * @param {string} req.body.email - Correo electrónico del usuario
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<void>} Mensaje de confirmación del envío del correo
 * 
 * @example
 * // Solicitud exitosa
 * POST /forgot-password
 * Content-Type: application/json
 * 
 * {
 *   "email": "juan@ejemplo.com"
 * }
 * 
 * // Respuesta exitosa (200)
 * {
 *   "message": "Correo de restablecimiento enviado correctamente. Revisa tu bandeja de entrada."
 * }
 * 
 * @throws {400} Email requerido o usuario no encontrado
 * @throws {500} Error al procesar solicitud o enviar correo
 * 
 * @since 1.0.0
 */
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
    const resetToken = generateResetToken();

    // guardar el token en la base de datos, junto con su vencimiento, para usarlo en la verificación
    user.resetToken = resetToken;
    user.resetTokenExpiration = Date.now() + 3600000; // 1 hora de validez

    await user.save();

  // Enviar el correo a través del mail-service
    const mailServiceUrl = process.env.MAIL_SERVICE_URL || 'http://localhost:5002';
    const resetLink = `frontend-tfg-c6fuffcge4ceg0cv.germanywestcentral-01.azurewebsites.net/reset-password/${resetToken}`;
    
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
    res.status(500).json({ error: "Error al procesar la solicitud." });
  }
});


/**
 * Restablece contraseña usando token de recuperación
 * @route POST /reset-password/:token
 * @description Permite establecer nueva contraseña usando token válido de restablecimiento
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} req.params - Parámetros de la ruta
 * @param {string} req.params.token - Token de restablecimiento generado anteriormente
 * @param {Object} req.body - Nueva contraseña
 * @param {string} req.body.password - Nueva contraseña del usuario
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<void>} Mensaje de confirmación del restablecimiento
 * 
 * @example
 * // Solicitud exitosa
 * POST /reset-password/abc123def456...
 * Content-Type: application/json
 * 
 * {
 *   "password": "nuevaPassword123"
 * }
 * 
 * // Respuesta exitosa (200)
 * {
 *   "message": "Contraseña restablecida con éxito. Puede cerrar esta ventana."
 * }
 * 
 * @throws {400} Token inválido, expirado o contraseña faltante
 * @throws {500} Error interno del servidor
 * 
 * @since 1.0.0
 */
app.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if(!password){
    return res.status(400).json({ error: "La nueva contraseña es requerida." });
  }

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
    res.status(500).json({ error: "Error al restablecer la contraseña." });
  }
});


/**
 * Obtiene la lista de amigos del usuario autenticado
 * @route GET /friends
 * @description Recupera todos los amigos activos del usuario autenticado con su información básica
 * @middleware authMiddleware - Requiere autenticación de usuario
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} req.user - Información del usuario autenticado
 * @param {string} req.user.id - ID único del usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<void>} Array de amigos con información básica
 * 
 * @example
 * // Solicitud exitosa
 * GET /friends
 * Authorization: Bearer <token>
 * 
 * // Respuesta exitosa (200)
 * [
 *   {
 *     "_id": "60d21b4667d0d8992e610c86",
 *     "name": "María",
 *     "surname": "García",
 *     "email": "maria@ejemplo.com",
 *     "avatar": "avatar_url",
 *     "friendSince": "2021-06-22T10:30:00.000Z"
 *   }
 * ]
 * 
 * @throws {401} Usuario no autenticado
 * @throws {404} Usuario no encontrado
 * @throws {500} Error interno del servidor
 * 
 * @since 1.0.0
 */
app.get("/friends", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends.userId', 'name surname email')
      .select('friends');

      if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
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
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtiene lista de usuarios premium (funcionalidad administrativa)
 * @route GET /users
 * @description Recupera todos los usuarios con suscripción premium activa
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<void>} Array de usuarios premium
 * 
 * @example
 * // Solicitud exitosa
 * GET /users
 * 
 * // Respuesta exitosa (200)
 * [
 *   {
 *     "_id": "60d21b4667d0d8992e610c85",
 *     "name": "Juan",
 *     "surname": "Pérez",
 *     "email": "juan@ejemplo.com",
 *     "isPremium": true
 *   }
 * ]
 * 
 * @throws {500} Error interno del servidor
 * 
 * @since 1.0.0
 */
  app.get('/users', async (req, res)=>{
    try{
      const users = await User.find({isPremium:true});
      return res.json(users);
    }catch (error) {
    res.status(500).json({ error: "Error del servidor" });
  }
  });


/**
 * Actualiza datos de usuario (endpoint interno y autenticado)
 * @route PATCH /users/:userId
 * @description Permite actualizar datos de usuario desde payments-service o usuario autenticado
 * @middleware Dual authentication - API key interna o authMiddleware
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} req.params - Parámetros de la ruta
 * @param {string} req.params.userId - ID único del usuario a actualizar
 * @param {Object} req.body - Campos a actualizar
 * @param {boolean} [req.body.isPremium] - Estado de suscripción premium
 * @param {Date} [req.body.planExpirationDate] - Fecha de expiración del plan
 * @param {boolean} [req.body.subscriptionActive] - Estado activo de suscripción
 * @param {string} [req.body.stripeCustomerId] - ID del cliente en Stripe
 * @param {string} [req.body.stripeSubscriptionId] - ID de suscripción en Stripe
 * @param {string} [req.body.billingCycle] - Ciclo de facturación
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<void>} Usuario actualizado con información básica
 * 
 * @example
 * // Solicitud desde payments-service
 * PATCH /users/60d21b4667d0d8992e610c85
 * X-Internal-Api-Key: internal_key_123
 * Content-Type: application/json
 * 
 * {
 *   "isPremium": true,
 *   "planExpirationDate": "2024-12-31T23:59:59.000Z",
 *   "subscriptionActive": true
 * }
 * 
 * // Respuesta exitosa (200)
 * {
 *   "message": "Usuario actualizado correctamente",
 *   "user": {
 *     "id": "60d21b4667d0d8992e610c85",
 *     "email": "juan@ejemplo.com",
 *     "name": "Juan",
 *     "surname": "Pérez",
 *     "isPremium": true,
 *     "planExpirationDate": "2024-12-31T23:59:59.000Z"
 *   }
 * }
 * 
 * @throws {400} ID de usuario inválido
 * @throws {401} No autorizado (sin API key ni token válido)
 * @throws {404} Usuario no encontrado
 * @throws {500} Error interno del servidor
 * 
 * @since 1.0.0
 */
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
    res.status(500).json({ error: "Error del servidor" });
  }
});

/**
 * Envía una solicitud de amistad a otro usuario
 * @route POST /send-friend-request
 * @middleware authMiddleware - Verificación de autenticación
 * @middleware ensurePremium - Verificación de suscripción premium
 * @param {Object} req - Objeto de petición Express
 * @param {Object} req.body - Cuerpo de la petición
 * @param {string} req.body.senderId - ID del usuario que envía la solicitud
 * @param {string} req.body.receiverId - ID del usuario que recibe la solicitud
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 * @throws {400} - Faltan datos obligatorios o usuario intenta enviarse solicitud a sí mismo
 * @throws {404} - Usuario emisor o receptor no encontrado
 * @throws {500} - Error del servidor
 * @example
 * // POST /send-friend-request
 * // Body: { "senderId": "60f7b1b3b3b3b3b3b3b3b3b3", "receiverId": "60f7b1b3b3b3b3b3b3b3b3b4" }
 */
  app.post("/send-friend-request", authMiddleware, ensurePremium,async (req, res)=>{
    try{
    const { senderId, receiverId } = req.body;
    if(!senderId || !receiverId){
      return res.status(400).json({ message: "Faltan datos obligatorios." });
    }
    const sender= await User.findById(senderId);
    const receiver= await User.findById(receiverId);

    if(!sender || !receiver){
      return res.status(404).json({ message: "Usuario emisor o receptor no encontrado." });
    }
  
    if(senderId === receiverId){
      return res.status(400).json({ message: "No puedes enviarte una solicitud de amistad a ti mismo." });
    }
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

  /**
 * Obtiene las solicitudes de amistad recibidas por el usuario autenticado
 * @route GET /friend-requests/received
 * @middleware authMiddleware - Verificación de autenticación
 * @middleware ensurePremium - Verificación de suscripción premium
 * @param {Object} req - Objeto de petición Express
 * @param {Object} req.user - Usuario autenticado
 * @param {string} req.user.id - ID del usuario autenticado
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 * @throws {404} - Usuario no encontrado
 * @throws {500} - Error del servidor
 * @example
 * // GET /friend-requests/received
 * // Response: [{ "_id": "...", "senderId": { "name": "Juan", "surname": "Pérez", "email": "juan@email.com" }, ... }]
 */
  app.get('/friend-requests/received', authMiddleware, ensurePremium, async (req, res)=>{
    try{
     const userId = req.user.id;
    
    // Verificar si el usuario existe
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
      const requests= await FriendsRequest.find({receiverId:userId, status:"pending"})
      .populate('senderId', 'name surname email') // Campos que quieres obtener
      .sort({ createdAt: -1 });
      res.json(requests);
    }catch (error) {
    res.status(500).json({ error: "Error del servidor" });
  }
  });

  /**
 * Obtiene las solicitudes de amistad enviadas por el usuario autenticado
 * @route GET /friend-requests/sent
 * @middleware authMiddleware - Verificación de autenticación
 * @middleware ensurePremium - Verificación de suscripción premium
 * @param {Object} req - Objeto de petición Express
 * @param {Object} req.user - Usuario autenticado
 * @param {string} req.user.id - ID del usuario autenticado
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 * @throws {404} - Usuario no encontrado
 * @throws {500} - Error del servidor
 * @example
 * // GET /friend-requests/sent
 * // Response: [{ "_id": "...", "receiverId": { "name": "Ana", "surname": "García", "email": "ana@email.com" }, ... }]
 */
  app.get('/friend-requests/sent', authMiddleware, ensurePremium, async (req, res)=>{
    try{
      const userId = req.user.id;
      const user = await User.findById(userId);

      if(!user){
        return res.status(404).json({error: "Usuario no encontrado"});
      }

      const requests= await FriendsRequest.find({senderId:userId, status:"pending"})
       .populate('receiverId', 'name surname email'); // Campos que quieres obtener
      res.json(requests);
    }catch (error) {
    res.status(500).json({ error: "Error del servidor" });
  }
  });

/**
 * Acepta una solicitud de amistad y crea la relación de amistad entre los usuarios
 * @route PUT /friend-requests/:requestId/accept
 * @middleware authMiddleware - Verificación de autenticación
 * @middleware ensurePremium - Verificación de suscripción premium
 * @param {Object} req - Objeto de petición Express
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.requestId - ID de la solicitud de amistad
 * @param {Object} req.user - Usuario autenticado
 * @param {string} req.user.id - ID del usuario autenticado
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 * @throws {400} - La solicitud ya ha sido procesada
 * @throws {403} - No autorizado (no es el receptor de la solicitud)
 * @throws {404} - Solicitud no encontrada
 * @throws {500} - Error del servidor
 * @example
 * // PUT /friend-requests/60f7b1b3b3b3b3b3b3b3b3b3/accept
 * // Response: { "message": "Solicitud aceptada y amistad creada", "request": {...}, "friendship": {...} }
 */
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

/**
 * Rechaza una solicitud de amistad
 * @route PUT /friend-requests/:requestId/reject
 * @middleware authMiddleware - Verificación de autenticación
 * @middleware ensurePremium - Verificación de suscripción premium
 * @param {Object} req - Objeto de petición Express
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.requestId - ID de la solicitud de amistad
 * @param {Object} req.user - Usuario autenticado
 * @param {string} req.user.id - ID del usuario autenticado
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 * @throws {400} - La solicitud ya ha sido procesada
 * @throws {403} - No autorizado (no es el receptor de la solicitud)
 * @throws {404} - Solicitud no encontrada
 * @throws {500} - Error del servidor
 * @example
 * // PUT /friend-requests/60f7b1b3b3b3b3b3b3b3b3b3/reject
 * // Response: { "message": "Solicitud rechazada" }
 */
app.put("/friend-requests/:requestId/reject", authMiddleware, ensurePremium, async (req, res) => {
  try {
    const request = await FriendsRequest.findById(req.params.requestId);
    
    if (!request) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }
    
    if (request.receiverId.toString() !== req.user.id) {
      return res.status(403).json({ error: "No autorizado" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: "La solicitud ya ha sido procesada" });
    }
    
    request.status = 'rejected';
    await request.save();
    
    res.json({ message: "Solicitud rechazada" });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Elimina una amistad entre dos usuarios
 * @route DELETE /friends/:friendId
 * @middleware authMiddleware - Verificación de autenticación
 * @middleware ensurePremium - Verificación de suscripción premium
 * @param {Object} req - Objeto de petición Express
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.friendId - ID del amigo a eliminar
 * @param {Object} req.user - Usuario autenticado
 * @param {string} req.user.id - ID del usuario autenticado
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 * @throws {404} - Usuario no encontrado
 * @throws {500} - Error del servidor
 * @example
 * // DELETE /friends/60f7b1b3b3b3b3b3b3b3b3b4
 * // Response: { "message": "Amigo eliminado correctamente" }
 */
app.delete("/friends/:friendId", authMiddleware,ensurePremium, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.friendId;
    
    // Remover de ambos usuarios
    const user=await User.findByIdAndUpdate(userId, {
      $pull: { friends: { userId: friendId } }
    });

    if(!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    const friend=await User.findByIdAndUpdate(friendId, {
      $pull: { friends: { userId: userId } }
    });

    if(!friend) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    res.json({ message: "Amigo eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtiene la información de un usuario por su ID
 * @route GET /users/:userId
 * @middleware authMiddleware - Verificación de autenticación (opcional con clave interna)
 * @param {Object} req - Objeto de petición Express
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.userId - ID del usuario a buscar
 * @param {Object} req.headers - Headers de la petición
 * @param {string} [req.headers.x-internal-api-key] - Clave interna para bypass de auth
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 * @throws {400} - ID de usuario inválido
 * @throws {404} - Usuario no encontrado
 * @throws {500} - Error del servidor
 * @example
 * // GET /users/60f7b1b3b3b3b3b3b3b3b3b3
 * // Response: { "_id": "...", "name": "Juan", "surname": "Pérez", "email": "juan@email.com", ... }
 */
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
    
    const user = await User.findById(userId).select('name surname email avatar _id stripeSubscriptionId');
    
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

/**
 * Elimina todos los amigos de un usuario específico
 * @route PATCH /delete-all-friends/:userId
 * @middleware authMiddleware - Verificación de autenticación (opcional con clave interna)
 * @param {Object} req - Objeto de petición Express
 * @param {Object} req.params - Parámetros de la URL
 * @param {string} req.params.userId - ID del usuario al que se le eliminarán todos los amigos
 * @param {Object} req.headers - Headers de la petición
 * @param {string} [req.headers.x-internal-api-key] - Clave interna para bypass de auth
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>}
 * @throws {404} - Usuario no encontrado
 * @throws {500} - Error del servidor
 * @example
 * // PATCH /delete-all-friends/60f7b1b3b3b3b3b3b3b3b3b3
 * // Headers: { "x-internal-api-key": "your-internal-key" }
 * // Response: { "success": true, "message": "Todos los amigos han sido eliminados correctamente" }
 */
app.patch("/delete-all-friends/:userId", async (req, res, next) => {
  // Verificar si es una llamada interna
  if (req.headers['x-internal-api-key'] === process.env.INTERNAL_API_KEY) {
    return next();
  }
  // Si no, usar el authMiddleware normal
  return authMiddleware(req, res, next);
}, async (req, res) => {
  try {
    const userId = req.params.userId; // Corregido: era friendId
    
    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }
    
    // Eliminar todos los amigos del usuario especificado
    await User.findByIdAndUpdate(userId, {
      $set: { friends: [] }
    });

    // Eliminar al usuario de las listas de amigos de otros usuarios
    await User.updateMany(
      { 'friends.userId': userId }, // condición: usuarios que tengan a userId en sus amigos
      { $pull: { friends: { userId: userId } } } // acción: eliminar ese objeto del array
    );

    res.status(200).json({
      success: true,
      message: 'Todos los amigos han sido eliminados correctamente'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Auth service corriendo en puerto ${PORT}`);
  });

app.post('/users/batch', async (req, res) => {
  try {
    const { userIds } = req.body;
    
    const users = await User.find({
      _id: { $in: userIds }
    }).select('_id name surname').lean();
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

app.get('/health', (req, res) => res.send('OK'));


module.exports = app;