// backend/scripts/syncTickets.js
require("dotenv").config();

process.env.MONGO_URI        = process.env.MONGO_URI        || "mongodb://localhost:27017/detickets";
process.env.RPC_URL          = process.env.RPC_URL          || "https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY";
process.env.CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x69a25A22F86b375ae79D756B37b721EfEf4FC574";

const { ethers }   = require("ethers");
const mongoose     = require("mongoose");
const contractJson = require("../abi/EventTicketPlatform.json");
const Ticket       = require("../models/Ticket");
const Event        = require("../models/Event");

const abi = contractJson.abi;

async function sync() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const contract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS, abi, provider
  );

  console.log("🔍 Scanning on-chain tickets...");

  let tokenId = 1;
  while (true) {
    try {
      // Check if token exists by getting its owner
      const owner = await contract.ownerOf(tokenId);
      const td    = await contract.tickets(tokenId);

      await Ticket.findOneAndUpdate(
        { tokenId },
        {
          tokenId,
          eventId:       Number(td.eventId),
          seatNumber:    td.seatNumber,
          originalPrice: ethers.formatEther(td.originalPrice),
          originalBuyer: owner,
          isUsed:        td.isUsed,
          qrHash:        td.qrHash,
          transferCount: Number(td.transferCount),
        },
        { upsert: true, new: true }
      );

      // Update ticketsMinted on the event
      await Event.findOneAndUpdate(
        { eventId: Number(td.eventId) },
        { $set: { ticketsMinted: tokenId } }
      );

      console.log(`✅ Synced ticket #${tokenId} → owner: ${owner} | seat: ${td.seatNumber}`);
      tokenId++;
    } catch (err) {
      console.log(`ℹ️  No ticket found at id ${tokenId} — stopping.`);
      break;
    }
  }

  console.log("🎉 Ticket sync complete!");
  mongoose.disconnect();
}

sync().catch(console.error);