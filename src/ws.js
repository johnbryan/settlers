const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('game');
const webSocket = new WebSocket(`ws://${window.location.hostname}:5005/${gameId}`);

webSocket.onmessage = (event) => {
  console.log("Got a websocket event!");
  console.log(event);

  // do something
};

webSocket.onopen = (event) => {
  console.log("Websocket has been opened!");
  console.log(event);

  // Initial stuff
  const message = {
    gameId,
  };
  const payload = JSON.stringify(message);
  webSocket.send(payload);
};
webSocket.onclose = (event) => {
  console.log("WebSocket was closed :(");
  console.log(event);
};
webSocket.onerror = (event) => {
  console.error('Websocket error occurred!!!1');
  console.error(event);
};

export function sendMessage(obj) {
  obj.gameId = gameId;
  const payload = JSON.stringify(objj);
  webSocket.send(payload);
}
