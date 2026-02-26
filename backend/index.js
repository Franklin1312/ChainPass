// index.js — DeTickets Backend Entry Point
require("dotenv").config({ path: ".env.backend" });

const express            = require("express");
const cors               = require("cors");
const connectDB          = require("./db/connect");
const { startListener }  = require("./services/listener");

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/events",   require("./routes/events"));
app.use("/api/tickets",  require("./routes/tickets"));
app.use("/api/validate", require("./routes/validate"));  // ← QR validation

// ── Health check ────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "DeTickets backend running ✅" }));

// ── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

(async () => {
  await connectDB();     // 1. Connect MongoDB
  startListener();       // 2. Start blockchain event listener
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
})();
