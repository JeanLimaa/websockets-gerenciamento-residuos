const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8080;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

app.use(express.json());

const server = http.createServer(app);

const wss = new WebSocket.Server({ server, path: '/ws' });

// Buffer para armazenar dados por deviceId
const dataBuffer = new Map();

app.get('/', (req, res) => {
  res.status(200).send("OK");
});

// Função para calcular média
function calculateAverage(arr) {
  if (arr.length === 0) return 0;
  const sum = arr.reduce((acc, val) => acc + val, 0);
  const avg = sum / arr.length;
  return Math.round(avg * 100) / 100; // Arredonda para 2 casas decimais
}

// Função para processar e enviar dados do buffer
async function processBuffer() {
  console.log('Processando buffer...');

  const promises = [];

  for (const [deviceId, data] of dataBuffer.entries()) {
    if (data.temperatures.length === 0) continue;

    const avgTemperature = calculateAverage(data.temperatures);
    const avgHumidity = calculateAverage(data.humidities);

    const hasGasLevelChange = data.gasLevels.some(val => val !== data.gasLevels[0]);

    if (hasGasLevelChange) {
      let lastGasLevel = null;
      const readings = [];

      for (let i = 0; i < data.gasLevels.length; i++) {
        if (data.gasLevels[i] !== lastGasLevel) {
          readings.push({
            deviceId,
            temperature: data.temperatures[i] || avgTemperature,
            humidity: data.humidities[i] || avgHumidity,
            gasLevel: data.gasLevels[i]
          });
          lastGasLevel = data.gasLevels[i];
        }
      }

      promises.push(...readings.map(reading => sendReadingToBackend(reading)));
    } else {
      const reading = {
        deviceId,
        temperature: avgTemperature,
        humidity: avgHumidity,
        gasLevel: data.gasLevels[0]
      };
      promises.push(sendReadingToBackend(reading));
    }

    dataBuffer.delete(deviceId);
  }

  await Promise.all(promises);
}


// Função para enviar dados ao backend
async function sendReadingToBackend(reading) {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/readings`, reading);
    console.log(`Leitura enviada para ${reading.deviceId}:`, response.data);
  } catch (error) {
    console.error(`Erro ao enviar leitura para ${reading.deviceId}:`, error.message);
  }
}

// Processa buffer a cada 1 minuto (60000ms)
setInterval(processBuffer, 60000);

wss.on('connection', (ws) => {
  console.log('Cliente conectado');

  ws.on('message', (message) => {
    const messageConverted = message.toString('utf-8');
    console.log('Mensagem recebida:', messageConverted);
    
    try {
      // Tenta fazer parse da mensagem JSON
      const data = JSON.parse(messageConverted);
      
      // Valida se tem os campos necessários
      if (data.deviceId && data.temperature !== undefined && data.humidity !== undefined && data.gasLevel !== undefined) {
        // Inicializa buffer do dispositivo se não existir
        if (!dataBuffer.has(data.deviceId)) {
          dataBuffer.set(data.deviceId, {
            temperatures: [],
            humidities: [],
            gasLevels: []
          });
        }

        // Adiciona dados ao buffer
        const buffer = dataBuffer.get(data.deviceId);
        buffer.temperatures.push(parseFloat(data.temperature));
        buffer.humidities.push(parseFloat(data.humidity));
        buffer.gasLevels.push(parseInt(data.gasLevel));

        console.log(`Dados adicionados ao buffer do dispositivo ${data.deviceId}`);
      }
    } catch (e) {
      console.log('Mensagem não é JSON válido, ignorando:', e.message);
    }
    
    // Broadcast da mensagem para todos os clientes
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageConverted);
      }
    });
  });

  ws.on('close', () => {
    console.log('Cliente desconectado');
  });

  ws.send('Bem-vindo ao servidor WebSocket!');
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});