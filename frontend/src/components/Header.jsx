import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { colors } from "../colors";

/**
 * The Header component renders a sticky header with the logo, navigation links, and a login/logout button.
 * The component is responsive and displays a mobile menu on smaller screens.
 * The component also checks if the user is logged in and displays the dashboard path accordingly.
 * The component also handles logout by removing the token and user data from localStorage and sessionStorage.
 * The component also handles the mobile menu state and toggles it on click.
 *
 * @returns {JSX.Element} The rendered Header component.
 * @example
 * <Header />
 */
const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  const isLoggedIn = Boolean(token);

  /**
   * Retrieves the user data from either local or session storage.
   * If the data is a string, it is parsed as JSON, otherwise it is returned as null.
   * If an error occurs while parsing, it is logged to the console and the function returns null.
   * @returns {object | null} The user data if found and valid, otherwise null.
   */
  const getUserData = () => {
    try {
      const userData =
        localStorage.getItem("user") || sessionStorage.getItem("user");
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  };

  /**
   * Logs the user out by removing the token and user data from localStorage and
   * sessionStorage. Redirects to the root path.
   */
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/");
  };

/**
 * Determines the dashboard path based on the user's role.
 * 
 * @param {object} user - The user object containing role information.
 * @returns {string} The path to the appropriate dashboard based on the user's role.
 *                    Returns "/profile-settings" if user or user role is not provided.
 */

  const getDashboardPath = (user) => {
    if (!user || !user.role) return "/profile-settings";
    switch (user.role) {
      case "admin":
      case "superadmin":
        return "/adminDashboard";
      case "manager":
      case "supermanager":
        return "/managerDashboard";
      default:
        return "/agentDashboard";
    }
  };

  const userData = getUserData();
  const dashboardPath = userData ? getDashboardPath(userData) : "/profile-settings";

  const isActive = (path) => currentPath.startsWith(path);

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
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

          <nav className="hidden md:flex items-center space-x-8">
            {/* <Link
              to="/about"
              className={`text-slate-700 hover:text-slate-900 font-medium text-sm transition-colors duration-200 relative group ${
                isActive("/about") ? "border-b-2 border-primary" : ""
              }`}
            >
              À propos
            </Link>
            <Link
              to="/features"
              className={`text-slate-700 hover:text-slate-900 font-medium text-sm transition-colors duration-200 relative group ${
                isActive("/features") ? "border-b-2 border-primary" : ""
              }`}
            >
              Fonctionnalités
            </Link>
            <Link
              to="/contact"
              className={`text-slate-700 hover:text-slate-900 font-medium text-sm transition-colors duration-200 relative group ${
                isActive("/contact") ? "border-b-2 border-primary" : ""
              }`}
            >
              Contact
            </Link> */}
            {isLoggedIn && (
              <Link
                to={dashboardPath}
                className={`text-slate-700 hover:text-slate-900 font-medium text-sm transition-colors duration-200 relative group ${
                  isActive(dashboardPath) ? "border-b-2 border-primary" : ""
                }`}
              >
                Tableau de bord
              </Link>
            )}

            {(userData?.role === "manager" || userData?.role === "supermanager") && (
              <Link
                to="/agentDashboard"
                className={`ml-4 text-slate-700 hover:text-slate-900 font-medium text-sm transition-colors duration-200 relative group ${
                  isActive("/agentDashboard") ? "border-b-2 border-primary" : ""
                }`}
              >
                Tableau de déplacement
              </Link>
            )}

            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleLogout}
                  className="px-6 py-2.5 rounded text-white font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{
                    backgroundColor: colors.primary,
                    "--tw-ring-color": `${colors.primary}40`,
                  }}
                >
                  Déconnexion
                </button>
                <div
                  onClick={() => navigate("/profile-settings")}
                  className="flex flex-col items-center cursor-pointer hover:scale-105 hover:underline"
                >
                  <span className="text-xs text-slate-700 font-medium text-center">
                    {new Date().getHours() < 12
                      ? "Bonjour, "
                      : new Date().getHours() < 18
                      ? "Bon après-midi, "
                      : "Bonsoir, "}
                    <span className="text-primary font-bold">
                      {userData?.nom_complete || "Utilisateur"}
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              <Link
                to="/get-started"
                className="ml-4 px-6 py-2.5 rounded text-white font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  backgroundColor: colors.primary,
                  "--tw-ring-color": `${colors.primary}40`,
                }}
              >
                Commencer
              </Link>
            )}
          </nav>

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

      <div
        className={`md:hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <div className="px-4 pt-2 pb-4 space-y-1 bg-white border-t border-slate-200 shadow-lg">
          {/* User greeting section for mobile - only show when logged in */}
          {isLoggedIn && (
            <div
              onClick={() => {
                navigate("/profile-settings");
                setMobileMenuOpen(false);
              }}
              className="block px-4 underline py-3 text-center cursor-pointer hover:bg-slate-50 rounded-md transition-colors duration-200 border-b border-slate-100 mb-2"
            >
              <span className="text-sm text-slate-700 font-medium">
                {new Date().getHours() < 12
                  ? "Bonjour, "
                  : new Date().getHours() < 18
                  ? "Bon après-midi, "
                  : "Bonsoir, "}
                <span className="text-primary font-bold">
                  {userData?.nom_complete || "Utilisateur"}
                </span>
              </span>
            </div>
          )}

          <Link
            to="/about"
            className={`block px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium text-sm transition-colors duration-200 ${
              isActive("/about") ? "bg-slate-100 border-l-4 border-primary" : ""
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            À propos
          </Link>
          <Link
            to="/features"
            className={`block px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium text-sm transition-colors duration-200 ${
              isActive("/features") ? "bg-slate-100 border-l-4 border-primary" : ""
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Fonctionnalités
          </Link>
          <Link
            to="/contact"
            className={`block px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium text-sm transition-colors duration-200 ${
              isActive("/contact") ? "bg-slate-100 border-l-4 border-primary" : ""
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Contact
          </Link>

          {isLoggedIn && (
            <Link
              to={dashboardPath}
              className={`block px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md font-medium text-sm transition-colors duration-200 ${
                isActive(dashboardPath) ? "bg-slate-100 border-l-4 border-primary" : ""
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Tableau de bord
            </Link>
          )}

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