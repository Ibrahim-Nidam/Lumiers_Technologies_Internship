// src/components/Header.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { colors } from "../colors";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Instead of storing isLoggedIn in state, compute it on every render:
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  const isLoggedIn = Boolean(token);

  const handleLogout = () => {
    // Clear both storages
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    // Redirect to home/login
    navigate("/");
  };

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <img
                  src="/Logo.png"
                  alt="Logo"
                  className="h-10 w-auto transition-transform duration-200 group-hover:scale-105"
                />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/about"
              className="text-slate-700 hover:text-slate-900 font-medium text-sm transition-colors duration-200 relative group"
            >
              À propos
              <span
                className="absolute bottom-0 left-0 w-0 h-0.5 transition-all duration-200 group-hover:w-full"
                style={{ backgroundColor: colors.primary }}
              ></span>
            </Link>
            <Link
              to="/features"
              className="text-slate-700 hover:text-slate-900 font-medium text-sm transition-colors duration-200 relative group"
            >
              Fonctionnalités
              <span
                className="absolute bottom-0 left-0 w-0 h-0.5 transition-all duration-200 group-hover:w-full"
                style={{ backgroundColor: colors.primary }}
              ></span>
            </Link>
            <Link
              to="/contact"
              className="text-slate-700 hover:text-slate-900 font-medium text-sm transition-colors duration-200 relative group"
            >
              Contact
              <span
                className="absolute bottom-0 left-0 w-0 h-0.5 transition-all duration-200 group-hover:w-full"
                style={{ backgroundColor: colors.primary }}
              ></span>
            </Link>

            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="ml-4 px-6 py-2.5 rounded-lg text-white font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  backgroundColor: colors.primary,
                  "--tw-ring-color": `${colors.primary}40`,
                }}
              >
                Déconnexion
              </button>
            ) : (
              <Link
                to="/get-started"
                className="ml-4 px-6 py-2.5 rounded-lg text-white font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  backgroundColor: colors.primary,
                  "--tw-ring-color": `${colors.primary}40`,
                }}
              >
                Commencer
              </Link>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset transition-colors duration-200"
            style={{ "--tw-ring-color": `${colors.primary}40` }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg
              className="w-6 h-6 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <div className="px-4 pt-2 pb-4 space-y-1 bg-white border-t border-slate-200 shadow-lg">
          <Link
            to="/about"
            className="block px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium text-sm transition-colors duration-200"
            onClick={() => setMobileMenuOpen(false)}
          >
            À propos
          </Link>
          <Link
            to="/features"
            className="block px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium text-sm transition-colors duration-200"
            onClick={() => setMobileMenuOpen(false)}
          >
            Fonctionnalités
          </Link>
          <Link
            to="/contact"
            className="block px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium text-sm transition-colors duration-200"
            onClick={() => setMobileMenuOpen(false)}
          >
            Contact
          </Link>

          <div className="pt-2">
            {isLoggedIn ? (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="block w-full px-4 py-3 rounded-md text-white font-semibold text-sm text-center transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  backgroundColor: colors.primary,
                  "--tw-ring-color": `${colors.primary}40`,
                }}
              >
                Déconnexion
              </button>
            ) : (
              <Link
                to="/get-started"
                className="block w-full px-4 py-3 rounded-md text-white font-semibold text-sm text-center transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  backgroundColor: colors.primary,
                  "--tw-ring-color": `${colors.primary}40`,
                }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Commencer
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;