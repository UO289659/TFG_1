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
import '../styles/variables.css';
import Footer from "./Footer.js";

const faqData = [
   {
    categoria: "Transacciones",
    preguntas: [
       {
        pregunta: "¿Dónde puedo añadir mis gastos o ingresos?",
        respuesta: "1) Accede a la pestaña 'Transacciones', 2) Haz clic en '+ Nueva transacción' 3) Completa los datos requeridos, 4) Guarda los cambios",
        tags: ["registrar", "ingreso", "gasto", "transacciones"]
      },
      {
        pregunta: "¿Qué significa el tipo 'Ingreso' o 'Gasto'?",
        respuesta: "El tipo define la naturaleza de la transacción: 'Ingreso' representa dinero que entra (salario, ventas, etc.) y 'Gasto' representa dinero que sale (compras, pagos, etc.). Esta clasificación es fundamental para generar estadísticas precisas.",
        tags: ["tipos", "ingreso", "gasto", "transacciones"]
      },
      {
        pregunta: "¿Puedo modificar una transacción después de crearla?",
        respuesta: "Sí, puedes editar transacciones existentes. Busca la transacción en tu historial, haz clic en el icono de edición y modifica los campos necesarios. Los cambios se reflejarán automáticamente en tus estadísticas.",
        tags: ["editar", "transacciones", "modificar"]
      },
       {
        pregunta: "¿Puedo eliminar una transacción después de crearla?",
        respuesta: "Sí, puedes eliminar transacciones existentes. Busca la transacción en tu historial y haz clic en el icono de papelera.",
        tags: ["eliminar", "transacciones", "gasto", "ingreso"]
      },
      {
        pregunta: "¿Puedo filtrar transacciones por fecha?",
        respuesta: "Sí, puedes filtrar transacciones a través de los botones proporcionados en la pantall principal: 'día', 'semana', 'mes', 'año' o 'periodo'.",
        tags: ["filtrar", "transacciones", "gasto", "ingreso"]
      },
       {
        pregunta: "¿Puedo filtrar transacciones en un rango de fechas concreto?",
        respuesta: "Sí, puedes filtrar transacciones en un rango de fechas haciendo clic en el botón 'periodo' proporcionado en la pantalla principal",
        tags: ["filtrar", "transacciones", "gasto", "ingreso", "fecha concreta"]
      }
    ]
  },
  {
    categoria: "Categorías",
    preguntas: [
      {
        pregunta: "¿Puedo editar una categoría global?",
        respuesta: "Las categorías globales no se pueden editar directamente para mantener la consistencia del sistema. Sin embargo, puedes crear una categoría personalizada con características similares. Ve a la sección 'Categorías' y selecciona '+ Nueva categoría' para personalizar completamente tus opciones.",
        tags: ["categorías", "editar", "personalizar"]
      },
      {
        pregunta: "¿Cómo creo una categoría personalizada?",
        respuesta: "Para crear una categoría personalizada: 1) Ve a la sección 'Categorías', 2) Haz clic en '+ Nueva Categoría', 3) Completa el nombre y selecciona el tipo (Ingreso/Gasto), 4) Guarda los cambios.",
        tags: ["categorías", "crear", "personalizar"]
      }, {
        pregunta: "¿Puedo ver las categorías que tengo activas?",
        respuesta: "Sí, en la pestaña 'Categorías' se mostrará una lista de todas las categorías activas.",
        tags: ["categorías", "ver", "activas"]
      }
    ]
  },
 
  {
    categoria: "Estadísticas",
    preguntas: [
      {
        pregunta: "¿Dónde veo mis estadísticas?",
        respuesta: "Puedes ver tus estadísticas en el panel principal. Ahí encontrarás gráficos de ingresos vs gastos, distribución por categorías y tendencias temporales.",
        tags: ["estadísticas", "análisis", "gráficos"]
      },
      {
        pregunta: "¿Puedo exportar mis datos?",
        respuesta: "Sí, puedes exportar tus datos en formato CSV si eres usuario Premium. Esta función te permite hacer backup de tu información o analizarla en otras herramientas.",
        tags: ["exportar", "datos", "backup"]
      }
    ]
  },
   {
    categoria: "Planes de suscripción",
    preguntas: [
      {
        pregunta: "¿Cómo puedo cambiar mi plan de suscripción?",
        respuesta: "En la pestaña 'Perfil' verás tu plan activo junto con un botón para cambiarlo.",
        tags: ["premium", "básico", "suscripción"]
      },
      {
        pregunta: "¿Qué funciones tiene el plan premium?",
        respuesta: "Con el plan premium tendrás soporte prioritario y acceso a funciones avanzadas como añadir amigos, registrar gastos compartidos y exportar transacciones.",
        tags: ["exportar", "amigos", "gastos compartidos", "premium"]
      }
    ]
  },
   {
    categoria: "Amigos",
    preguntas: [
      {
        pregunta: "¿Cómo puedo buscar amigos?",
        respuesta: "En la pestaña 'Amigos' verás la opción de buscar amigos junto con una barra de navegación donde podrás introducir el nombre, apellido o email de los usuarios premium.",
        tags: ["premium", "amigo", "buscar"]
      },
      {
        pregunta: "¿Cómo puedo añadir amigos?",
        respuesta: "Para añadir amigos, basta con buscarlos a través de la barra de navegación. En los resultados de la búsqueda, aparecerán los usuarios junto con un botón para poder agregarlos.",
        tags: ["premium", "amigos", "añadir"]
      },
        {
        pregunta: "¿Dónde puedo ver mis solicitudes de amistad?",
        respuesta: "En la pestaña 'Amigos', dentro del apartado 'Solicitudes' verás las solicitudes recibidas y enviadas con su correspondiente estado.",
        tags: ["premium", "amigos", "solicitudes"]
      },
       {
        pregunta: "¿Dónde puedo ver mis amigos?",
        respuesta: "En la pestaña 'Amigos', se mostrará un listado de todos tus amigos.",
        tags: ["premium", "amigos", "ver"]
      },
        {
        pregunta: "¿Cómo puedo eliminar amigos?",
        respuesta: "Para eliminar amigos, accede a la pestaña 'Amigos'. Se mostrará una lista de amigos junto con un botón de eliminado.",
        tags: ["premium", "amigos", "eliminar"]
      }
    ]
  },
   {
    categoria: "Contacto",
    preguntas: [
      {
        pregunta: "¿Cómo puedo contactar con la empresa?",
        respuesta: "En la pestaña 'Contacto' verás un formulario que te permitirá enviar un mensaje a la empresa. No obstante, también puedes enviar un correo electrónico a través de la dirección de correo habilitada en la misma página",
        tags: ["contacto", "problema", "soporte"]
      }
    ]
  },
   {
    categoria: "Editar datos personales",
    preguntas: [
      {
        pregunta: "¿Cómo puedo editar mis datos personales?",
        respuesta: "En la pestaña 'Perfil' verás dos formularios habilitados para tal fin. El primero de ellos, te permitirá actualizar tu nombre y apellido. El segundo, te permitirá cambia tu contraseña",
        tags: ["editar", "datos personales", "contraseña"]
      }
    ]
  },
];

const guideSteps = [
  {
    icon: <CheckIcon sx={{ color: 'var(--purple)' }} />,
    title: "Registro e Inicio de Sesión",
    description: "Crea tu cuenta desde la pantalla de inicio y accede con tus credenciales."
  },
  {
    icon: <CategoryIcon sx={{ color: 'var(--purple)' }} />,
    title: "Configurar Categorías",
    description: "Personaliza tus categorías de ingresos y gastos. Puedes usar las predefinidas o crear las tuyas propias."
  },
  {
    icon: <IncomeIcon sx={{ color: '#10b981' }} />,
    title: "Registrar Ingresos",
    description: "Añade tus ingresos especificando monto, categoría, nombre e icono. El sistema calculará automáticamente tus totales."
  },
  {
    icon: <ExpenseIcon sx={{ color: '#ef4444' }} />,
    title: "Registrar Gastos",
    description: "Registra tus gastos de manera similar a los ingresos. Usa las categorías para mantener organizadas tus finanzas."
  },
  {
    icon: <StatsIcon sx={{ color: 'var(--purple)' }} />,
    title: "Analizar Estadísticas",
    description: "Revisa tus análisis financieros, gráficos y resúmenes para tomar decisiones informadas sobre tu presupuesto."
  }
];

const supportInfo = {
  email: "saldosmart.info@gmail.com",
  phone: "+34 673 48 14 14",
  hours: "Lunes a Viernes, 9:00 - 18:00"
};

// Mover TabPanel fuera del componente principal
const TabPanel = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

export default function ProfessionalHelpPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAccordion, setExpandedAccordion] = useState(false);

  const handleTagClick = (tag) => {
    setSearchTerm(tag);
  };

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

  const customStyles = {
    container: {
      py: 4,
     
      minHeight: '100vh',
      position: 'relative'
    },
    headerBox: {
      mb: 4,
      textAlign: 'center',
      padding: '2rem',
      borderRadius: '20px',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--glass-border)',
      boxShadow: 'var(--shadow-soft)'
    },
    headerTitle: {
    
      fontWeight: 'bold',
      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    headerSubtitle: {
      color: 'var(--white-transparent)',
      opacity: 0.9
    },
    tabsPaper: {
      mb: 3,
      background: 'var(--white-transparent)',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--glass-border)',
      borderRadius: '15px',
      boxShadow: 'var(--shadow-soft)'
    },
    customTab: {
      color: 'var(--text-secondary)',
      '&.Mui-selected': {
        color: 'var(--purple)',
        fontWeight: 'bold'
      }
    },
    searchField: {
      mb: 3,
      '& .MuiOutlinedInput-root': {
        background: 'var(--white-transparent)',
        backdropFilter: 'blur(10px)',
        borderRadius: '15px',
        border: '1px solid var(--glass-border)',
        '& fieldset': {
          border: 'none'
        },
        '&:hover fieldset': {
          border: 'none'
        },
        '&.Mui-focused fieldset': {
          border: '2px solid var(--purple)'
        }
      }
    },
    accordion: {
      mb: 1,
      background: 'var(--white-transparent)',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--glass-border)',
      borderRadius: '15px !important',
      boxShadow: 'var(--shadow-soft)',
      '&:before': {
        display: 'none'
      }
    },
    categoryTitle: {
      color: 'var(--purple)',
      fontWeight: 'bold',
      textShadow: '0 1px 2px rgba(0,0,0,0.1)',
      mb: 2
    },
    card: {
      height: '100%',
      background: 'var(--white-transparent)',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--glass-border)',
      borderRadius: '20px',
      boxShadow: 'var(--shadow-soft)',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: 'var(--shadow-large)'
      }
    },
    chip: {
      mr: 1,
      mb: 1,
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--purple)',
      color: 'var(--purple)',
      '&:hover': {
        background: 'var(--purple)',
        color: 'white'
      }
    },
    button: {
      background: 'var(--primary-gradient)',
      color: 'white',
      borderRadius: '15px',
      padding: '12px 32px',
      fontWeight: 'bold',
      textTransform: 'none',
      boxShadow: 'var(--shadow-soft)',
      '&:hover': {
        background: 'var(--secondary-gradient)',
        transform: 'translateY(-2px)',
        boxShadow: 'var(--shadow-large)'
      }
    },
    alert: {
      background: 'var(--white-transparent)',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--glass-border)',
      borderRadius: '15px',
    }
  };

  return (
    <>
    <Container maxWidth="lg" sx={customStyles.container}>
      {/* Header */}
      <Box sx={customStyles.headerBox}>
        <Typography variant="h3" component="h1" gutterBottom sx={customStyles.headerTitle}>
          Centro de Ayuda
        </Typography>
        <Typography variant="h6" sx={customStyles.headerSubtitle}>
          Encuentra respuestas rápidas y aprende a usar todas las funcionalidades
        </Typography>
      </Box>

      {/* Navigation Tabs */}
      <Paper elevation={0} sx={customStyles.tabsPaper}>
        <Tabs 
          value={tabIndex} 
          onChange={(e, newValue) => setTabIndex(newValue)}
          variant="fullWidth"
          TabIndicatorProps={{
            style: {
              backgroundColor: 'var(--purple)',
              height: '3px',
              borderRadius: '3px'
            }
          }}
        >
          <Tab 
            icon={<HelpIcon />} 
            label="Preguntas Frecuentes" 
            iconPosition="start"
            sx={customStyles.customTab}
          />
          <Tab 
            icon={<GuideIcon />} 
            label="Guía de Inicio" 
            iconPosition="start"
            sx={customStyles.customTab}
          />
          <Tab 
            icon={<TutorialIcon />} 
            label="Tutoriales" 
            iconPosition="start"
            sx={customStyles.customTab}
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
                  <SearchIcon sx={{ color: 'var(--purple)' }} />
                </InputAdornment>
              ),
            }}
            sx={customStyles.searchField}
          />
        </Box>

        {filteredFAQ.length === 0 && searchTerm && (
          <Alert severity="info" sx={customStyles.alert}>
            No se encontraron resultados para "{searchTerm}". Intenta con otros términos de búsqueda.
          </Alert>
        )}

        {filteredFAQ.map((categoria, catIndex) => (
          <Box key={catIndex} sx={{ mb: 3 }}>
            <Typography variant="h5" gutterBottom sx={customStyles.categoryTitle}>
              {categoria.categoria}
            </Typography>
            {categoria.preguntas.map((item, index) => (
              <Accordion
                key={`${catIndex}-${index}`}
                expanded={expandedAccordion === `${catIndex}-${index}`}
                onChange={handleAccordionChange(`${catIndex}-${index}`)}
                sx={customStyles.accordion}
              >
                <AccordionSummary 
                  expandIcon={<ExpandMoreIcon sx={{ color: 'var(--purple)' }} />}
                  sx={{ 
                    '& .MuiAccordionSummary-content': {
                      margin: '16px 0'
                    }
                  }}
                >
                  <Typography variant="h6" fontWeight="medium" sx={{ color: 'var(--text-primary)' }}>
                    {item.pregunta}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph sx={{ color: 'var(--text-secondary)' }}>
                    {item.respuesta}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    {item.tags.map((tag, tagIndex) => (
                      <Chip
                        key={tagIndex}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={customStyles.chip}
                        onClick={() => handleTagClick(tag)} 
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
        <Box sx={{ width: '100%' }}>
          {guideSteps.map((step, index) => (
            <Card 
              key={index} 
              elevation={0} 
              sx={{ 
                ...customStyles.card,
                mb: 3,
                width: '100%'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <Box mr={2}>{step.icon}</Box>
                  <Typography variant="h6" fontWeight="bold" sx={{ color: 'var(--text-primary)' }}>
                    {index + 1}. {step.title}
                  </Typography>
                </Box>
                <Typography sx={{ color: 'var(--text-secondary)', ml: 5 }}>
                  {step.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Alert severity="success" sx={{ ...customStyles.alert, mt: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'var(--text-primary)' }}>
            ¡Consejo Pro!
          </Typography>
          <Typography sx={{ color: 'var(--text-secondary)' }}>
            Para obtener mejores resultados, dedica unos minutos al inicio para configurar tus categorías personalizadas. Esto hará que el seguimiento de tus finanzas sea más preciso y útil.
          </Typography>
        </Alert>
      </TabPanel>

      {/* Tutorials Tab */}
      <TabPanel value={tabIndex} index={2}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={customStyles.card}>
              <CardContent>
                <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ color: 'var(--text-primary)' }}>
                  Tutoriales en Video
                </Typography>
                <Typography paragraph sx={{ color: 'var(--text-secondary)' }}>
                  Estamos preparando una serie completa de tutoriales en video para ayudarte a dominar todas las funcionalidades de la aplicación.
                </Typography>
                
                <Alert severity="info" sx={{ ...customStyles.alert, mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ color: 'var(--text-primary)' }}>
                    Próximamente disponibles:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="• Configuración inicial y personalización" 
                        sx={{ '& .MuiListItemText-primary': { color: 'var(--text-secondary)' } }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="• Gestión avanzada de categorías" 
                        sx={{ '& .MuiListItemText-primary': { color: 'var(--text-secondary)' } }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="• Análisis de estadísticas y reportes" 
                        sx={{ '& .MuiListItemText-primary': { color: 'var(--text-secondary)' } }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="• Tips y trucos para usuarios avanzados" 
                        sx={{ '& .MuiListItemText-primary': { color: 'var(--text-secondary)' } }}
                      />
                    </ListItem>
                  </List>
                </Alert>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={customStyles.card}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ color: 'var(--text-primary)' }}>
                  ¿Necesitas ayuda personalizada?
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <EmailIcon sx={{ color: 'var(--purple)' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Email"
                      secondary={
                        <a href={`mailto:${supportInfo.email}`} style={{ color: 'var(--purple)', textDecoration: 'none' }}>
                          {supportInfo.email}
                        </a>
                      }
                      sx={{ 
                        '& .MuiListItemText-primary': { color: 'var(--text-primary)' },
                        '& .MuiListItemText-secondary': { color: 'var(--text-secondary)' }
                      }}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <PhoneIcon sx={{ color: 'var(--purple)' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Teléfono"
                      secondary={supportInfo.phone}
                      sx={{ 
                        '& .MuiListItemText-primary': { color: 'var(--text-primary)' },
                        '& .MuiListItemText-secondary': { color: 'var(--text-secondary)' }
                      }}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <ScheduleIcon sx={{ color: 'var(--purple)' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Horario"
                      secondary={supportInfo.hours}
                      sx={{ 
                        '& .MuiListItemText-primary': { color: 'var(--text-primary)' },
                        '& .MuiListItemText-secondary': { color: 'var(--text-secondary)' }
                      }}
                    />
                  </ListItem>
                </List>

                <Divider sx={{ my: 2, borderColor: 'var(--glass-border)' }} />
                
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                  Nuestro equipo de soporte está aquí para ayudarte. No dudes en contactarnos si tienes preguntas específicas o necesitas asistencia técnica.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Container>
     <Footer/>
     </>
  );
}