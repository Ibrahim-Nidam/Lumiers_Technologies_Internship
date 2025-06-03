"use client";

import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Login from "./components/Login";
import Register from "./components/Register";
import About from "./pages/About";
import Features from "./pages/Features";
import Contact from "./pages/Contact";
import Dashboard from "./components/dash/Dashboard";
import PrivateRoute from "./components/PrivateRoute";
import ProfileSettings from "./components/dash/ProfileSettings";

import { colors } from "./colors";

// Home component that toggles between Login and Register
function Home() {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden max-w-md mx-auto">
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setShowRegister(false)}
            className={`flex-1 py-4 px-6 font-medium transition-colors cursor-pointer ${
              !showRegister
                ? `border-b-2 text-slate-900`
                : "text-slate-500 hover:text-slate-700"
            }`}
            style={{
              borderColor: !showRegister ? colors.primary : "transparent",
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => setShowRegister(true)}
            className={`flex-1 py-4 px-6 font-medium transition-colors cursor-pointer ${
              showRegister
                ? `border-b-2 text-slate-900`
                : "text-slate-500 hover:text-slate-700"
            }`}
            style={{
              borderColor: showRegister ? colors.primary : "transparent",
            }}
          >
            Register
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6">{showRegister ? <Register /> : <Login />}</div>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />

        <div className="flex-1">
          <Routes>
            {/* Public Home: toggles Login / Register */}
            <Route path="/" element={<Home />} />

            {/* Static pages */}
            <Route path="/about" element={<About />} />
            <Route path="/features" element={<Features />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/get-started" element={<Home />} />

            {/* Protected Dashboard */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile-settings"
              element={
                <PrivateRoute>
                  <ProfileSettings />
                </PrivateRoute>
              }
            />

            {/* Fallback: any unknown route → redirect to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <Footer />
      </div>
    </Router>
  );
}
