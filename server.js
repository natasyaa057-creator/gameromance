const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = Number(process.env.PORT) || 3000;
const CHAT_MAX_LEN = 8000;
const HANG_MAX_LEN = 8000;
const OPEN_COOLDOWN_MS = 0;

const players = new Map();
const treeState = {
  hangingMessages: [],
  totalHungMessages: 0,
};
const openCooldownByRole = {
  arka: 0,
  zahra: 0,
};

app.use(express.static(path.join(__dirname), { fallthrough: true }));

/* SPA: semua GET tanpa file fisik → index.html (hindari layar "Not Found" setelah navigasi / bookmark salah) */
app.get(/.*/, (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    next();
    return;
  }
  const ext = path.extname(req.path);
  if (ext && ext !== ".html") {
    res.status(404).type("text/plain").send("Not Found");
    return;
  }
  res.sendFile(path.join(__dirname, "index.html"), (err) => {
    if (err) {
      next(err);
    }
  });
});

function spawnBelowTree(role) {
  const y = 432;
  if (role === "zahra") {
    return { x: 512, y };
  }
  return { x: 388, y };
}

function serializePlayers() {
  return Array.from(players.values()).map((player) => ({
    id: player.id,
    name: player.name,
    x: player.x,
    y: player.y,
    message: player.message,
  }));
}

function serializeTree() {
  return {
    totalHungMessages: treeState.totalHungMessages,
    hangingMessages: treeState.hangingMessages.map((message) => ({
      id: message.id,
      from: message.from,
      createdAt: message.createdAt,
    })),
    openCooldownByRole,
  };
}

function sendSnapshotTo(socket, playerId) {
  try {
    socket.send(JSON.stringify({
      type: "init",
      playerId,
      players: serializePlayers(),
      tree: serializeTree(),
    }));
  } catch (err) {
    /* socket baru saja tertutup */
  }
}

function broadcastState() {
  broadcast({
    type: "state",
    players: serializePlayers(),
    tree: serializeTree(),
  });
}

function broadcast(payload) {
  const text = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      try {
        client.send(text);
      } catch (err) {
        /* klien putus saat kirim — abaikan */
      }
    }
  });
}

const PENDING_ROLE = "_connecting";

wss.on("connection", (socket) => {
  const playerId = `p_${Math.random().toString(36).slice(2, 10)}`;
  const spawn = spawnBelowTree("arka");
  const player = {
    id: playerId,
    name: PENDING_ROLE,
    x: spawn.x,
    y: spawn.y,
    message: "",
  };
  players.set(playerId, player);

  sendSnapshotTo(socket, playerId);
  broadcastState();

  socket.on("message", (rawData) => {
    let data;
    try {
      data = JSON.parse(String(rawData));
    } catch (error) {
      return;
    }

    const current = players.get(playerId);
    if (!current) {
      return;
    }

    if (data.type === "join") {
      const rawName = typeof data.name === "string" ? data.name.trim().toLowerCase() : "";
      if (rawName !== "zahra" && rawName !== "arka") {
        return;
      }
      const want = rawName === "zahra" ? "zahra" : "arka";
      const roleTaken = Array.from(players.values()).some(
        (other) =>
          other.id !== playerId
          && (other.name === "arka" || other.name === "zahra")
          && other.name === want,
      );
      if (roleTaken) {
        try {
          socket.send(JSON.stringify({
            type: "join_denied",
            reason: "role_taken",
            role: want,
          }));
        } catch (err) {
          /* ignore */
        }
        return;
      }
      current.name = want;
      const pos = spawnBelowTree(current.name);
      current.x = pos.x;
      current.y = pos.y;
      broadcastState();
      return;
    }

    if (data.type === "move") {
      if (current.name !== "arka" && current.name !== "zahra") {
        return;
      }
      const x = Number(data.x);
      const y = Number(data.y);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        current.x = Math.max(28, Math.min(872, x));
        current.y = Math.max(36, Math.min(504, y));
        broadcastState();
      }
      return;
    }

    if (data.type === "chat") {
      if (current.name !== "arka" && current.name !== "zahra") {
        return;
      }
      const nextMessage = String(data.message || "").replace(/[<>]/g, "").slice(0, CHAT_MAX_LEN);
      current.message = nextMessage;
      broadcastState();
      return;
    }

    if (data.type === "hang_message") {
      if (current.name !== "arka" && current.name !== "zahra") {
        return;
      }
      const content = String(data.message || "").replace(/[<>]/g, "").slice(0, HANG_MAX_LEN).trim();
      if (!content) {
        return;
      }
      treeState.hangingMessages.push({
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        from: current.name,
        content,
        createdAt: Date.now(),
      });
      treeState.totalHungMessages += 1;
      broadcastState();
      try {
        socket.send(JSON.stringify({ type: "hang_success" }));
      } catch (err) {
        /* ignore */
      }
      return;
    }

    if (data.type === "open_tree_message") {
      if (current.name !== "arka" && current.name !== "zahra") {
        return;
      }
      const openerRole = current.name === "zahra" ? "zahra" : "arka";
      const targetRole = openerRole === "arka" ? "zahra" : "arka";
      const now = Date.now();
      const lastOpen = Number(openCooldownByRole[openerRole]) || 0;
      const remaining = OPEN_COOLDOWN_MS > 0 ? OPEN_COOLDOWN_MS - (now - lastOpen) : 0;

      if (OPEN_COOLDOWN_MS > 0 && remaining > 0) {
        try {
          socket.send(JSON.stringify({
            type: "open_result",
            ok: false,
            reason: "cooldown",
            remainingMs: remaining,
          }));
        } catch (err) {
          /* ignore */
        }
        return;
      }

      const targetMessageIndex = treeState.hangingMessages.findIndex((message) => message.from === targetRole);
      if (targetMessageIndex === -1) {
        try {
          socket.send(JSON.stringify({
            type: "open_result",
            ok: false,
            reason: "empty",
          }));
        } catch (err) {
          /* ignore */
        }
        return;
      }

      const [openedMessage] = treeState.hangingMessages.splice(targetMessageIndex, 1);
      openCooldownByRole[openerRole] = now;
      broadcastState();
      try {
        socket.send(JSON.stringify({
          type: "open_result",
          ok: true,
          from: openedMessage.from,
          message: openedMessage.content,
          openedAt: now,
        }));
      } catch (err) {
        /* ignore */
      }
    }
  });

  socket.on("close", () => {
    players.delete(playerId);
    broadcastState();
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Game server listening on port ${PORT} (bind 0.0.0.0 — siap Render / hosting online)`);
});
