const express = require('express');
const WebSocket = require('ws');

const app = express();
const port = process.env.PORT || 8080;
const wsPort = process.env.WSPORT || 5005;

const wsServer = new WebSocket.Server({port: wsPort});

// app.get('/', async (req, resp) => {
//   console.log('got a request!');
//   resp.send('hello!');
// });

app.listen(port, () => {
  console.log(`Running! Listening at http://localhost:${port}`);
});

// Setup a map of gameId to sockets.
const gameClientMap = new Map();

wsServer.on('connection', (socketClient, request) => {
  console.log('connected');
  console.log('client Set length: ', wsServer.clients.size);

  // Ensure we keep this client in a set with other clients for the same game.
  const gameUrl = request.url;
  if (!gameClientMap.has(gameUrl)) {
    gameClientMap.set(gameUrl, new Set());
  }

  gameClientMap.get(gameUrl).add(socketClient);

  // Message handler
  socketClient.on('message', (message) => {
    console.log(message);
    try {
      const obj = JSON.parse(message);
      // const {gameId} = obj;

      const payload = JSON.stringify(obj);
      for (const client of wsServer.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      }
    } catch (e) {
      // We may want to close the socket as well.
      console.error(e);
    }
  });

  socketClient.on('close', (socketClient) => {
    gameClientMap.get(gameUrl).delete(socketClient);
    if (gameClientMap.size == 0) {
      gameClientMap.delete(gameUrl);
    }
    console.log('closed');
    console.log('Number of clients: ', wsServer.clients.size);
  });
});
