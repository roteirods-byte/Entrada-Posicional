"use client";
import React from "react";
import EntryPanel from "./components/EntryPanel";

export default function App() {
  return (
    <div className="min-h-screen bg-[#0b1e33] text-white">
      <div className="max-w-[1400px] mx-auto px-6 pt-6">
        <div className="text-3xl font-extrabold text-orange-400">AUTOTRADER</div>
        <div className="mt-3 h-px bg-white/10" />
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <EntryPanel />
      </div>
    </div>
  );
}
