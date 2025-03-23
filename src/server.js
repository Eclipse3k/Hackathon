require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const QUBIC_API_BASE = process.env.QUBIC_API_BASE;

// Rutas de archivos para persistencia
const WALLETS_FILE = path.join(__dirname, '../data/wallets.json');

// Cache para almacenar la última transacción procesada por wallet
const lastTicks = {};

// Tareas de monitoreo activas
const activeMonitoring = new Map();

app.use(express.json());

// Asegúrate de que el directorio data exista
async function ensureDataDirectory() {
    try {
        await fs.mkdir(path.join(__dirname, '../data'), { recursive: true });
    } catch (err) {
        console.error('Error al crear directorio de datos:', err);
    }
}

// Cargar wallets monitoreadas desde el archivo
async function loadWallets() {
    try {
        await ensureDataDirectory();
        const data = await fs.readFile(WALLETS_FILE, 'utf8');
        const wallets = JSON.parse(data);
        
        // Iniciar monitoreo para cada wallet cargada
        wallets.forEach(wallet => {
            startMonitoring(
                wallet.identity,
                wallet.expectedAmount,
                wallet.callbackUrl,
                wallet.interval || 30000
            );
        });
        
        console.log(`Cargadas ${wallets.length} wallets para monitoreo`);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('Error al cargar wallets:', err);
        } else {
            // Si el archivo no existe, crea uno vacío
            await saveWallets([]);
        }
    }
}

// Guardar wallets monitoreadas en el archivo
async function saveWallets() {
    try {
        await ensureDataDirectory();
        
        const wallets = Array.from(activeMonitoring.entries()).map(([identity, config]) => {
            return {
                identity,
                expectedAmount: config.expectedAmount,
                callbackUrl: config.callbackUrl,
                interval: config.interval
            };
        });
        
        await fs.writeFile(WALLETS_FILE, JSON.stringify(wallets, null, 2), 'utf8');
        console.log(`${wallets.length} wallets guardadas`);
    } catch (err) {
        console.error('Error al guardar wallets:', err);
    }
}

// Función para obtener todas las transacciones de una identidad
async function getAllTransactions(identity) {
    try {
        const requestUrl = `${QUBIC_API_BASE}/gotr/api/v1/entities/${identity}/events/qu-transfers`;
        const response = await axios.get(requestUrl);
        return response.data.events || [];
    } catch (error) {
        console.error(`Error al obtener transacciones para ${identity}:`, error.message);
        return [];
    }
}

// Función para verificar transacciones periódicamente
const checkTransactions = async (identity, expectedAmount, callbackUrl) => {
    try {
        console.log(`\n--- Verificando transacciones para ${identity} ---`);
        const requestUrl = `${QUBIC_API_BASE}/gotr/api/v1/entities/${identity}/events/qu-transfers`;
        console.log(`Consultando API: ${requestUrl}`);
        
        const response = await axios.get(requestUrl);
        const data = response.data;

        if (!data.events || data.events.length === 0) {
            console.log(`No se encontraron eventos de transferencia para ${identity}`);
            return;
        }

        // Ordenamos los eventos por tick para asegurar que procesamos en orden
        const events = data.events.sort((a, b) => a.tick - b.tick);
        console.log(`Se encontraron ${events.length} transacciones para ${identity}`);

        // Obtenemos el último tick procesado anteriormente
        const lastProcessedTick = lastTicks[identity] || 0;
        console.log(`Último tick procesado: ${lastProcessedTick}`);
        
        // Filtramos solo las nuevas transacciones
        const newTransactions = events.filter(event => event.tick > lastProcessedTick);
        console.log(`Nuevas transacciones encontradas: ${newTransactions.length}`);

        if (newTransactions.length > 0) {
            // Procesamos cada nueva transacción
            for (const transaction of newTransactions) {
                console.log(`Procesando transacción en tick ${transaction.tick}, Cantidad: ${transaction.amount}`);
                
                // Verificamos si coincide con el monto esperado (convertimos a números para comparar)
                if (Number(transaction.amount) === Number(expectedAmount)) {
                    console.log(`¡Transacción con monto esperado detectada!`);
                    
                    // Si hay una URL de callback definida, notificamos
                    if (callbackUrl) {
                        try {
                            console.log(`Enviando notificación al webhook: ${callbackUrl}`);
                            const webhookData = {
                                identity,
                                expectedAmount,
                                transaction,
                                success: true,
                                message: 'Transacción detectada con la cantidad esperada'
                            };
                            console.log(`Datos enviados al webhook:`);
                            console.log(JSON.stringify(webhookData, null, 2));
                            
                            const webhookResponse = await axios.post(callbackUrl, webhookData);
                            console.log(`Respuesta del webhook: Status ${webhookResponse.status}`);
                            console.log(JSON.stringify(webhookResponse.data, null, 2));
                        } catch (callbackError) {
                            console.error(`Error al notificar callback: ${callbackError.message}`);
                            if (callbackError.response) {
                                console.error(`Detalles del error: Status ${callbackError.response.status}`);
                                console.error(JSON.stringify(callbackError.response.data, null, 2));
                            }
                        }
                    } else {
                        console.log(`No se especificó URL de callback, no se enviará notificación`);
                    }
                    
                    // Opcionalmente, podemos detener el monitoreo si encontramos una coincidencia
                    // stopMonitoring(identity);
                } else {
                    console.log(`El monto no coincide con el esperado. No se enviará notificación.`);
                }
                
                // Actualizamos el último tick procesado
                lastTicks[identity] = transaction.tick;
            }
        } else {
            console.log(`No hay nuevas transacciones desde la última verificación (Tick ${lastProcessedTick})`);
        }
    } catch (error) {
        console.error(`Error al verificar transacciones para ${identity}: ${error.message}`);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Datos:`);
            console.error(JSON.stringify(error.response.data, null, 2));
        }
        console.error(`URL consultada: ${QUBIC_API_BASE}/gotr/api/v1/entities/${identity}/events/qu-transfers`);
    }
};

// Iniciar monitoreo de una wallet
const startMonitoring = (identity, expectedAmount, callbackUrl, interval = 30000) => {
    // Detener cualquier monitoreo previo para esta wallet
    stopMonitoring(identity);
    
    // Crear nueva tarea de monitoreo
    const taskId = setInterval(() => {
        checkTransactions(identity, expectedAmount, callbackUrl);
    }, interval);
    
    // Guardar referencia al intervalo
    activeMonitoring.set(identity, {
        taskId,
        expectedAmount,
        callbackUrl,
        interval,
        startTime: Date.now()
    });
    
    // Guardar wallets en archivo
    saveWallets();
    
    return true;
};

// Detener monitoreo de una wallet
const stopMonitoring = (identity) => {
    if (activeMonitoring.has(identity)) {
        clearInterval(activeMonitoring.get(identity).taskId);
        activeMonitoring.delete(identity);
        
        // Guardar wallets en archivo
        saveWallets();
        
        return true;
    }
    return false;
};

// Endpoint para iniciar monitoreo de transacciones
app.post('/track-wallet', async (req, res) => {
    const { identity, expectedAmount, callbackUrl, interval } = req.body;
    
    console.log(`Solicitud de monitoreo recibida:`);
    console.log(JSON.stringify({
        identity, 
        expectedAmount,
        callbackUrl: callbackUrl || "No especificado",
        interval: interval || 30000
    }, null, 2));
    
    if (!identity || !expectedAmount) {
        return res.status(400).json({ error: 'Se requiere identity y expectedAmount' });
    }
    
    // Iniciamos el monitoreo con intervalo personalizado o por defecto (30 segundos)
    const monitoringInterval = interval || 30000;
    startMonitoring(identity, expectedAmount, callbackUrl, monitoringInterval);
    
    // Ejecutamos una verificación inicial inmediata
    console.log(`Realizando verificación inicial...`);
    await checkTransactions(identity, expectedAmount, callbackUrl);
    
    return res.json({ 
        success: true, 
        message: `Monitoreo iniciado para ${identity}. Verificando cada ${monitoringInterval/1000} segundos.` 
    });
});

// Endpoint para detener el monitoreo
app.delete('/track-wallet/:identity', (req, res) => {
    const { identity } = req.params;
    
    const stopped = stopMonitoring(identity);
    
    if (stopped) {
        return res.json({ success: true, message: `Monitoreo detenido para ${identity}` });
    } else {
        return res.status(404).json({ success: false, message: `No hay monitoreo activo para ${identity}` });
    }
});

// Endpoint para listar monitoreos activos
app.get('/track-wallet', (req, res) => {
    const activeMonitors = Array.from(activeMonitoring.entries()).map(([identity, config]) => {
        return {
            identity,
            expectedAmount: config.expectedAmount,
            interval: config.interval,
            runningFor: Date.now() - config.startTime
        };
    });
    
    return res.json({ activeMonitors });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`API de Qubic: ${QUBIC_API_BASE}`);
    
    // Cargar wallets monitoreadas al iniciar el servidor
    loadWallets();
});