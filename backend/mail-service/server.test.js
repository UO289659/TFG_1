const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

// Mock de nodemailer
jest.mock('nodemailer');

let mongoServer;
let app;
let mockTransporter;

// Configurar mocks
beforeAll(async () => {
  // Configurar mock de nodemailer
  mockTransporter = {
    sendMail: jest.fn()
  };
  
  nodemailer.createTransport.mockReturnValue(mockTransporter);
  
  // Configurar base de datos en memoria
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Configurar variables de entorno para tests
  process.env.MONGO_URI = mongoUri;
  process.env.MAIL_USER = 'test@gmail.com';
  process.env.MAIL_PASS = 'testpass';
  process.env.PORT = '5004'; // Puerto diferente para tests
  
  // Conectar a la base de datos
  await mongoose.connect(mongoUri);
  
  // Importar la app después de configurar las variables de entorno
  app = require('./server');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

beforeEach(() => {
  // Limpiar mocks antes de cada test
  jest.clearAllMocks();
});

describe('Mail Service Tests', () => {

  describe('POST /send-email', () => {
    const validEmailData = {
      name: 'Juan Pérez',
      email: 'juan@example.com',
      subject: 'Consulta sobre producto',
      message: 'Hola, me gustaría saber más información sobre sus servicios.'
    };

    it('should send email successfully', async () => {
      // Configurar mock para simular éxito
      mockTransporter.sendMail.mockImplementation((options, callback) => {
        callback(null, { messageId: '12345' });
      });

      const res = await request(app)
        .post('/send-email')
        .send(validEmailData);

      expect(res.status).toBe(200);
      expect(res.text).toBe('Correo enviado correctamente');
      
      // Verificar que se llamó sendMail con los parámetros correctos
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      
      expect(callArgs.from).toBe('test@gmail.com');
      expect(callArgs.to).toBe('saldosmart.info@gmail.com');
      expect(callArgs.subject).toBe('[Contacto Web] Consulta sobre producto - Juan Pérez');
      expect(callArgs.replyTo).toBe('juan@example.com');
      expect(callArgs.text).toContain('Juan Pérez');
      expect(callArgs.text).toContain('juan@example.com');
      expect(callArgs.text).toContain('Consulta sobre producto');
      expect(callArgs.text).toContain('Hola, me gustaría saber más información');
    });

    it('should return 400 if name is missing', async () => {
      const invalidData = { ...validEmailData };
      delete invalidData.name;

      const res = await request(app)
        .post('/send-email')
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Faltan campos requeridos');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should return 400 if email is missing', async () => {
      const invalidData = { ...validEmailData };
      delete invalidData.email;

      const res = await request(app)
        .post('/send-email')
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Faltan campos requeridos');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should return 400 if subject is missing', async () => {
      const invalidData = { ...validEmailData };
      delete invalidData.subject;

      const res = await request(app)
        .post('/send-email')
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Faltan campos requeridos');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should return 400 if message is missing', async () => {
      const invalidData = { ...validEmailData };
      delete invalidData.message;

      const res = await request(app)
        .post('/send-email')
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Faltan campos requeridos');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should return 500 if email sending fails', async () => {
      // Configurar mock para simular error
      mockTransporter.sendMail.mockImplementation((options, callback) => {
        callback(new Error('SMTP connection failed'), null);
      });

      const res = await request(app)
        .post('/send-email')
        .send(validEmailData);

      expect(res.status).toBe(500);
      expect(res.text).toBe('Error al enviar el correo');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });

    it('should handle special characters in email content', async () => {
      const specialCharsData = {
        name: 'José María',
        email: 'jose@example.com',
        subject: 'Consulta con acentos y ñ',
        message: 'Hola, tengo una pregunta sobre el año 2024 y los precios en €.'
      };

      mockTransporter.sendMail.mockImplementation((options, callback) => {
        callback(null, { messageId: '12345' });
      });

      const res = await request(app)
        .post('/send-email')
        .send(specialCharsData);

      expect(res.status).toBe(200);
      expect(res.text).toBe('Correo enviado correctamente');
      
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.text).toContain('José María');
      expect(callArgs.text).toContain('año 2024');
      expect(callArgs.text).toContain('€');
    });
  });

  describe('POST /send-reset-email', () => {
    const validResetData = {
      to: 'usuario@example.com',
      resetLink: 'https://example.com/reset-password?token=abc123'
    };

    it('should send reset email successfully', async () => {
      mockTransporter.sendMail.mockImplementation((options, callback) => {
        callback(null, { messageId: 'reset-12345' });
      });

      const res = await request(app)
        .post('/send-reset-email')
        .send(validResetData);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Correo de restablecimiento enviado correctamente');
      
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      
      expect(callArgs.from).toBe('test@gmail.com');
      expect(callArgs.to).toBe('usuario@example.com');
      expect(callArgs.subject).toBe('Restablecimiento de Contraseña - Gestor de Finanzas');
      expect(callArgs.html).toContain('https://example.com/reset-password?token=abc123');
      expect(callArgs.text).toContain('https://example.com/reset-password?token=abc123');
    });

    it('should return 400 if to field is missing', async () => {
      const invalidData = { ...validResetData };
      delete invalidData.to;

      const res = await request(app)
        .post('/send-reset-email')
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Faltan parámetros requeridos');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should return 400 if resetLink is missing', async () => {
      const invalidData = { ...validResetData };
      delete invalidData.resetLink;

      const res = await request(app)
        .post('/send-reset-email')
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Faltan parámetros requeridos');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should return 500 if email sending fails', async () => {
      mockTransporter.sendMail.mockImplementation((options, callback) => {
        callback(new Error('Authentication failed'), null);
      });

      const res = await request(app)
        .post('/send-reset-email')
        .send(validResetData);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Error al enviar el correo');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });

    it('should include correct HTML structure in reset email', async () => {
      mockTransporter.sendMail.mockImplementation((options, callback) => {
        callback(null, { messageId: 'reset-12345' });
      });

      const res = await request(app)
        .post('/send-reset-email')
        .send(validResetData);

      expect(res.status).toBe(200);
      
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('<h2 style="color: #333;">Restablecimiento de Contraseña</h2>');
      expect(callArgs.html).toContain('background-color: #007bff');
      expect(callArgs.html).toContain('Este enlace expirará en 1 hora');
    });
  });

  describe('POST /send-registration-email', () => {
    const validRegistrationData = {
      to: 'nuevo@example.com',
      subject: 'Bienvenido a nuestra plataforma',
      message: 'Gracias por registrarte en nuestro servicio.'
    };

    it('should send registration email successfully', async () => {
      mockTransporter.sendMail.mockImplementation((options, callback) => {
        callback(null, { messageId: 'registration-12345' });
      });

      const res = await request(app)
        .post('/send-registration-email')
        .send(validRegistrationData);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Correo de registro enviado correctamente');
      
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      
      expect(callArgs.from).toBe('test@gmail.com');
      expect(callArgs.to).toBe('nuevo@example.com');
      expect(callArgs.subject).toBe('Bienvenido a nuestra plataforma');
      expect(callArgs.text).toBe('Gracias por registrarte en nuestro servicio.');
      expect(callArgs.html).toContain('Confirmación de Registro');
      expect(callArgs.html).toContain('Gracias por registrarte en nuestro servicio.');
    });

    it('should return 400 if to field is missing', async () => {
      const invalidData = { ...validRegistrationData };
      delete invalidData.to;

      const res = await request(app)
        .post('/send-registration-email')
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Faltan parámetros requeridos');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should return 400 if subject is missing', async () => {
      const invalidData = { ...validRegistrationData };
      delete invalidData.subject;

      const res = await request(app)
        .post('/send-registration-email')
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Faltan parámetros requeridos');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should return 400 if message is missing', async () => {
      const invalidData = { ...validRegistrationData };
      delete invalidData.message;

      const res = await request(app)
        .post('/send-registration-email')
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Faltan parámetros requeridos');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should return 500 if email sending fails', async () => {
      mockTransporter.sendMail.mockImplementation((options, callback) => {
        callback(new Error('Network timeout'), null);
      });

      const res = await request(app)
        .post('/send-registration-email')
        .send(validRegistrationData);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Error al enviar el correo');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });

    it('should handle HTML content in message', async () => {
      const htmlMessageData = {
        to: 'nuevo@example.com',
        subject: 'Bienvenido',
        message: 'Gracias por registrarte. <strong>¡Bienvenido!</strong>'
      };

      mockTransporter.sendMail.mockImplementation((options, callback) => {
        callback(null, { messageId: 'registration-12345' });
      });

      const res = await request(app)
        .post('/send-registration-email')
        .send(htmlMessageData);

      expect(res.status).toBe(200);
      
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Gracias por registrarte. <strong>¡Bienvenido!</strong>');
      expect(callArgs.text).toContain('Gracias por registrarte. <strong>¡Bienvenido!</strong>');
    });
  });

  describe('Request Validation', () => {
    it('should handle empty body in send-email', async () => {
      const res = await request(app)
        .post('/send-email')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Faltan campos requeridos');
    });

    it('should handle empty body in send-reset-email', async () => {
      const res = await request(app)
        .post('/send-reset-email')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Faltan parámetros requeridos');
    });

    it('should handle empty body in send-registration-email', async () => {
      const res = await request(app)
        .post('/send-registration-email')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Faltan parámetros requeridos');
    });

    it('should handle malformed JSON', async () => {
      const res = await request(app)
        .post('/send-email')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(res.status).toBe(400);
    });
  });
});