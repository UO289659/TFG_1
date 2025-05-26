import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Hero from "./components/Hero"; // Importamos el Hero
import Login from "./components/Login"; // Importamos el Hero
import Register from "./components/Register"; // Importamos el Hero
import Chart from "./components/Chart";
import Track from "./components/Track";
import Navbar from "./components/Navbar";
import Profile from "./components/Profile"

function AppWrapper() {
  const location = useLocation();

  // Rutas donde NO queremos mostrar la Navbar
  const noNavbarRoutes = ["/", "/login", "/register"];

  const showNavbar = !noNavbarRoutes.includes(location.pathname);

  return (
    <>
      {showNavbar && <Navbar />}
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/statistics" element={<Chart />} />
          <Route path="/track" element={<Track />} />
           <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppWrapper />
    </Router>
  );
}

export default App;
