# Registro de estudio — MVP

Stack: React (Vite) + Supabase.

## 1. Crear proyecto en Supabase
1. Ve a https://supabase.com y crea una cuenta / inicia sesión.
2. Crea un nuevo proyecto (elige región y una contraseña para la DB, no la necesitarás a diario).
3. Espera a que termine de aprovisionarse (1-2 min).

## 2. Crear las tablas
1. En el proyecto, ve a **SQL Editor > New query**.
2. Pega el contenido de `supabase/schema.sql` y dale **Run**.
   Esto crea las tablas `ramos` y `sesiones`, y las políticas de seguridad (cada usuario solo ve sus propios datos).

## 3. Activar login por link mágico
1. Ve a **Authentication > Providers** y confirma que "Email" esté habilitado (viene por defecto).
2. En **Authentication > URL Configuration**, agrega `http://localhost:5173` como Site URL/Redirect URL para que el link funcione en desarrollo local.

## 4. Obtener las credenciales
1. Ve a **Settings > API**.
2. Copia el **Project URL** y la **anon public key**.

## 5. Configurar el proyecto local
```bash
cp .env.example .env
```
Pega el Project URL y la anon key en `.env`.

## 6. Instalar y correr
```bash
npm install
npm run dev
```
Abre http://localhost:5173, ingresa tu correo, y entra con el link que te llega.

## 7. Deploy (opcional, cuando quieras)
1. Sube este proyecto a un repo de GitHub.
2. Conéctalo en https://vercel.com (importa el repo).
3. En las variables de entorno de Vercel, agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Agrega la URL que te da Vercel también en **Authentication > URL Configuration** de Supabase.

## Estructura
- `src/supabaseClient.js` — conexión a Supabase
- `src/components/Auth.jsx` — login sin contraseña (magic link)
- `src/components/SessionForm.jsx` — registrar sesión (cronómetro o manual), y agregar ramos
- `src/components/History.jsx` — historial agrupado por día
- `supabase/schema.sql` — script para crear las tablas y RLS

## Qué falta (fases futuras, no en este MVP)
- Gráficos (barras, heatmap tipo calendario, tendencia)
- Metas diarias y rachas con niveles (bronce/plata/oro)
- Sistema de recompensas
