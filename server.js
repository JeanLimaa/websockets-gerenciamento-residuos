const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8080 });

server.on('connection', (ws) => {
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

console.log('Servidor WebSocket rodando na porta 8080');