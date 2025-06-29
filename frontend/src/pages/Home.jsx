import React, { useState } from "react";
import Login from "../components/Login";
import Register from "../components/Register";
import { colors } from "../colors";

/**
 * The Home component renders a page with a tabbed interface for signing in or
 * registering a user. It provides a simple interface for users to switch between
 * signing in and registering by clicking the corresponding tab. The component
 * itself does not contain any authentication logic; it simply renders the
 * appropriate form (Login or Register) based on the state of the
 * `showRegister` state variable.
 *
 * @returns {JSX.Element} The rendered Home component.
 */
export default function Home() {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded shadow-md border border-slate-200 overflow-hidden max-w-md mx-auto">
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
        <div className="p-6">
          {showRegister ? <Register /> : <Login />}
        </div>
      </div>
    </main>
  );
}
