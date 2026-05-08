const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const ACCESS_CODE = "0509";

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

wss.on("connection", (ws) => {
  ws.authorized = false;
  ws.nick = "Anon";

  ws.on("message", (data) => {
    let msg;

    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    if (msg.type === "login") {
      if (msg.code === ACCESS_CODE) {
        ws.authorized = true;
        ws.nick = String(msg.nick || "Anon").slice(0, 20);
        ws.send(JSON.stringify({ type: "login_success" }));
      } else {
        ws.send(JSON.stringify({ type: "login_error" }));
      }
      return;
    }

    if (!ws.authorized) return;

    if (msg.type === "message") {
      const outgoing = JSON.stringify({
        type: "message",
        nick: ws.nick,
        text: String(msg.text || "").slice(0, 500),
        time: new Date().toLocaleString("pl-PL")
      });

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.authorized) {
          client.send(outgoing);
        }
      });
    }

    if (msg.type === "clear") {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.authorized) {
          client.send(JSON.stringify({ type: "clear" }));
        }
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Chat działa na porcie " + PORT);
});
