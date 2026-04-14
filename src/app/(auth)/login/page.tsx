"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Activity, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleStrava = async () => {
    setLoading(true);
    await signIn("strava", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-brand-950 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/30 mb-4">
            <Activity className="w-8 h-8 text-brand-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">AthletIQ</h1>
          <p className="text-slate-400 mt-1 text-sm">Your personal performance tracker</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-2">Welcome</h2>
          <p className="text-slate-400 text-sm mb-8">
            Sign in with your Strava account to access your training dashboard.
          </p>

          <button
            onClick={handleStrava}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: loading ? "#c05702" : "#FC4C02" }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting to Strava…
              </>
            ) : (
              <>
                {/* Strava logo mark */}
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
                Continue with Strava
              </>
            )}
          </button>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          AthletIQ &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
