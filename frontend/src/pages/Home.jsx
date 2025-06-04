import React, { useState } from "react";
import Login from "../components/Login";
import Register from "../components/Register";
import { colors } from "../colors";

export default function Home() {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden max-w-md mx-auto">
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
