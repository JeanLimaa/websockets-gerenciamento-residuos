const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Cliente conectado');

  ws.on('message', (message) => {
    console.log('Mensagem recebida:', message);
    ws.send('Mensagem recebida: ' + message);
  });

  ws.on('close', () => {
    console.log('Cliente desconectado');
  });

  ws.send('Bem-vindo ao servidor WebSocket!');
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});