const express = require('express');
const fetch = require('node-fetch'); // O axios si prefieres
const dotenv = require('dotenv');
const path = require('path'); // <--- IMPORTANTE: Agregar esta línea

dotenv.config(); // Carga las variables de entorno del archivo .env

const app = express();

// Servir archivos estáticos desde la carpeta "frontend"
app.use(express.static(path.join(__dirname, '../frontend')));

// Ruta para servir el HTML principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html', 'index.html'));
});

// Endpoint para obtener el clima
app.get('/weather', async (req, res) => {
    try {
        const { city, lat, lon } = req.query;
        const ubicacion = (lat && lon) ? `${lat},${lon}` : city.replace(/\s/g, '');
        
        const apiKey = process.env.WEATHER_API_KEY;
        const url = `http://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${ubicacion}&lang=es&days=7`;
        
        console.log("URL FINAL VERIFICADA:", url); // 👈 Debe mostrar solo coordenadas
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(await response.text());
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: error.message });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
