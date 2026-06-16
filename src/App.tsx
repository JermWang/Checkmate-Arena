import { Routes, Route } from "react-router";
import { WalletProvider } from "./components/wallet/WalletProvider";
import { ArenaStatsProvider } from "./providers/arenaStats";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Play from "./pages/Play";
import Leaderboard from "./pages/Leaderboard";
import Rewards from "./pages/Rewards";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Lobby from "./pages/Lobby";
import LobbyPrivate from "./pages/LobbyPrivate";
import LobbyPrivateCreated from "./pages/LobbyPrivateCreated";
import LobbyPrivateJoin from "./pages/LobbyPrivateJoin";

export default function App() {
  return (
    <WalletProvider>
      <ArenaStatsProvider>
        <Navbar />
        <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<Play />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/lobby/private" element={<LobbyPrivate />} />
        <Route path="/lobby/private/created" element={<LobbyPrivateCreated />} />
        <Route path="/lobby/private/join" element={<LobbyPrivateJoin />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/profile/:wallet" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
        </Routes>
      </ArenaStatsProvider>
    </WalletProvider>
  );
}
