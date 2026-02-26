// models/Ticket.js
const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema(
  {
    tokenId:       { type: Number, unique: true, required: true }, // on-chain tokenId
    eventId:       { type: Number, required: true, ref: "Event" },
    seatNumber:    { type: String },
    originalPrice: { type: String },   // ETH string e.g. "0.05"
    originalBuyer: { type: String },   // wallet address
    isUsed:        { type: Boolean, default: false },
    qrHash:        { type: String },   // bytes32 from chain
    transferCount: { type: Number, default: 0 },
    metadataURI:   { type: String },

    // Resale listing (embedded — no separate collection needed)
    listing: {
      isActive: { type: Boolean, default: false },
      seller:   { type: String },
      price:    { type: String },      // ETH string
      listedAt: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", TicketSchema);
