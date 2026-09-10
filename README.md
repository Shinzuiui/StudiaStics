# StudiaStics — Tracker de Estudio

Stack: React (Vite) + Supabase · PWA instalable.

## Funcionalidades

- **Autenticación** — Login/registro con correo y contraseña, sesión persistente.
- **Tres modos de registro:**
  - *Libre* — Cronómetro que cuenta hacia arriba, pausar/guardar cuando quieras.
  - *Pomodoro* — Configurable (estudio + descanso), barra circular/lineal según tema, guardado parcial.
  - *Manual* — Ingresar minutos directamente.
- **Gestión de ramos** — Crear ramos con color automático, eliminar con confirmación (borra sesiones asociadas).
- **Historial** — Sesiones agrupadas por día, eliminación individual.
- **Estadísticas:**
  - Total estudiado, días activos, promedio por día.
  - Metas diarias configurables con barra de progreso.
  - Rachas (streaks) con niveles Bronce (3d) / Plata (7d) / Oro (21d).
  - Heatmap estilo GitHub (52 semanas).
  - Gráfico de barras y tendencia (últimos 7 días activos).
- **Dos temas de diseño:** Minimalista y Glassmorphism, cada uno con modo claro/oscuro.
- **PWA** — Instalable como app en celular y escritorio (manifest + service worker).

## Setup

### 1. Crear proyecto en Supabase
1. Ve a https://supabase.com y crea una cuenta / inicia sesión.
2. Crea un nuevo proyecto (elige región y una contraseña para la DB).
3. Espera a que termine de aprovisionarse (1-2 min).

### 2. Crear las tablas
1. En el proyecto, ve a **SQL Editor > New query**.
2. Pega el contenido de `supabase/schema.sql` y dale **Run**.
   Esto crea las tablas `ramos`, `sesiones` y `metas`, y las políticas de seguridad (cada usuario solo ve sus propios datos).

### 3. Configurar el login
1. Ve a **Authentication > Providers** y confirma que "Email" esté habilitado.
2. Para registro sin verificación por correo: ve a **Authentication > Sign In / Providers > Email** y desactiva "**Confirm email**".

### 4. Obtener las credenciales
1. Ve a **Settings > API**.
2. Copia el **Project URL** y la **anon public key**.

### 5. Configurar el proyecto local
```bash
cp .env.example .env
```
Pega el Project URL y la anon key en `.env`.

### 6. Instalar y correr
```bash
npm install
npm run dev
```
Abre http://localhost:5173.

### 7. Deploy (opcional)
1. Sube este proyecto a un repo de GitHub.
2. Conéctalo en https://vercel.com (importa el repo).
3. En las variables de entorno de Vercel, agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## Estructura del proyecto

```
├── public/                    # Iconos PWA (192, 512, maskable, apple-touch, favicon)
├── src/
│   ├── components/
│   │   ├── Auth.jsx           # Login/registro con correo y contraseña
│   │   ├── SessionForm.jsx    # Registrar sesión (libre, pomodoro, manual) + gestión de ramos
│   │   ├── History.jsx        # Historial agrupado por día
│   │   ├── Stats.jsx          # Dashboard de estadísticas
│   │   ├── GoalSetting.jsx    # Metas diarias con barra de progreso
│   │   ├── StreakDisplay.jsx   # Banner de racha con niveles
│   │   ├── Heatmap.jsx        # Heatmap tipo GitHub (52 semanas)
│   │   ├── Charts.jsx         # Gráficos (barras + tendencia) con Recharts
│   │   ├── ThemeToggle.jsx    # Alternar tema claro/oscuro
│   │   └── DesignToggle.jsx   # Alternar diseño Minimal/Glassmorphism
│   ├── App.jsx                # Layout principal, tabs, estado global del timer
│   ├── App.css                # Estilos por tema/componente
│   ├── index.css              # Variables CSS globales y glassmorphism
│   ├── main.jsx               # Entry point con validación de env vars
│   ├── supabaseClient.js      # Conexión a Supabase
│   └── utils.js               # Helpers: getLocalDate(), formatMinutes()
├── supabase/
│   └── schema.sql             # Script para crear tablas y RLS
├── index.html                 # HTML con meta tags PWA
└── vite.config.js             # Vite + React + PWA plugin
```

## Dependencias

- `react` + `react-dom` — UI
- `@supabase/supabase-js` — Backend (auth + DB)
- `recharts` — Gráficos
- `vite-plugin-pwa` (dev) — Generación de Service Worker y Manifest
