# SaldoSmart - Gestor de Finanzas Personales

Aplicación web para la gestión de finanzas personales.

## Estructura de directorios de desarrollo

Se explican los distintos directorios que componen la aplicación web.
|Directorio |	Contenido |
|-----------|-----------|
|./ |	Contiene el código del proyecto desarrollado dividido en directorios. |
|./github/workflows |	Ficheros utilizados para el despliegue del proyecto en Azure gracias a los workflows pertenecientes a GitHub.|
|./docs |	Documentación generada con JSDoc. Dividido en un subdirectorio para cada microservicio distinto. |
|./backend |	Contiene toda la lógica necesaria para el funcionamiento del back-end dividido en un directorio por cada microservicio implementado. |
|./backend/mail-service |	Archivo de servidor y fichero de pruebas de integración del correspondiente servicio.|
|./backend/payments-service |	Archivo de servidor y fichero de pruebas de integración del correspondiente servicio.|
|./backend/payments-service/auth-middleware |	Módulo de middleware de autenticación y autorización.|
|./backend/statistics-service |	Modelos de datos de Mongoose para categorías, iconos y transacciones, archivo de servidor, ficheros con pruebas unitarias y de integración, scripts para insertar datos iniciales y  un fichero útil con funciones auxiliares.|
|./backend/statistics-service/auth-middleware |	Módulo de middleware de autenticación y autorización.|
|./backend/user-service |	Modelos de datos de Mongoose para solicitudes de amistad y usuarios, archivo de servidor, ficheros con pruebas unitarias y de integración y un fichero útil con funciones auxiliares.|
|./backend/user-service/auth-middleware |	Módulo de middleware de autenticación y autorización.|
|./frontend |	Código necesario para la implementación de la interfaz de usuario.|
|./frontend/src/componentes |	Componentes React para construir las interfaces de usuario.|
|./frontend/src/context |	Módulo de contexto de React para compartir el estado global del usuario.|
|./frontend/src/socket	| Ficheros necesarios para el uso de Socket.io|
|./frontend/src/styles |	Fichero con códigos de colores usados en la aplicación.|
|./gateway |	Archivo de servidor para la API Gateway.|
|./gateway/auth-middleware |	Módulo de middleware de autenticación y autorización.|


## Autora
**Carmen Espinosa Martínez**  
Desarrolladora de software
