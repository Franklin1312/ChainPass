// src/App.js
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { WalletProvider } from "./context/WalletContext";
import Sidebar    from "./components/Sidebar";
import EventList  from "./pages/EventList";
import BuyTicket  from "./pages/BuyTicket";
import MyTickets  from "./pages/MyTickets";
import AdminPanel from "./pages/AdminPanel";
import QRScanner  from "./pages/QRScanner";
import "./index.css";

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div style={{ display: "flex", minHeight: "100vh", background: "#1f1c13" }}>
          <Sidebar />
          <div style={{ flex: 1, overflowY: "auto" }}>
            <Routes>
              <Route path="/"               element={<EventList  />} />
              <Route path="/events/:eventId" element={<BuyTicket  />} />
              <Route path="/my-tickets"     element={<MyTickets  />} />
              <Route path="/admin"          element={<AdminPanel />} />
              <Route path="/scanner"        element={<QRScanner  />} />
            </Routes>
          </div>
        </div>

        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#252118",
              color: "#f1ead6",
              border: "1px solid rgba(226,201,126,0.15)",
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "0.88rem",
            },
            success: { iconTheme: { primary: "#e2c97e", secondary: "#1f1c13" } },
          }}
        />
      </BrowserRouter>
    </WalletProvider>
  );
}
