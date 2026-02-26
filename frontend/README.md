# DeTickets — Frontend Setup Guide

## Folder Structure
```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── index.js                  ← entry point
│   ├── App.js                    ← routes
│   ├── abi/
│   │   └── EventTicketPlatform.json  ← copy from hardhat artifacts
│   ├── context/
│   │   └── WalletContext.js      ← MetaMask + contract state
│   ├── components/
│   │   └── Navbar.js
│   └── pages/
│       ├── EventList.js          ← /
│       ├── BuyTicket.js          ← /events/:eventId
│       ├── MyTickets.js          ← /my-tickets
│       ├── AdminPanel.js         ← /admin  (owner only)
│       └── QRScanner.js          ← /scanner (owner only)
└── package.json
```

---

## Step 1 — Copy the ABI

```powershell
# From project root (D:\projects\ticket)
cp artifacts\contracts\Deticket.sol\EventTicketPlatform.json frontend\src\abi\EventTicketPlatform.json
```

---

## Step 2 — Update Contract Address

Open `src/context/WalletContext.js` and confirm:
```js
const CONTRACT_ADDRESS = "0x69a25A22F86b375ae79D756B37b721EfEf4FC574";
```

---

## Step 3 — Make sure backend is running

```powershell
# In D:\projects\ticket\backend
npm run dev
# Should show: Server running on http://localhost:3001
```

---

## Step 4 — Install & Start Frontend

```powershell
cd D:\projects\ticket\frontend
npm install
npm start
```

Opens at: http://localhost:3000

---

## Pages

| URL | Page | Access |
|-----|------|--------|
| `/` | Browse all events | Everyone |
| `/events/:id` | Buy a ticket | MetaMask required |
| `/my-tickets` | View owned tickets | MetaMask required |
| `/admin` | Create events, withdraw | Owner wallet only |
| `/scanner` | QR entry validation | Owner wallet only |

---

## MetaMask Setup for Sepolia

```
1. Open MetaMask
2. Click network dropdown → "Add Network"
3. Search "Sepolia" → Add it
4. Get test ETH from: https://sepoliafaucet.com
```
