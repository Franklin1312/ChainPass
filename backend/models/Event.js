// models/Event.js
const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
  {
    eventId:        { type: Number, unique: true, required: true }, // on-chain ID
    name:           { type: String, required: true },
    date:           { type: String },
    venue:          { type: String },
    ticketPrice:    { type: String },  // stored as ETH string e.g. "0.05"
    totalSupply:    { type: Number },
    ticketsMinted:  { type: Number, default: 0 },
    maxResalePercent: { type: Number },
    isActive:       { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", EventSchema);
