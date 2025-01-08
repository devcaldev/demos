const DevCal = require("devcal");
var client;

const uWS = require("uWebSockets.js");
const port = 9001;

const path = require("path");
const { serveDir } = require("@charlypoirier/uwebsocket-serve");

const publicPath = path.resolve(__dirname, "public");
const serveStatic = serveDir(publicPath);

const app = uWS
  .App({})
  .ws("/ws", {
    message: (ws, message, isBinary) => {
      if (!client) {
        ws.send(JSON.stringify({ error: new Error("client not set") }));
        return;
      }

      const msg = JSON.parse(Buffer.from(message), dateTimeReviver);
      if (typeof client[msg.method] == "function") {
        if (msg.method == "listEvents") {
          client[msg.method](msg.params, (result) => {
            ws.send(JSON.stringify({ id: msg.id, result }));
          }).catch((error) => {
            ws.send(JSON.stringify({ id: msg.id, error }));
          });
        } else {
          client[msg.method](msg.params)
            .then((result) => {
              ws.send(JSON.stringify({ id: msg.id, result }));
            })
            .catch((error) => {
              ws.send(JSON.stringify({ id: msg.id, error }));
            });
        }
      }
    },
  })
  .post("/login", (res, req) => {
    var apiKey = req.getHeader("x-api-key");
    if (client) {
      client._client.close();
    }
    client = new DevCal("devcal.fly.dev:50051", apiKey);
    res.end();
  })
  .get("/*", serveStatic)
  .listen(port, (token) => {
    if (token) {
      console.log("Listening to port " + port);
    } else {
      console.log("Failed to listen to port " + port);
    }
  });

function dateTimeReviver(key, value) {
  if (key.toString().match(/dtstart|dtend|date/)) {
    return new Date(value);
  }
  return value;
}
