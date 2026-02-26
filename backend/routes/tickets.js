// routes/tickets.js
const express = require("express");
const router  = express.Router();
const Ticket  = require("../models/Ticket");

// GET /api/tickets/:tokenId — single ticket
router.get("/:tokenId", async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ tokenId: Number(req.params.tokenId) });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/owner/:address — all tickets owned by a wallet
router.get("/owner/:address", async (req, res) => {
  try {
    const tickets = await Ticket.find({
      originalBuyer: { $regex: new RegExp(`^${req.params.address}$`, "i") }
    });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/listings/active — all active resale listings
router.get("/listings/active", async (req, res) => {
  try {
    const listings = await Ticket.find({ "listing.isActive": true });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
