const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./user-model');
const FriendsRequest = require('./friends-request-model');

// Define clientId ANTES del mock
const clientId = '507f1f77bcf86cd799439011';
const clientId2 = '507f1f77bcf86cd799439012';
const clientId3 = '507f1f77bcf86cd799439013';
const clientId4 = '507f1f77bcf86cd799439014';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.SECRET_KEY = 'test-secret-key';
process.env.INTERNAL_API_KEY = 'test-internal-key';

// Mocks
jest.mock('../auth-middleware/index', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: clientId };
    next();
  },
  ensurePremium: (req, res, next) => {
    if (req.user && req.user.id) {
      next();
    } else {
      res.status(403).json({ error: 'Premium required' });
    }
  }
}));

jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({ status: 200 })
}));

let mongoServer;
let app;

// Datos de prueba
const sampleUser = {
  nombre: 'Test',
  apellido: 'User',
  email: 'test@example.com',
  password: 'password123'
};

const sampleLogin = {
  email: 'test@example.com',
  password: 'password123'
};

// Función para agregar datos de prueba
async function addTestData() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  // Crear usuarios de prueba
  await User.create([
    {
      _id: new mongoose.Types.ObjectId(clientId),
      name: 'Test',
      surname: 'User',
      email: 'test@example.com',
      password: hashedPassword,
      isPremium: false,
      friends: [
        {
          userId: new mongoose.Types.ObjectId(clientId2),
          friendSince: new Date(),
          status: 'active'
        }
      ]
    },
    {
      _id: new mongoose.Types.ObjectId(clientId2),
      name: 'Premium',
      surname: 'User',
      email: 'premium@example.com',
      password: hashedPassword,
      isPremium: true,
      friends: [
        {
          userId: new mongoose.Types.ObjectId(clientId),
          friendSince: new Date(),
          status: 'active'
        },
         {
          userId: new mongoose.Types.ObjectId(clientId3),
          friendSince: new Date(),
          status: 'active'
        }
      ]
    },
    {
      _id: new mongoose.Types.ObjectId(clientId3),
      name: 'Another',
      surname: 'User',
      email: 'another@example.com',
      password: hashedPassword,
      isPremium: true,
      friends: [
        {
          userId: new mongoose.Types.ObjectId(clientId),
          friendSince: new Date(),
          status: 'active'
        },
      ]
    },
    {
      _id: new mongoose.Types.ObjectId(clientId4),
      name: 'No',
      surname: 'Requests',
      email: 'noRequests@example.com',
      password: hashedPassword,
      isPremium: false
    }
  ]);

  // Crear solicitudes de amistad de prueba
  await FriendsRequest.create([
    {
      senderId: new mongoose.Types.ObjectId(clientId2),
      receiverId: new mongoose.Types.ObjectId(clientId),
      status: 'pending'
    },
    {
      senderId: new mongoose.Types.ObjectId(clientId),
      receiverId: new mongoose.Types.ObjectId(clientId3),
      status: 'pending'
    },
    {
      senderId: new mongoose.Types.ObjectId(clientId),
      receiverId: new mongoose.Types.ObjectId(clientId2),
      status: 'accepted'
    }, 
     {
      senderId: new mongoose.Types.ObjectId(clientId3),
      receiverId: new mongoose.Types.ObjectId(clientId),
      status: 'accepted'
    }
  ]);
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGO_URI = mongoUri;
  
  // Conectar a la base de datos
  await mongoose.connect(mongoUri);
  
  // Importar la app después de configurar la base de datos
  app = require('./server');
  
  // Agregar datos de prueba
  await addTestData();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('Auth Service Tests', () => {

  describe('POST /register', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        nombre: 'New',
        apellido: 'User',
        email: 'newuser2@example.com',
        password: 'password123'
      };

      const res = await request(app)
        .post('/register')
        .send(newUser);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Usuario registrado con éxito. Se ha enviado un correo de confirmación.');
      expect(res.body.token).toBeDefined();

      // Verificar que el usuario fue creado en la base de datos
      const user = await User.findOne({ email: newUser.email });
      expect(user).toBeTruthy();
      expect(user.name).toBe(newUser.nombre);
      expect(user.surname).toBe(newUser.apellido);
      expect(user.isPremium).toBe(false);
    });

    it('should return 400 if email already exists', async () => {
      const res = await request(app)
        .post('/register')
        .send(sampleUser);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('El correo ya está registrado');
    });

    it('should return 400 if required fields are missing: nombre', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          email: 'test@example.com',
          apellido: 'User',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required field: nombre');
    });
    it('should return 400 if required fields are missing:email', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          nombre: 'Test',
          apellido: 'User',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required field: email');
    });
    it('should return 400 if required fields are missing: apellido', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          nombre: 'Test',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required field: apellido');
    });
    it('should return 400 if required fields are missing: password', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          nombre: 'Test',
          email: 'test@example.com',
          apellido: 'User',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required field: password');
    });
  });

  describe('POST /login', () => {
    it('should login user with valid credentials', async () => {
      const res = await request(app)
        .post('/login')
        .send(sampleLogin);
       
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.email).toBe(sampleLogin.email);
     

      // Verificar que el token es válido
      const decoded = jwt.verify(res.body.token, process.env.SECRET_KEY);
      expect(decoded.email).toBe(sampleLogin.email);
    });

    it('should return 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      const res = await request(app)
        .post('/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Usuario no encontrado');
    });

     it('should return 400 if required fields are missing: email', async () => {
      const res = await request(app)
        .post('/login')
        .send({
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required field: email');
    });

    it('should return 400 if required fields are missing: password', async () => {
      const res = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com'
          // Missing password
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required field: password');
    });
  });

  //?¿pruebas de restablecer contraseña?¿

  describe('GET /profile', () => {
    it('should get user profile', async () => {
      const res = await request(app)
        .get('/profile');

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('test@example.com');
      expect(res.body.name).toBe('Test');
      expect(res.body.surname).toBe('User');
      expect(res.body.isPremium).toBe(false);
    });

    it('should return 404 when user does not exist', async () => {
    // Mockear User.findById para que devuelva null
    const findByIdSpy = jest.spyOn(User, 'findById').mockResolvedValue(null);

    const res = await request(app)
      .get('/profile');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Usuario no encontrado');

    // Restaurar el comportamiento original
    findByIdSpy.mockRestore();
  });
  });

  describe('PUT /profile', () => {
    it('should update user profile', async () => {
      const updateData = {
        name: 'Updated',
        surname: 'Name'
      };

      const res = await request(app)
        .put('/profile')
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Perfil actualizado correctamente');
      expect(res.body.user.name).toBe('Updated');
      expect(res.body.user.surname).toBe('Name');
    });

    it('should return 400 if required fields are missing: name', async () => {
      const res = await request(app)
        .put('/profile')
        .send({
          surname: 'Name'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Faltan datos obligatorios.');
    });
    
    it('should return 400 if required fields are missing: surname', async () => {
      const res = await request(app)
        .put('/profile')
        .send({
          name: 'Test'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Faltan datos obligatorios.');
    });

    it('should return 404 when user does not exist', async () => {
        const updateData = {
        name: 'Updated',
        surname: 'Name'
      };

    // Mockear User.findById para que devuelva null
    const findByIdSpy = jest.spyOn(User, 'findById').mockResolvedValue(null);

    const res = await request(app)
      .put('/profile')
      .send(updateData);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Usuario no encontrado');

    // Restaurar el comportamiento original
    findByIdSpy.mockRestore();
  });
  });

  describe('PUT /password', () => {
    it('should update password with correct current password', async () => {
      const res = await request(app)
        .put('/password')
        .send({
          actualPassword: 'password123',
          newPassword: 'newpassword123'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Contraseña actualizada correctamente');
    });

    it('should return 400 if current password is incorrect', async () => {
      const res = await request(app)
        .put('/password')
        .send({
          actualPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('La contraseña actual es incorrecta.');
    });
    it('should return 404 when user does not exist', async () => {
        const updateData = {
        actualPassword: 'password123',
          newPassword: 'newpassword123'
      };

    // Mockear User.findById para que devuelva null
    const findByIdSpy = jest.spyOn(User, 'findById').mockResolvedValue(null);

    const res = await request(app)
      .put('/password')
      .send(updateData);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Usuario no encontrado');

    // Restaurar el comportamiento original
    findByIdSpy.mockRestore();
  });

  it('should return 400 if required fields are missing: actualPassword', async () => {
      const res = await request(app)
        .put('/password')
        .send({
          newPassword: 'newpassword123'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Faltan datos obligatorios.');
    });
    it('should return 400 if required fields are missing: newPassword', async () => {
      const res = await request(app)
        .put('/password')
        .send({
          actualPassword: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Faltan datos obligatorios.');
    });

    //que la nueva contraseña coincida con la repetición se comprueba en el frontend, no es necesario probarlo aquí
  });
  

  describe('POST /subscribe', () => {
    it('should update user to premium plan', async () => {
      const res = await request(app)
        .post('/subscribe')
        .send({
          plan: 'premium'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Plan actualizado correctamente');
      expect(res.body.token).toBeDefined();
      expect(res.body.user.isPremium).toBe(true);
    });

    it('should update user to basic plan', async () => {
      const res = await request(app)
        .post('/subscribe')
        .send({
          plan: 'basic'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Plan actualizado correctamente');
      expect(res.body.user.isPremium).toBe(false);
    });

    it('should return 400 for invalid plan', async () => {
      const res = await request(app)
        .post('/subscribe')
        .send({
          plan: 'invalid'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Plan inválido. Debe ser 'basic' o 'premium'");
    });
  });

  describe('POST /forgot-password', () => {
    it('should send reset password email for existing user', async () => {
      const res = await request(app)
        .post('/forgot-password')
        .send({
          email: 'test@example.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Correo de restablecimiento enviado correctamente. Revisa tu bandeja de entrada.');
    });

    it('should return 400 for non-existent user', async () => {
      const res = await request(app)
        .post('/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No se encontró un usuario con ese correo electrónico.');
    });

    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/forgot-password')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('El correo electrónico es requerido');
    });
  });

  describe('POST /reset-password/:token', () => {
    it('should reset password with valid token', async () => {
      // Primero crear un token de reset
      const user = await User.findOne({ email: 'test@example.com' });
      const resetToken = 'validresettoken';
      user.resetToken = resetToken;
      user.resetTokenExpiration = Date.now() + 3600000; // 1 hour
      await user.save();

      const res = await request(app)
        .post(`/reset-password/${resetToken}`)
        .send({
          password: 'newpassword123'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Contraseña restablecida con éxito. Puede cerrar esta ventana.');
    });

    it('should return 400 for invalid token', async () => {
      const res = await request(app)
        .post('/reset-password/invalidtoken')
        .send({
          password: 'newpassword123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Token de restablecimiento inválido o expirado.');
    });

    it('should return 400 for expired token', async () => {
         // Primero crear un token de reset
      const user = await User.findOne({ email: 'test@example.com' });
      const resetToken = 'validresettoken';
      user.resetToken = resetToken;
      user.resetTokenExpiration = Date.now() - 3600000; // 1 hour
      const res = await request(app)
        .post('/reset-password/invalidtoken')
        .send({
          password: 'newpassword123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Token de restablecimiento inválido o expirado.');
    });
    
    it('should return 400 if password is missing', async () => {
         // Primero crear un token de reset
      const user = await User.findOne({ email: 'test@example.com' });
      const resetToken = 'validresettoken';
      user.resetToken = resetToken;
      user.resetTokenExpiration = Date.now() + 3600000; // 1 hour
      await user.save();

      const res = await request(app)
        .post(`/reset-password/${resetToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("La nueva contraseña es requerida.");
    });
     //no pruebo que el usuario no exista porque el find de User se hace con el token. Con el token inválido ya se comprueba ese
     //usuario no existente.
    
  });

  describe('GET /friends', () => {
    it('should get user friends list', async () => {
      const res = await request(app)
        .get('/friends');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Premium');
      expect(res.body[0].surname).toBe('User');
      expect(res.body[0].email).toBe('premium@example.com');
    });

    it('should return 404 when user does not exist', async () => {
    // Mockear User.findById para que devuelva null
    const findByIdSpy = jest.spyOn(User, 'findById').mockImplementation(() => ({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(null)
        }));

    const res = await request(app)
      .get('/friends');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Usuario no encontrado');

    // Restaurar el comportamiento original
    findByIdSpy.mockRestore();
  });
  });

  describe('GET /users', () => {
    it('should get all premium users', async () => {
      const res = await request(app)
        .get('/users');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2); // Premium users only
      
      const emails = res.body.map(user => user.email);
      expect(emails).toContain('premium@example.com');
      expect(emails).toContain('another@example.com');
      expect(emails).not.toContain('test@example.com'); // Not premium
    });

    it('should return 404 when user does not exist', async () => {
        const updateData = {
        actualPassword: 'password123',
          newPassword: 'newpassword123'
      };

    // Mockear User.findById para que devuelva null
    const findByIdSpy = jest.spyOn(User, 'find').mockResolvedValue(null);

    const res = await request(app)
      .get('/users');

    expect(res.status).toBe(200);
    expect(res.body).toBe(null); 

    // Restaurar el comportamiento original
    findByIdSpy.mockRestore();
  });
  });

  describe('PATCH /users/:userId with internal API key', () => {
    it('should update user with internal API key', async () => {
      const updateData = {
        isPremium: true,
        planExpirationDate: new Date(),
        subscriptionActive: true,
        stripeCustomerId: 'cus  _test123',
        stripeSubscriptionId: 'sub_test123',
        bilingCycle: 'monthly'
      };

      const res = await request(app)
        .patch(`/users/${clientId}`)
        .set('x-internal-api-key', process.env.INTERNAL_API_KEY)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Usuario actualizado correctamente');
      expect(res.body.user.isPremium).toBe(true);
      expect(res.body.user.subscriptionActive).toBe(true);
    });

    it('should return 400 for invalid user ID', async () => {
      const res = await request(app)
        .patch('/users/invalidid')
        .set('x-internal-api-key', process.env.INTERNAL_API_KEY)
        .send({ isPremium: true });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ID de usuario inválido');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .patch(`/users/${fakeId}`)
        .set('x-internal-api-key', process.env.INTERNAL_API_KEY)
        .send({ isPremium: true });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Usuario no encontrado');
    });

     it('should return 200 for non internal api key use because it then uses normal authMiddleware', async () => {
      const res = await request(app)
        .patch(`/users/${clientId}`)
        .send({ isPremium: true });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Usuario actualizado correctamente');
      expect(res.body.user.isPremium).toBe(true);
    });
  });

  describe('POST /send-friend-request', () => {
    it('should send friend request successfully', async () => {
      const res = await request(app)
        .post('/send-friend-request')
        .send({
          senderId: clientId,
          receiverId: clientId3
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Solicitud de amistad enviada con éxito.');
      
    });
     it('should return 400 due to missing fields: senderId', async () => {
      const res = await request(app)
        .post('/send-friend-request')
        .send({
          receiverId: clientId3
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Faltan datos obligatorios.');
    });
     it('should return 400 due to missing fields: receiverId', async () => {
      const res = await request(app)
        .post('/send-friend-request')
        .send({
          senderId: clientId
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Faltan datos obligatorios.');
    });
    
     it('should return 400 due to missing fields: receiverId', async () => {
      const res = await request(app)
        .post('/send-friend-request')
        .send({
          senderId: clientId
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Faltan datos obligatorios.');
    });

     it('should return 404 due to non-existant receiverId', async () => {
        const notFoundId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/send-friend-request')
        .send({
          senderId: clientId,
          receiverId:notFoundId
        });

        console.log("send friend request", res.body);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Usuario emisor o receptor no encontrado.');
    });
    
     it('should return 404 due to non-existant senderId', async () => {
        const notFoundId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/send-friend-request')
        .send({
          senderId: notFoundId,
          receiverId: clientId3
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Usuario emisor o receptor no encontrado.');
    });

    it('should return 400 due equal sender and receiver id', async () => {
      const res = await request(app)
        .post('/send-friend-request')
        .send({
          senderId: clientId3,
          receiverId: clientId3
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('No puedes enviarte una solicitud de amistad a ti mismo.');
    });
    
  });

  describe('GET /friend-requests/received', () => {
    it('should get received friend requests', async () => {
      const res = await request(app)
        .get('/friend-requests/received');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].senderId.name).toBe('Premium');
      expect(res.body[0].status).toBe('pending');
    });

    it('should return 404: user does not exist', async () => {
      const findByIdSpy = jest.spyOn(User, 'findById').mockResolvedValue(null);

    const res = await request(app)
      .get('/friend-requests/received');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Usuario no encontrado');

    // Restaurar el comportamiento original
    findByIdSpy.mockRestore();
    });

    it('should return empty array when user has no received friend requests', async () => {
    await FriendsRequest.deleteMany({ receiverId: clientId });

    const res = await request(app)
      .get('/friend-requests/received');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
    
  });
  });

  describe('GET /friend-requests/sent', () => {
    it('should get sent friend requests', async () => {
      const res = await request(app)
        .get('/friend-requests/sent');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0].receiverId.name).toBe('Another');
      expect(res.body[0].status).toBe('pending');
    });
     it('should return 404: user does not exist', async () => {
      const findByIdSpy = jest.spyOn(User, 'findById').mockResolvedValue(null);

    const res = await request(app)
      .get('/friend-requests/sent');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Usuario no encontrado');

    // Restaurar el comportamiento original
    findByIdSpy.mockRestore();
    });

    it('should return empty array when user has no sent friend requests', async () => {
    await FriendsRequest.deleteMany({ senderId: clientId });

    const res = await request(app)
      .get('/friend-requests/sent');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
    
  });
  });

  describe('PUT /friend-requests/:requestId/accept', () => {
    it('should accept friend request', async () => {
      const friendRequest = await FriendsRequest.create({ 
        senderId: clientId2, 
        receiverId: clientId,
        status: 'pending' 
      });
    
      const res = await request(app)
        .put(`/friend-requests/${friendRequest._id}/accept`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Solicitud aceptada y amistad creada');
      expect(res.body.friendship).toBeDefined();
    });

    it('should return 404 for non-existent request', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .put(`/friend-requests/${fakeId}/accept`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Solicitud no encontrada');
    });

     it('should return 403 for non-authorized user', async () => {
      const friendrRquest = await FriendsRequest.create({ 
        senderId: clientId, 
        receiverId: clientId2 
      });
      
      const res = await request(app)
        .put(`/friend-requests/${friendrRquest._id}/accept`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('No autorizado');
    });

    it('should return 400 for non-pending request: accepted request', async () => {
      const friendRequest = await FriendsRequest.create({ 
        senderId: clientId3, 
        receiverId: clientId,
        status: 'accepted'
      });
      
      const res = await request(app)
        .put(`/friend-requests/${friendRequest._id}/accept`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('La solicitud ya ha sido procesada');
    });
  });

  describe('PUT /friend-requests/:requestId/reject', () => {
    it('should reject friend request', async () => {
      const friendRequest = await FriendsRequest.create({ 
        senderId: clientId3, 
        receiverId: clientId
      });

      const res = await request(app)
        .put(`/friend-requests/${friendRequest._id}/reject`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Solicitud rechazada');
    });
    it('should return 404 for non-existent request', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .put(`/friend-requests/${fakeId}/reject`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Solicitud no encontrada');
    });

     it('should return 403 for non-authorized user', async () => {
      const friendrRquest = await FriendsRequest.create({ 
        senderId: clientId, 
        receiverId: clientId2 
      });
      
      const res = await request(app)
        .put(`/friend-requests/${friendrRquest._id}/accept`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('No autorizado');
    });

    it('should return 400 for non-pending request: accepted request', async () => {
      const friendRequest = await FriendsRequest.create({ 
        senderId: clientId3, 
        receiverId: clientId,
        status: 'accepted'
      });
      
      const res = await request(app)
        .put(`/friend-requests/${friendRequest._id}/reject`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('La solicitud ya ha sido procesada');
    });
  });

  describe('DELETE /friends/:friendId', () => {
    it('should remove friend from friends list', async () => {
      const res = await request(app)
        .delete(`/friends/${clientId2}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Amigo eliminado correctamente');
      const user = await User.findById(clientId);
      expect(user.friends.length).toBe(0);
    });
     it('should return 404 when user does not exist or friend does not exist', async () => {
    // Mockear User.findById para que devuelva null
    const findByIdSpy = jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(null);

    const res = await request(app)
      .delete(`/friends/${clientId}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Usuario no encontrado");

    // Restaurar el comportamiento original
    findByIdSpy.mockRestore();
  });
  });

  describe('GET /users/:userId with internal API key', () => {
    it('should get user by ID with internal API key', async () => {
      const res = await request(app)
        .get(`/users/${clientId}`)
        .set('x-internal-api-key', process.env.INTERNAL_API_KEY);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated'); // From previous profile update test
      expect(res.body.surname).toBe('Name');
      expect(res.body.email).toBe('test@example.com');
    });

     it('should get user by ID without internal API key', async () => {
      const res = await request(app)
        .get(`/users/${clientId}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated'); // From previous profile update test
      expect(res.body.surname).toBe('Name');
      expect(res.body.email).toBe('test@example.com');
    });

    it('should return 400 for invalid user ID', async () => {
      const res = await request(app)
        .get('/users/invalidid')
        .set('x-internal-api-key', process.env.INTERNAL_API_KEY);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ID de usuario inválido');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .get(`/users/${fakeId}`)
        .set('x-internal-api-key', process.env.INTERNAL_API_KEY);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Usuario no encontrado');
    });
  });

  describe('PATCH /delete-all-friends/:userId with internal API key', () => {
    it('should delete all friends for a user', async () => {
      const res = await request(app)
        .patch(`/delete-all-friends/${clientId}`)
        .set('x-internal-api-key', process.env.INTERNAL_API_KEY);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Todos los amigos han sido eliminados correctamente');

      const user = await User.findById(clientId);
      expect(user.friends.length).toBe(0);
    });
     it('should delete all friends for a user without external api key', async () => {
      const res = await request(app)
        .patch(`/delete-all-friends/${clientId2}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Todos los amigos han sido eliminados correctamente');
       const user = await User.findById(clientId);
      expect(user.friends.length).toBe(0);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .patch(`/delete-all-friends/${fakeId}`)
        .set('x-internal-api-key', process.env.INTERNAL_API_KEY);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Usuario no encontrado');
    });
  });
});