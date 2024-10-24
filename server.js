const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

const server = http.createServer(app);

const wss = new WebSocket.Server({ server, path: '/ws' });

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  if(email === "teste" && password === "teste") {
    return res.status(200).send('Login efetuado com sucesso');
  }

  return res.status(401).send('Credenciais incorretas');
});

wss.on('connection', (ws) => {
  console.log('Cliente conectado');

  ws.on('message', (message) => {
    const messageConverted = message.toString('utf-8');
    console.log('Mensagem recebida:', messageConverted);
    //ws.send('Mensagem recebidaa: ' + messageConverted);
    wss.clients.forEach((client) => {
      client.send(messageConverted)
      //if(client.readyState === WebSocket.OPEN) client.send(messageConverted);
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