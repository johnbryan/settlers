const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('game');
// Prod is https, and apparently the ws security needs to match the http security.
const wsProtocol = window.location.protocol=='https:' ? 'wss' : 'ws';
export const webSocket = new WebSocket(`${wsProtocol}://${window.location.hostname}:5005/${gameId}`);

let bufferedMessages = [];
sendMessage({});

webSocket.onopen = (event) => {
  console.log("Websocket has been opened!");

  for (const msg of bufferedMessages) {
    webSocket.send(msg);
  }
  bufferedMessages = [];
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
  const json = JSON.stringify(obj);

  if (webSocket.readyState == WebSocket.OPEN) {
    webSocket.send(json);
  }
  else if (webSocket.readyState == WebSocket.CONNECTING) {
    bufferedMessages.push(json);
  }
  else {
    console.error(`Websocket not connected! webSocket.readyState=${webSocket.readyState}`);
  }
}
