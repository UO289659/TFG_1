import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Hero from "./components/Hero"; // Importamos el Hero
import Login from "./components/Login"; // Importamos el Hero
import Register from "./components/Register"; // Importamos el Hero
import Chart from "./components/Chart";
import Track from "./components/Track";
import Navbar from "./components/Navbar";
import Profile from "./components/Profile"
import SelectPlan from "./components/SelectPlan";
import Subscribe from "./components/Subscribe";
import Unsubscribe from "./components/Unsubscibe";
import  Contact from "./components/Contact";
import ConfigurarCategorias from "./components/ConfigurarCategorias";
import HelpPage from "./components/Help";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import ExportTransactions from "./components/ExportTransactions";
import { UserProvider } from './context/UserContext';

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
           <Route path="/select-plan" element={<SelectPlan />} />
            <Route path="/subscribe" element={<Subscribe />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/categories" element={<ConfigurarCategorias />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/export-transactions" element={<ExportTransactions />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
 return (
    <UserProvider>
      <Router>
        <AppWrapper />
      </Router>
    </UserProvider>
  );
}

export default App;
