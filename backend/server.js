const express = require('express');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middleware para logs
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health Check (para Render)
app.get('/api/healthcheck', (req, res) => {
  res.status(200).send('OK');
});

// Servir archivos estáticos (ORDEN IMPORTANTE)
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/js')));
app.use('/img', express.static(path.join(__dirname, '../frontend/img')));
app.use(express.static(path.join(__dirname, '../frontend/html'))); // HTML principal

// API Endpoints (deben ir ANTES del catch-all)
app.get('/api/weather', async (req, res) => {  // Cambiado a /api/weather
  try {
    const { city, lat, lon } = req.query;
    const ubicacion = (lat && lon) ? `${lat},${lon}` : city?.replace(/\s/g, '');
    
    if (!ubicacion) return res.status(400).json({ error: 'Se requiere ciudad o coordenadas' });

    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) throw new Error('API key no configurada');

    const url = `http://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(ubicacion)}&lang=es&days=7`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        error: errorData.error?.message || 'Error al consultar el clima' 
      });
    }

    res.json(await response.json());
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message || 'Error interno' });
  }
});

// Catch-all route (DEBE SER LA ÚLTIMA RUTA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/html/index.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor escuchando en puerto ${port}`);
  console.log(`• Healthcheck: http://localhost:${port}/api/healthcheck`);
  console.log(`• Frontend: http://localhost:${port}/`);
  console.log(`• API Weather: http://localhost:${port}/api/weather`);
});