import { Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage.jsx";
import AuthPage from "./AuthPage.jsx";
import Feed from "./Feed.jsx";
import Profile from "./Profile.jsx";
import OtherProfile from "./OtherProfile.jsx";

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/user/:handle" element={<OtherProfile />} />
      </Routes>
    </div>
  );
}

export default App
