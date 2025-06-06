import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Grid,
  TextField,
  InputAdornment,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  Button,
  Container
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Help as HelpIcon,
  MenuBook as GuideIcon,
  PlayCircleOutline as TutorialIcon,
  CheckCircle as CheckIcon,
  Category as CategoryIcon,
  AccountBalance as IncomeIcon,
  TrendingDown as ExpenseIcon,
  Assessment as StatsIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

const faqData = [
  {
    categoria: "Categorías",
    preguntas: [
      {
        pregunta: "¿Puedo editar una categoría global?",
        respuesta: "Las categorías globales no se pueden editar directamente para mantener la consistencia del sistema. Sin embargo, puedes crear una categoría personalizada con características similares. Ve a la sección 'Categorías' y selecciona 'Crear Nueva Categoría' para personalizar completamente tus opciones.",
        tags: ["categorías", "editar", "personalizar"]
      },
      {
        pregunta: "¿Cómo creo una categoría personalizada?",
        respuesta: "Para crear una categoría personalizada: 1) Ve a la sección 'Categorías', 2) Haz clic en 'Nueva Categoría', 3) Completa el nombre, selecciona el tipo (Ingreso/Gasto), 4) Elige un icono y color, 5) Guarda los cambios.",
        tags: ["categorías", "crear", "personalizar"]
      }
    ]
  },
  {
    categoria: "Transacciones",
    preguntas: [
      {
        pregunta: "¿Qué significa el tipo 'Ingreso' o 'Gasto'?",
        respuesta: "El tipo define la naturaleza de la transacción: 'Ingreso' representa dinero que entra (salario, ventas, etc.) y 'Gasto' representa dinero que sale (compras, pagos, etc.). Esta clasificación es fundamental para generar estadísticas precisas y análisis financieros.",
        tags: ["tipos", "ingreso", "gasto", "transacciones"]
      },
      {
        pregunta: "¿Puedo modificar una transacción después de crearla?",
        respuesta: "Sí, puedes editar transacciones existentes. Busca la transacción en tu historial, haz clic en el ícono de edición y modifica los campos necesarios. Los cambios se reflejarán automáticamente en tus estadísticas.",
        tags: ["editar", "transacciones", "modificar"]
      }
    ]
  },
  {
    categoria: "Estadísticas",
    preguntas: [
      {
        pregunta: "¿Dónde veo mis estadísticas?",
        respuesta: "Puedes ver tus estadísticas en la pestaña 'Análisis' del panel principal. Aquí encontrarás gráficos de ingresos vs gastos, distribución por categorías, tendencias temporales y resúmenes mensuales detallados.",
        tags: ["estadísticas", "análisis", "gráficos"]
      },
      {
        pregunta: "¿Puedo exportar mis datos?",
        respuesta: "Sí, puedes exportar tus datos en formato CSV o PDF desde la sección de estadísticas. Esta función te permite hacer backup de tu información o analizarla en otras herramientas.",
        tags: ["exportar", "datos", "backup"]
      }
    ]
  }
];

const guideSteps = [
  {
    icon: <CheckIcon color="primary" />,
    title: "Registro e Inicio de Sesión",
    description: "Crea tu cuenta desde la pantalla principal y accede con tus credenciales para sincronizar tus datos en todos tus dispositivos."
  },
  {
    icon: <CategoryIcon color="primary" />,
    title: "Configurar Categorías",
    description: "Personaliza tus categorías de ingresos y gastos. Puedes usar las predefinidas o crear las tuyas propias con iconos y colores personalizados."
  },
  {
    icon: <IncomeIcon color="success" />,
    title: "Registrar Ingresos",
    description: "Añade tus ingresos especificando monto, categoría, fecha y descripción opcional. El sistema calculará automáticamente tus totales."
  },
  {
    icon: <ExpenseIcon color="error" />,
    title: "Registrar Gastos",
    description: "Registra tus gastos de manera similar a los ingresos. Usa las categorías para mantener organizadas tus finanzas."
  },
  {
    icon: <StatsIcon color="info" />,
    title: "Analizar Estadísticas",
    description: "Revisa tus análisis financieros, gráficos de tendencias y resúmenes para tomar decisiones informadas sobre tu presupuesto."
  }
];

const supportInfo = {
  email: "soporte@financeapp.com",
  phone: "+1 (555) 123-4567",
  hours: "Lunes a Viernes, 9:00 AM - 6:00 PM"
};

export default function ProfessionalHelpPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAccordion, setExpandedAccordion] = useState(false);

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const filteredFAQ = faqData.map(categoria => ({
    ...categoria,
    preguntas: categoria.preguntas.filter(
      item =>
        item.pregunta.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.respuesta.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })).filter(categoria => categoria.preguntas.length > 0);

  const TabPanel = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          Centro de Ayuda
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Encuentra respuestas rápidas y aprende a usar todas las funcionalidades
        </Typography>
      </Box>

      {/* Navigation Tabs */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs 
          value={tabIndex} 
          onChange={(e, newValue) => setTabIndex(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<HelpIcon />} 
            label="Preguntas Frecuentes" 
            iconPosition="start"
          />
          <Tab 
            icon={<GuideIcon />} 
            label="Guía de Inicio" 
            iconPosition="start"
          />
          <Tab 
            icon={<TutorialIcon />} 
            label="Tutoriales" 
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* FAQ Tab */}
      <TabPanel value={tabIndex} index={0}>
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Buscar en preguntas frecuentes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />
        </Box>

        {filteredFAQ.length === 0 && searchTerm && (
          <Alert severity="info" sx={{ mb: 3 }}>
            No se encontraron resultados para "{searchTerm}". Intenta con otros términos de búsqueda.
          </Alert>
        )}

        {filteredFAQ.map((categoria, catIndex) => (
          <Box key={catIndex} sx={{ mb: 3 }}>
            <Typography variant="h5" gutterBottom color="primary" fontWeight="medium">
              {categoria.categoria}
            </Typography>
            {categoria.preguntas.map((item, index) => (
              <Accordion
                key={`${catIndex}-${index}`}
                expanded={expandedAccordion === `${catIndex}-${index}`}
                onChange={handleAccordionChange(`${catIndex}-${index}`)}
                sx={{ mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" fontWeight="medium">
                    {item.pregunta}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    {item.respuesta}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    {item.tags.map((tag, tagIndex) => (
                      <Chip
                        key={tagIndex}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        ))}
      </TabPanel>

      {/* Quick Guide Tab */}
      <TabPanel value={tabIndex} index={1}>
        <Grid container spacing={3}>
          {guideSteps.map((step, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card elevation={2} sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Box mr={2}>{step.icon}</Box>
                    <Typography variant="h6" fontWeight="bold">
                      {index + 1}. {step.title}
                    </Typography>
                  </Box>
                  <Typography color="text.secondary">
                    {step.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Alert severity="success" sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            ¡Consejo Pro!
          </Typography>
          Para obtener mejores resultados, dedica unos minutos al inicio para configurar tus categorías personalizadas. Esto hará que el seguimiento de tus finanzas sea más preciso y útil.
        </Alert>
      </TabPanel>

      {/* Tutorials Tab */}
      <TabPanel value={tabIndex} index={2}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h5" gutterBottom fontWeight="bold">
                  Tutoriales en Video
                </Typography>
                <Typography paragraph color="text.secondary">
                  Estamos preparando una serie completa de tutoriales en video para ayudarte a dominar todas las funcionalidades de la aplicación.
                </Typography>
                
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Próximamente disponibles:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="• Configuración inicial y personalización" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="• Gestión avanzada de categorías" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="• Análisis de estadísticas y reportes" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="• Tips y trucos para usuarios avanzados" />
                    </ListItem>
                  </List>
                </Alert>

                <Button variant="contained" color="primary" size="large">
                  Notificarme cuando estén listos
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  ¿Necesitas ayuda personalizada?
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <EmailIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Email"
                      secondary={
                        <a href={`mailto:${supportInfo.email}`} style={{ color: 'inherit' }}>
                          {supportInfo.email}
                        </a>
                      }
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <PhoneIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Teléfono"
                      secondary={supportInfo.phone}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <ScheduleIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Horario"
                      secondary={supportInfo.hours}
                    />
                  </ListItem>
                </List>

                <Divider sx={{ my: 2 }} />
                
                <Typography variant="body2" color="text.secondary">
                  Nuestro equipo de soporte está aquí para ayudarte. No dudes en contactarnos si tienes preguntas específicas o necesitas asistencia técnica.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Container>
  );
}