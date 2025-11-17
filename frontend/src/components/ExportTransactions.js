import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  Button,
  Typography,
  Box,
  Snackbar,
  CircularProgress,
  Container,
  Card,
  CardContent,
  Alert,
  Grid,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import {
  GetApp as ExportIcon,
  TableChart as CSVIcon,
  CheckCircle as SuccessIcon,
  ErrorOutline as ErrorIcon,
  Info as InfoIcon,
  Description as FileIcon
} from '@mui/icons-material';
import axios from 'axios';
import '../styles/variables.css';
import Footer from "./Footer.js";

const ExportTransactions = () => {
  //const GATEWAY_URL = 'https://gateway-tfg.azure-api.net/transactions' || 'http://localhost:4000';
  const GATEWAY_URL = process.env.REACT_APP_GATEWAY_URL;
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Función para exportar las transacciones a CSV
  const handleExport = async () => {
    setLoading(true);
    setError('');
    setExportSuccess(false);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${GATEWAY_URL}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const fetchedTransactions = response.data;
      setTransactions(fetchedTransactions);

      if (!fetchedTransactions || fetchedTransactions.length === 0) {
        setSnackbarMessage('No hay transacciones para exportar');
        setSnackbarSeverity('warning');
        setOpenSnackbar(true);
        setLoading(false);
        return;
      }

      // Convertir las transacciones a CSV
      const csv = Papa.unparse(fetchedTransactions);

      // Crear el enlace de descarga
      const hiddenElement = document.createElement('a');
      hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
      hiddenElement.target = '_blank';
      
      // Generar nombre de archivo con fecha
      const currentDate = new Date().toISOString().split('T')[0];
      hiddenElement.download = `transacciones_${currentDate}.csv`;
      hiddenElement.click();

      setExportSuccess(true);
      setSnackbarMessage(`${fetchedTransactions.length} transacciones exportadas exitosamente`);
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      setLoading(false);

    } catch (err) {
      setError('Error al recuperar o exportar las transacciones. Verifica tu conexión e intenta nuevamente.');
      setSnackbarMessage('Error al exportar transacciones');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
      setLoading(false);
    }
  };

  const customStyles = {
    container: {
      py: 4,
      minHeight: '100vh',
      position: 'relative',
       paddingBottom: '1rem'

    },
    mainCard: {
      
      backdropFilter: 'blur(15px)',
      border: '1px solid var(--glass-border)',
      borderRadius: '25px',
      boxShadow: 'var(--shadow-large)',
      overflow: 'hidden'
    },
    headerBox: {
      textAlign: 'center',
      mb: 4,
      p: 3,
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(10px)',
      borderRadius: '20px',
      border: '1px solid var(--glass-border)'
    },
    exportButton: {
      background: 'var(--primary-gradient)',
      color: 'white',
      borderRadius: '15px',
      padding: '16px 40px',
      fontSize: '18px',
      fontWeight: 'bold',
      textTransform: 'none',
      boxShadow: 'var(--shadow-soft)',
      minWidth: '200px',
      '&:hover': {
        background: 'var(--secondary-gradient)',
        transform: 'translateY(-3px)',
        boxShadow: 'var(--shadow-large)'
      },
      '&:disabled': {
        background: 'var(--text-secondary)',
        transform: 'none'
      }
    },
    infoCard: {
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--glass-border)',
      borderRadius: '20px',
      height: '100%',
      maxWidth: '800px',
      margin: '0 auto'
    },
    statusCard: {
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--glass-border)',
      borderRadius: '20px',
      textAlign: 'center',
      p: 3,
      maxWidth: '800px',
      margin: '0 auto'
    },
    chip: {
      background: 'var(--purple)',
      color: 'white',
      fontWeight: 'bold'
    },
    successChip: {
      background: '#10b981',
      color: 'white',
      fontWeight: 'bold'
    },
    listItem: {
      py: 1,
      '& .MuiListItemText-primary': {
        color: 'var(--text-primary)',
        fontWeight: 'medium'
      },
      '& .MuiListItemText-secondary': {
        color: 'var(--text-secondary)'
      }
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'var(--primary-gradient)',
      py: 0,
      
    }}>
      <Container maxWidth="lg" sx={customStyles.container}>
      <Card elevation={0} sx={customStyles.mainCard}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={customStyles.headerBox}>
            <ExportIcon sx={{ fontSize: 60, color: 'var(--purple)', mb: 2 }} />
            <Typography variant="h3" component="h1" gutterBottom sx={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
              Exportar Transacciones
            </Typography>
            <Typography variant="h6" sx={{ color: 'var(--text-secondary)', maxWidth: '600px', mx: 'auto' }}>
              Descarga tus datos financieros en formato CSV para análisis detallado o respaldo de información
            </Typography>
          </Box>

          <Grid container  justifyContent="center">
            {/* Información del export */}
            <Grid item xs={12} display="flex" justifyContent="center">
              <Card elevation={0} sx={customStyles.infoCard}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={3}>
                    <InfoIcon sx={{ color: 'var(--purple)', mr: 2 }} />
                    <Typography variant="h5" sx={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                      Información del Archivo
                    </Typography>
                  </Box>

                  <List>
                    <ListItem sx={customStyles.listItem}>
                      <ListItemIcon>
                        <FileIcon sx={{ color: 'var(--purple)' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Formato del archivo"
                        secondary="CSV (Valores separados por comas) - Compatible con Excel, Google Sheets"
                      />
                    </ListItem>

                    <ListItem sx={customStyles.listItem}>
                      <ListItemIcon>
                        <CSVIcon sx={{ color: 'var(--purple)' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Contenido incluido"
                        secondary="Todas tus transacciones con fecha, monto, categoría y descripción"
                      />
                    </ListItem>

                    <ListItem sx={customStyles.listItem}>
                      <ListItemIcon>
                        <SuccessIcon sx={{ color: '#10b981' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Codificación"
                        secondary="UTF-8 para soporte completo de caracteres especiales"
                      />
                    </ListItem>
                  </List>

                  <Divider sx={{ my: 3, borderColor: 'var(--glass-border)' }} />

                  <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    El archivo se descargará automáticamente con el nombre "transacciones_YYYY-MM-DD.csv"
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Panel de estado y acción */}
            <Grid item xs={12} display="flex" justifyContent="center">
              <Paper elevation={0} sx={customStyles.statusCard}>
                {exportSuccess && (
                  <Box mb={3}>
                    <SuccessIcon sx={{ fontSize: 48, color: '#10b981', mb: 1 }} />
                    <Typography variant="h6" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                      Exportación Exitosa
                    </Typography>
                    <Chip label="Completado" sx={customStyles.successChip} size="small" />
                  </Box>
                )}

                {error && (
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 3, 
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '10px'
                    }}
                  >
                    {error}
                  </Alert>
                )}

                <Typography variant="h6" gutterBottom sx={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                  {loading ? 'Procesando...' : 'Listo para Exportar'}
                </Typography>

                {!loading && !exportSuccess && (
                  <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 3 }}>
                    Haz clic en el botón para generar y descargar tu archivo CSV
                  </Typography>
                )}

                {loading && (
                  <Box mb={3}>
                    <CircularProgress sx={{ color: 'var(--purple)' }} />
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 1 }}>
                      Obteniendo transacciones...
                    </Typography>
                  </Box>
                )}

                <Button
                  variant="contained"
                  size="large"
                  onClick={handleExport}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ExportIcon />}
                  sx={customStyles.exportButton}
                  fullWidth
                >
                  {loading ? 'Exportando...' : 'Exportar a CSV'}
                </Button>

                {transactions.length > 0 && !loading && (
                  <Box mt={2}>
                    <Chip 
                      label={`${transactions.length} transacciones`} 
                      sx={customStyles.chip}
                      size="small"
                    />
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Footer informativo */}
          <Box mt={4} p={3} sx={{ 
            background: 'var(--glass-bg)', 
            borderRadius: '15px',
            border: '1px solid var(--glass-border)',
            maxWidth: '800px',
            margin: '16px auto 0 auto'
          }}>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
              💡 <strong>Tip:</strong> Puedes usar el archivo CSV exportado en Excel, Google Sheets o cualquier 
              aplicación de análisis de datos para crear gráficos personalizados y análisis avanzados.
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Snackbar mejorado */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setOpenSnackbar(false)} 
          severity={snackbarSeverity}
          sx={{ 
            background: 'var(--white-transparent)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--glass-border)',
            borderRadius: '10px'
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
    <Footer />
    </Box>
  );
};

export default ExportTransactions;