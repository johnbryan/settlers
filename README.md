Run `browser-sync start --server --files "."` to get live reloads on file save:
https://flaviocopes.com/how-to-reload-browser-file-save/. Or any web server will
work well enough. `python -m http.server 8000` is another basic localhost web server.

If you just open the html file on your local filesystem it will fail because
apparently `<script type="module"...` only works when run from a server due to
CORS stuff.

Then `npm start` in the server directory to do the websockets
