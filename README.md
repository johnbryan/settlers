To run locally:
1) Then `npm start` from the `/server` directory to run the server (keeps clients for a given game in sync)
2) Run the client side code. You could do this a number of ways but here's one: `browser-sync start --server --files "./src"`. This gets you live reloads on file save:
https://flaviocopes.com/how-to-reload-browser-file-save/. But any web server will work well enough. `python -m http.server 8000` is another basic localhost web server. You need a web server, as opposed to just opening the html file on your local filesystem, because apparently `<script type="module"...` only works when run from a server due some
weird CORS stuff.

Credits!
- Adam Elnagger who pointed me to his prior websockets project when I mentioned my game: https://github.com/aelnagger/planning-poker
- https://jigsawpuzzles.io/ that I played a bit and got websockets inspiration from
- And most of all, Klaus! https://www.catan.com/