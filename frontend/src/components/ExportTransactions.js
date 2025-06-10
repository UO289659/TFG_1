import React, { useState } from 'react';
import Papa from 'papaparse';
import { Button, Typography, Box, Snackbar, CircularProgress } from '@mui/material';
import axios from 'axios';

const ExportTransactions = () => {
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Función para exportar las transacciones a CSV
  const handleExport = async () => {
    setLoading(true); // Empieza la carga
    setError(''); // Limpiar el error previo, si hubiera

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:4000/export', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const fetchedTransactions = response.data;
      setTransactions(fetchedTransactions); // Guardar las transacciones obtenidas

      if (!fetchedTransactions || fetchedTransactions.length === 0) {
        setOpenSnackbar(true); // Mostrar mensaje si no hay transacciones
        setLoading(false); // Finalizar carga
        return;
      }

      // Convertir las transacciones a CSV
      const csv = Papa.unparse(fetchedTransactions);

      // Crear el enlace de descarga
      const hiddenElement = document.createElement('a');
      hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
      hiddenElement.target = '_blank';
      hiddenElement.download = 'transacciones.csv'; // Nombre del archivo
      hiddenElement.click();

      setLoading(false); // Finalizar carga

    } catch (err) {
      setError('Hubo un error al recuperar o exportar las transacciones.');
      console.error(err);
      setLoading(false); // Finalizar carga en caso de error
    }
  };

  return (
    <div className="container">
      {error && <div className="error-message">{error}</div>}

      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5" gutterBottom color="primary" fontWeight="medium">
          Exportar transacciones
        </Typography>

        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleExport}
          sx={{
            padding: '10px 20px',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
          disabled={loading} // Deshabilitar el botón mientras se está procesando
        >
          {loading ? <CircularProgress size={24} /> : 'Exportar a CSV'}
        </Button>

        {/* Snackbar para mostrar mensaje de error si no hay transacciones */}
        <Snackbar
          open={openSnackbar}
          autoHideDuration={6000}
          onClose={() => setOpenSnackbar(false)}
          message="No hay transacciones para exportar"
        />
      </Box>
    </div>
  );
};

export default ExportTransactions;
