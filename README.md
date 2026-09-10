# Cielos Abiertos Dashboard

Prompt para Lovable — "Cielos Abiertos" (App de Adoración)

Copiá y pegá todo el bloque de abajo en Lovable. Está pensado para generar únicamente el FRONT (mock, sin backend real, con datos de ejemplo hardcodeados o en estado local).

PROMPT

Quiero que crees el frontend completo de una aplicación web llamada "Cielos Abiertos", una plataforma para el equipo de adoración y música de una iglesia. Es SOLO el frontend (mock): usá datos de ejemplo (mock data) en TypeScript, sin conexión a backend real ni base de datos. Todo el estado puede vivir en el cliente (useState/localStorage simulado) por ahora.

Stack técnico

React + TypeScript

Tailwind CSS

Componentes reutilizables y bien organizados por carpetas (components, pages, mocks, types, hooks)

Diseño responsive (mobile-first en el módulo de acordes especialmente)

Estilo visual y dirección de arte

Estética minimalista, moderna y atractiva, inspirada en Spotify: modo oscuro por defecto, tipografía limpia y grande para títulos, mucho uso de cards con bordes suaves/rounded-xl, sombras sutiles, buen espaciado (whitespace generoso).

Paleta de color: base oscura (negro/gris carbón, tipo #121212 – #181818) con un color de acento cálido y espiritual (por ejemplo dorado/ámbar o azul-violeta tipo "cielo") para botones, links activos y elementos destacados. Evitar colores genéricos de plantilla.

Animaciones y transiciones suaves (hover states, transiciones al cambiar de módulo, skeleton loaders).

Logo/wordmark simple con el nombre "Cielos Abiertos" en el sidebar y en la página principal.

Iconografía consistente (usar una librería de iconos tipo lucide-react).

Estructura general de la app

Layout tipo dashboard con:

Sidebar fijo a la izquierda (colapsable en mobile, se convierte en menú inferior o drawer) con navegación a todos los módulos, agrupados en secciones:

Principal: Inicio

Música: Escuchar y Subir, Letras, Acordes, Setlists, Favoritos

Gestión: Equipo y Roles, Estadísticas

Perfil de usuario al pie del sidebar (avatar, nombre, rol) con acceso a configuración/cerrar sesión.

Área de contenido principal a la derecha, con un header superior contextual por módulo (título, buscador cuando aplique, botón de acción principal).

Sistema de roles y permisos (mock)

Crear un mock de usuario logueado con un selector simple (para poder probar distintos roles) entre estos roles:

Administrador: acceso total, puede gestionar equipo, editar/borrar cualquier canción, ver estadísticas completas.

Líder de alabanza: puede crear setlists, subir canciones, editar letras/acordes, comentar/anotar.

Músico/Vocalista: puede ver todo, marcar favoritos, agregar anotaciones propias o comentar (según config), pero no editar canciones ni gestionar equipo.

Las anotaciones colaborativas en cada canción deben respetar este permiso: solo ciertos roles pueden crear/editar/eliminar anotaciones de otros, todos pueden ver, y cada usuario puede siempre editar las suyas propias. Mostrar esto de forma visual clara (ej: badge de quién escribió la nota, ícono de candado si no tenés permiso de editar).

1. Página de Inicio / Landing (dentro de la app, primera pantalla)

Una pantalla principal bien llamativa y cálida, no solo un dashboard genérico:

Hero con el nombre "Cielos Abiertos", un lema inspirador (ej: "Adorando en espíritu y en verdad") e imagen/gradiente de fondo tipo cielo.

Accesos rápidos tipo cards grandes: "Próximo Setlist", "Canción del mes", "Últimas canciones subidas", "Tus favoritos".

Un carrusel o grid de "Canciones más tocadas este mes" con cover art placeholder.

Sección de bienvenida con el rol del usuario logueado.

2. Módulo "Escuchar y Subir" (audio)

Listado tipo Spotify de canciones con reproductor: portada (placeholder), nombre, autor/artista original, duración, tags de tema.

Reproductor persistente en la parte inferior de la pantalla (mini player) con play/pause, barra de progreso, volumen — simulado con un <audio> de HTML5 y archivos de ejemplo o URLs mock.

Formulario/modal para "Subir canción": nombre, artista, link externo (YouTube/Spotify NO, pero sí link genérico de audio o carga de archivo mock), tags de tema (multi-select, ej: "Adoración", "Júbilo", "Navidad", "Sanidad", "Bautismo"), tonalidad original.

Buscador y filtro por tag de tema.

3. Módulo "Letras"

Listado de canciones con sus letras.

Cada canción permite letra en dos formatos: texto plano editable o imagen/foto subida (mock de upload con preview).

Vista de detalle con la letra formateada en estrofas/coros, y botón para exportar a PDF.

Mismo sistema de tags de tema para búsqueda.

4. Módulo "Acordes" (el más importante — cuidalo especialmente)

Vista de canción con letra + acordes combinados (formato tipo ChordPro: acordes arriba de la sílaba correspondiente).

Toggle para ver "Solo acordes" (sin letra) o "Letra con acordes".

Transposición automática de tonalidad: selector +/- semitonos o dropdown de tonalidad, que recalcula todos los acordes de la canción en tiempo real.

Zoom: controles +/- para agrandar/achicar el tamaño de fuente, pensado especialmente para uso en mobile en un atril mientras se toca.

Sidebar/lista lateral de acceso rápido: lista de canciones con buscador en tiempo real, para saltar rápido entre canciones durante un ensayo, sin perder el estado de zoom/tonalidad de la sesión.

Modo "Presentación en vivo": pantalla limpia, fondo oscuro puro, texto grande centrado, sin distracciones de sidebar, ideal para practicar en vivo.

Botón exportar a PDF respetando la transposición y zoom elegidos.

Sección de anotaciones colaborativas debajo o al costado de la canción (comentarios tipo "entrar despacio en el coro", "cambio a corchea"), con nombre de quien comentó y fecha, respetando el sistema de permisos.

5. Módulo "Setlists"

Vista tipo calendario o lista de próximos servicios/ensayos.

Cada setlist: fecha, tipo de evento (culto domingo, ensayo, evento especial), lista ordenada (drag & drop) de canciones con la tonalidad elegida para ese día (puede diferir de la tonalidad original).

Historial de setlists pasados, con búsqueda.

Botón "Crear nuevo setlist" (solo roles con permiso) con selector de canciones desde una lista con buscador.

6. Módulo "Equipo y Roles" (dentro de "Gestión" en el sidebar)

Vista en cards bonitas, una por miembro: foto/avatar, nombre, rol dentro del ministerio (ej: Líder de alabanza, Guitarra, Batería, Voz, Sonido, Teclado), instrumento(s), y un badge de su rol de permisos en el sistema (Admin/Líder/Músico).

Filtro por instrumento/rol.

Vista de detalle del miembro al hacer click: sus datos, historial de participación en setlists recientes.

Botón "Agregar miembro" (solo Admin) con formulario modal.

Opcional: sección de asignación de servicio (quién toca en el próximo setlist).

7. Módulo "Favoritos"

Grid o lista de canciones marcadas como favoritas por el usuario actual (ícono de corazón/estrella en toda la app para marcar/desmarcar).

Accesible rápido desde cualquier canción con un solo click en el ícono.

8. Módulo "Estadísticas" (dentro de "Gestión")

Gráficos (usar recharts) mostrando:

Canciones más tocadas por mes.

Canciones más tocadas por año (comparativa entre años si hay mock de varios años).

Distribución por tema/tag (gráfico de torta o barras).

Ranking top 10 canciones históricas.

Selector de rango de tiempo (mes/año) que actualiza los gráficos.

9. Exportar a PDF (funcionalidad transversal)

Disponible desde Letras, Acordes y Setlists.

Debe respetar formato elegido (letra sola / letra+acordes / solo acordes), tonalidad transportada y tamaño de fuente configurado.

Mock esto con una librería tipo jsPDF o similar, generando un PDF descargable con buen formato (encabezado con nombre de la iglesia "Cielos Abiertos", nombre de canción, tonalidad, fecha).

Datos de ejemplo (mock)

Generá un set de mock data realista: al menos 15-20 canciones de adoración/alabanza (pueden ser nombres genéricos tipo "Océanos", "Digno de Alabanza", "Nada Nos Separará", etc.), con letras y acordes de ejemplo, varios tags de tema, 6-8 miembros del equipo con distintos roles/instrumentos, y 3-4 setlists (pasados y uno próximo) para poblar bien la demo.

Prioridad de calidad

Este debe verse como un producto real y pulido, no como un boilerplate. Cuidá especialmente:

El módulo de Acordes (transposición + zoom + lista rápida) porque es el corazón de la app.

La consistencia visual entre todos los módulos.

Los micro-detalles: estados vacíos con buen diseño, loading states, hover effects, transiciones entre páginas.

Fin del prompt.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4c73df6a-04d1-4ba8-9188-d3dd1c92763a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
