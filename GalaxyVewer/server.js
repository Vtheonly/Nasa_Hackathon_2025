const http = require("http");
const app = require("./app");
const SignalingServer = require("./signaling-server");

const server = http.createServer(app);

// Attach the WebSocket Signaling Server to the HTTP server
new SignalingServer(server);

const port = process.env.PORT || 8081;
server.listen(port, () => {
  console.log(
    `Server is running. Open your browser to http://localhost:${port}`
  );
});
