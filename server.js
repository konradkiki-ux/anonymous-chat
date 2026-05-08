const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 10000;

const ACCESS_CODE = "0509";

let clients = [];
let messages = [];

function sendToAll(data) {
  const json = JSON.stringify(data);

  clients.forEach(client => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(json);
    }
  });
}

function updateOnline() {
  sendToAll({
    type: "online",
    count: clients.length
  });
}

wss.on("connection", (ws) => {

  let currentUser = null;

  ws.on("message", (message) => {

    const data = JSON.parse(message);

    // LOGIN
    if (data.type === "login") {

      if (data.code !== ACCESS_CODE) {
        ws.send(JSON.stringify({
          type: "login_error"
        }));
        return;
      }

      currentUser = {
        nick: data.nick,
        ws: ws
      };

      clients.push(currentUser);

      ws.send(JSON.stringify({
        type: "login_success"
      }));

      // WYŚLIJ STARE WIADOMOŚCI
      messages.forEach(msg => {
        ws.send(JSON.stringify({
          type: "message",
          nick: msg.nick,
          text: msg.text,
          time: msg.time
        }));
      });

      sendToAll({
        type: "system",
        text: data.nick + " dołączył do czatu"
      });

      updateOnline();
    }

    // NOWA WIADOMOŚĆ
    if (data.type === "message" && currentUser) {

      const msg = {
        nick: currentUser.nick,
        text: data.text,
        time: new Date().toLocaleString("pl-PL")
      };

      messages.push(msg);

      sendToAll({
        type: "message",
        nick: msg.nick,
        text: msg.text,
        time: msg.time
      });
    }

    // CLEAR CHAT
    if (data.type === "clear") {
      messages = [];

      sendToAll({
        type: "clear"
      });
    }
  });

  ws.on("close", () => {

    clients = clients.filter(c => c.ws !== ws);

    updateOnline();
  });
});

server.listen(PORT, () => {
  console.log("Chat działa na porcie " + PORT);
});
