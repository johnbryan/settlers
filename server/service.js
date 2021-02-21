const WebSocket = require('ws');

const wsPort = process.env.WSPORT || 5005;
const wsServer = new WebSocket.Server({port: wsPort});

// Set up a map of `/gameId` -> Set of sockets.
const gameClientMap = new Map();
const gameStates = new Map(); // gameId -> current state obj
/*
gameState
- board
  - tileResources [
      - coord {x,y}
      - resource
      - number
    ]
  - occupiedVertexes [[hash, playerIndex], [hash, index], ...]
  - occupiedEdges (same)
- players [
    - name
    - color
  ]



gameState
- whoseTurn
- board
  - tileResources [
      - coord {x,y}
      - resource
      - number
    ]
- buildings [
    - coord {x,y}
    - playerIndex
    - isCity
  ]
- roads [
    - coord {x,y}
    - playerIndex
  ]
- players [
    - name
    - resources
    - devCardsUsed
    - devCardsUnused
  ]
*/

wsServer.on('connection', (socketClient, request) => {
  console.log('connected');
  console.log('client Set length: ', wsServer.clients.size);

  // Ensure we keep this client in a set with other clients for the same game.
  const gameUrl = request.url;
  if (!gameClientMap.has(gameUrl)) {
    gameClientMap.set(gameUrl, new Set());
  }

  gameClientMap.get(gameUrl).add(socketClient);

  const obj = {
    numPlayersConnected: gameClientMap.get(gameUrl).size,
  };

  // If another player has already sent a gamestate, use that, so we open
  // immediately with the same board.
  if (gameStates.has(gameUrl)) {
    obj.gameState = gameStates.get(gameUrl);
  }
  socketClient.send(JSON.stringify(obj));

  // Message handler
  socketClient.on('message', (message) => {
    console.log(message);
    try {
      const obj = JSON.parse(message);
      const {gameId, gameState} = obj;
      const gameUrl = '/' + gameId;

      // Clients don't send a state until they've received the server state.
      // If they learn from the server they are the first player, then they
      // create the initial state and send to the server.
      gameStates.set(gameUrl, gameState);

      const payload = JSON.stringify(obj);

      // broadcast message to all other clients on the same game
      for (const client of gameClientMap.get(gameUrl)) {
        if (client.readyState === WebSocket.OPEN && client != socketClient) {
          client.send(payload);
        }
      }
    } catch (e) {
      // We may want to close the socket as well.
      console.error(e);
    }
  });

  socketClient.on('close', () => {
    gameClientMap.get(gameUrl).delete(socketClient);
    if (gameClientMap.size == 0) {
      gameClientMap.delete(gameUrl);
    }
    console.log('closed');
    console.log('Number of clients: ', wsServer.clients.size);
  });
});
