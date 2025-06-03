import React, { useState } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Link,
  Grid,
  Paper,
  IconButton,
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Mail as MailIcon,
  AccessTime as ClockIcon,
  LocationOn as MapPinIcon,
  Send as SendIcon,
  Person as UserIcon,
  Message as MessageSquareIcon,
  Label as TagIcon,
} from '@mui/icons-material';

const Contact = () => {
const apiEndpoint = process.env.GATEWAY_URL || 'http://localhost:4000';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formData.subject.trim()) newErrors.subject = 'El asunto es requerido';
    if (!formData.message.trim()) newErrors.message = 'El mensaje es requerido';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const response = await axios.post(apiEndpoint+'/send-email', formData);
     if (response.status === 200) {
        alert('¡Mensaje enviado correctamente! Te responderemos pronto.');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        throw new Error('Error al enviar el mensaje');
      }
    } catch (error) {
      alert('Hubo un error al enviar el mensaje. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'linear-gradient(135deg, #2563eb, #7c3aed, #8b5cf6)',
        p: 4,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Paper
        elevation={8}
        sx={{
          maxWidth: 900,
          width: '100%',
          borderRadius: 3,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          minHeight: 600,
          overflow: 'hidden',
        }}
      >
        {/* Left info panel */}
        <Box
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            p: 5,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <MessageSquareIcon fontSize="large" />
            <Typography variant="h3" fontWeight={300}>
              Contacto
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ClockIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="bold" mb={1}>
                Horario de atención
              </Typography>
              <Typography sx={{ opacity: 0.9 }}>
                Lunes a Viernes: 09:00h - 18:00h
                <br />
                Sábados: 09:00h - 14:00h
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PhoneIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="bold" mb={1}>
                Teléfono
              </Typography>
              <Typography sx={{ opacity: 0.9 }}>+34 91 234 56 78</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.3)',
                  transform: 'translateY(-3px)',
                  transition: 'all 0.3s',
                },
              }}
            >
              <MailIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="bold" mb={1}>
                Email
              </Typography>
              <Link
                href="mailto:saldosmart.info@gmail.com"
                underline="none"
                color="inherit"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.3)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.3)',
                    transform: 'translateY(-3px)',
                    transition: 'all 0.3s',
                  },
                  fontWeight: 'medium',
                }}
              >
              saldosmart.info@gmail.com
              </Link>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapPinIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="bold" mb={1}>
                Dirección
              </Typography>
              <Typography sx={{ opacity: 0.9 }}>
                Calle Principal, 123
                <br />
                28001 Madrid, España
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Right form panel */}
        <Box sx={{ p: 5, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <SendIcon color="primary" />
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              ¿Hablamos?
            </Typography>
          </Box>

          <Typography variant="body1" mb={4} color="text.secondary">
            Estamos aquí para ayudarte. Envíanos un mensaje y te responderemos lo antes posible.
          </Typography>

          <form onSubmit={handleSubmit} noValidate>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nombre completo"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  error={!!errors.name}
                  helperText={errors.name}
                  InputProps={{
                    startAdornment: <UserIcon sx={{ mr: 1 }} />,
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  error={!!errors.email}
                  helperText={errors.email}
                  InputProps={{
                    startAdornment: <MailIcon sx={{ mr: 1 }} />,
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Asunto"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  error={!!errors.subject}
                  helperText={errors.subject}
                  InputProps={{
                    startAdornment: <TagIcon sx={{ mr: 1 }} />,
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Mensaje"
                  name="message"
                  multiline
                  rows={5}
                  value={formData.message}
                  onChange={handleInputChange}
                  error={!!errors.message}
                  helperText={errors.message}
                  InputProps={{
                    startAdornment: <MessageSquareIcon sx={{ mr: 1 }} />,
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <SendIcon />}
                >
                  {isLoading ? 'Enviando...' : 'Enviar mensaje'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Box>
      </Paper>
    </Box>
  );
};

export default Contact;
