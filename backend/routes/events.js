// routes/events.js
const express = require("express");
const router  = express.Router();
const Event   = require("../models/Event");
const Ticket  = require("../models/Ticket");

// GET /api/events — all events
router.get("/", async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/active — only active events
router.get("/active", async (req, res) => {
  try {
    const events = await Event.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:eventId — single event + its tickets
router.get("/:eventId", async (req, res) => {
  try {
    const event = await Event.findOne({ eventId: Number(req.params.eventId) });
    if (!event) return res.status(404).json({ error: "Event not found" });

    const tickets = await Ticket.find({ eventId: Number(req.params.eventId) });
    res.json({ ...event.toObject(), tickets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
