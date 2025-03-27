const API_BASE_URL = window.location.origin;

document.addEventListener("DOMContentLoaded", () => {
    initUbicacion();
});

async function initUbicacion() {
    // 1. Primero intentamos con la API de IP (sin requerir permisos)
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (data.latitude && data.longitude) {
            getWeatherCoords(data.latitude, data.longitude);
            mostrarMapa(data.latitude, data.longitude);
            return;
        }
    } catch (error) {
        console.log("Error con ipapi.co:", error);
    }

    // 2. Si falla, pedimos geolocalización al navegador
    if (navigator.geolocation) {
        document.getElementById("ubicacion").textContent = "Permite el acceso a tu ubicación para mejores resultados...";
        
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                getWeatherCoords(pos.coords.latitude, pos.coords.longitude);
                mostrarMapa(pos.coords.latitude, pos.coords.longitude);
            },
            (err) => {
                console.log("Error de geolocalización:", err);
                showSearchPrompt();
            }
        );
    } else {
        showSearchPrompt();
    }
}

function showSearchPrompt() {
    document.getElementById("ubicacion").textContent = "Ingresa una ciudad para ver el clima:";
    document.getElementById("search").placeholder = "Ej: Santiago, Buenos Aires...";
    document.getElementById("search").focus();
    
    // Configura el event listener para el buscador
    document.getElementById("search").addEventListener("change", (e) => {
        if (e.target.value.trim()) {
            getWeather(e.target.value);
        }
    });
}


// funciones de clima usando el backend

function success(position) {
    const { latitude, longitude } = position.coords;
    getWeatherCoords(latitude, longitude);
}

function error() {
    const buscador = document.getElementById("search");
    const ubicacionElement = document.getElementById("ubicacion");
    
    ubicacionElement.textContent = "Ingresa una ciudad para ver el clima";
    buscador.placeholder = "Ej: Santiago, Buenos Aires...";
    buscador.focus();
    
    buscador.addEventListener("change", (event) => {
        if (event.target.value.trim()) {
            getWeather(event.target.value);
        }
    });
}

async function obtenerClimaCiudad(city) {
    const url = `http://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${city}&lang=es&days=7`;
    fetchWeather(url);
}

async function getWeatherCoords(lat, lon) {
    fetchWeather({ lat, lon }); // Envía como objeto
}

function getWeather() {
    const cityInput = document.getElementById('search');
    const city = cityInput.value.trim();
    if (!city) {
        alert("Por favor ingresa una ciudad.");
        return;
    }
    fetchWeather(city); 
    cityInput.value = '';
}

async function fetchWeather(locationData) {
    try {
        let url;
        if (typeof locationData === 'object' && locationData.lat && locationData.lon) {
            url = `${API_BASE_URL}/api/weather?lat=${locationData.lat}&lon=${locationData.lon}`;
        } else if (typeof locationData === 'string') {
            url = `${API_BASE_URL}/api/weather?city=${encodeURIComponent(locationData)}`;
        } else {
            throw new Error('Datos de ubicación no válidos');
        }

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('No se pudieron obtener los datos de la ciudad');
        }

        const data = await response.json();
        
        if (!data?.location || !data?.current) {
            throw new Error('Datos meteorológicos incompletos');
        }

        mostrarResultado(data);
        actualizarBotones(data.forecast.forecastday);
        
        return data;
        
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
        throw error;
    }
}


function actualizarBotones(forecastDays) {
    const botonesContainer = document.getElementById("botonesDias");
    botonesContainer.innerHTML = ""; // Limpiar botones anteriores

    forecastDays.forEach((dia, index) => {
        const nombreDia = obtenerNombreDia(dia.date);

        // Crear botón
        const boton = document.createElement("button");
        boton.textContent = `${nombreDia}`; // Texto del botón
        boton.setAttribute("data-fecha", dia.date);

        // Evento click
        boton.addEventListener("click", () => {
            mostrarHorasDelDia(forecastDays, dia.date);
        });

        // Si es el primer botón, marcarlo
        if (index === 0) {
            boton.classList.add("marcado");  // Aquí le damos una clase para que esté marcado
            mostrarHorasDelDia(forecastDays, dia.date);  // Llamamos a la función para mostrar las horas del primer día
        }

        botonesContainer.appendChild(boton);
    });
}


function obtenerNombreDia(fecha) {
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    // Crear un Date en UTC
    const fechaObj = new Date(fecha + "T00:00:00Z");

    return dias[fechaObj.getUTCDay()]; // Usamos getUTCDay() para obtener el día de la semana en UTC
}

function mostrarHorasDelDia(forecastDays, fechaSeleccionada) {
    const diaEncontrado = forecastDays.find(dia => dia.date === fechaSeleccionada);

    if (diaEncontrado) {
        let horas = []; // Array para almacenar las horas
        let temperaturas = []; // Array para almacenar las temperaturas

        diaEncontrado.hour.forEach((horaObj) => {
            const hora = horaObj.time.split(' ')[1];
            const temperatura = horaObj.temp_c;
            horas.push(hora); // Agregar la hora al array
            temperaturas.push(temperatura); // Agregar la temperatura al array
        });
        
        const max = diaEncontrado.day.maxtemp_c;
        const min = diaEncontrado.day.mintemp_c;

        // mostrar maximo/minimo
        document.getElementById("horasDia").textContent = `Máx: ${max}°C / Mín: ${min}°C`;

        // Crear el gráfico de temperaturas
        crearGrafico(horas, temperaturas);
    } else {
        console.log(`No hay datos para la fecha: ${fechaSeleccionada}`);
    }
}


function obtenerColorPorTemperatura(temperatura) {
    if (temperatura <= 0) {
        return 'rgba(0, 0, 255, 0.6)'; // Azul para temperaturas frías
    } else if (temperatura <= 15) {
        return 'rgba(0, 255, 255, 0.6)'; // Cyan para temperaturas frescas
    } else if (temperatura <= 30) {
        return 'rgba(255, 255, 0, 0.6)'; // Amarillo para temperaturas templadas
    } else {
        return 'rgba(255, 0, 0, 0.6)'; // Rojo para temperaturas altas
    }
}

let myChart;

function crearGrafico(horas, temperaturas) {
    const ctx = document.getElementById('graficoTemperatura').getContext('2d');

    if (myChart) {
        myChart.destroy();
    }

    const temperaturaColores = temperaturas.map(temp => obtenerColorPorTemperatura(temp)); // Mapear cada temperatura a su color

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: horas, // Horas del día
            datasets: [{
                label: 'Temperatura (°C)',
                data: temperaturas, // Temperaturas
                borderColor: temperaturaColores, // Colores dinámicos según temperatura
                backgroundColor: temperaturaColores, // Fondo transparente para la línea
                fill: true, // Activar el relleno
                tension: 0.4, // Curvatura más suave
                borderWidth: 2, // Grosor de la línea
                pointRadius: 4, // Tamaño de los puntos
                pointBackgroundColor: '#FFFFFF', // Puntos en blanco para contrastar
                pointBorderWidth: 2, // Borde de los puntos
                pointHoverRadius: 6, // Radio al pasar el ratón sobre los puntos
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Hora', // Título del eje X
                        color: 'white'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)', // Color sutil para las líneas de la cuadrícula
                    },
                    ticks: {
                        font: {
                            size: 12, // Tamaño de la fuente
                            family: 'Arial', // Fuente
                            weight: 'bold', // Peso de la fuente
                            color: '#ffffff', // Color de la fuente
                        },
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: 'Temperatura (°C)', // Título del eje Y
                        color: 'white'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)', // Color sutil de la cuadrícula
                    },
                    ticks: {
                        font: {
                            size: 12,
                            family: 'Arial',
                            weight: 'bold',
                            color: '#ffffff',
                        },
                        stepSize: 5, // Tiempos de intervalo entre cada tick
                    }
                }
            },
            plugins: {
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Fondo oscuro para los tooltips
                    titleColor: '#fff', // Color del título del tooltip
                    bodyColor: '#fff', // Color del contenido
                    borderColor: '#FF5733', // Borde del tooltip en color cálido
                    borderWidth: 1,
                }
            }
        }
    });
}




function mostrarResultado(response) {
    const now = new Date();
    const horas = String(now.getHours()).padStart(2, '0');
    const minutos = String(now.getMinutes()).padStart(2, '0');

    document.getElementById("ubicacion").textContent = `${response.location.name}, ${response.location.region}`;
    document.getElementById("temperatura").textContent = `${response.current.temp_c}°C  |   ${horas}:${minutos}`;
    document.getElementById("clima").textContent = response.current.condition.text;
    document.getElementById("detalles").textContent = `Máx: ${response.forecast.forecastday[0].day.maxtemp_c}°C / Mín: ${response.forecast.forecastday[0].day.mintemp_c}°C`;
    document.getElementById("sensacion").textContent = `Sensación térmica: ${response.current.feelslike_c}°C`;

    document.getElementById("uv").textContent = `Índice UV: ${response.current.uv}`;
    document.getElementById("humedad").textContent = `Humedad: ${response.current.humidity}%`;
    document.getElementById("viento").textContent = `Viento: ${response.current.wind_kph} km/h`;
    document.getElementById("visibilidad").textContent = `Visibilidad: ${response.current.vis_km} km`;
    document.getElementById("sunrise").textContent = `Amanecer: ${response.forecast.forecastday[0].astro.sunrise}`;
    document.getElementById("sunset").textContent = `Atardecer: ${response.forecast.forecastday[0].astro.sunset}`;
}

function mostrarHoras(response) {
    response.forecast.forecastday[0].hour.forEach((hora) => {
        console.log(`Hora: ${hora.time}, Temperatura: ${hora.temp_c}°C`);
    });
}

function mostrarDias(response) {
    response.forecast.forecastday.forEach((dia) => {
        const diaSemana = dia.date;
        console.log(`Día: ${diaSemana}`);

        response.forecast.forecastday[0].hour.forEach((hora) => {
            const horaDia = hora.time;

            if (diaSemana == horaDia){
                console.log(`Hora: ${hora.time}, Temperatura: ${hora.temp_c}°C`);
            }
        });
        console.log(`Dia: ${diaSemana}`);
    });
}

function mostrarGrafico(horas) {
    // Extraer las horas y las temperaturas de los datos
    const etiquetasHoras = horas.map(hora => hora.time.split(' ')[1]); // Solo la hora (no la fecha)
    const temperaturas = horas.map(hora => hora.temp_c); // Temperaturas en °C

    // Crear el gráfico
    const ctx = document.getElementById('graficoTemperaturas').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'line', // Tipo de gráfico (línea)
        data: {
            labels: etiquetasHoras, // Las horas como etiquetas
            datasets: [{
                label: 'Temperatura (°C)',
                data: temperaturas, // Los valores de temperatura
                borderColor: 'rgb(29, 51, 175)', // Color de la línea
                backgroundColor: 'rgba(75, 192, 192, 0.2)', // Color de fondo de la línea
                fill: true, // Rellenar el área bajo la línea
                tension: 0.5 // Curvatura de la línea
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Hora'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Temperatura (°C)'
                    },
                    ticks: {
                        beginAtZero: false
                    }
                }
            }
        }
    });
}


function mostrarMapa(lat, lon) {
    var map = L.map('map').setView([lat, lon], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    L.marker([lat, lon]).addTo(map)
        .bindPopup("Ubicación aproximada")
        .openPopup();
}