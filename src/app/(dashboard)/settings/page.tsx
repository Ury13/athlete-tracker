"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  Activity,
  Battery,
  BrainCircuit,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Moon,
  RefreshCw,
  Settings,
  User,
} from "lucide-react";

// ── Settings Page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session } = useSession();

  // ── Garmin state ────────────────────────────────────────────────────────────
  const [garminConnected, setGarminConnected] = useState(false);
  const [garminLastSync, setGarminLastSync] = useState<string | null>(null);
  const [garminStatusLoading, setGarminStatusLoading] = useState(true);
  const [garminSyncStatus, setGarminSyncStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [garminSyncMessage, setGarminSyncMessage] = useState("");
  const [garminDisconnecting, setGarminDisconnecting] = useState(false);
  const [showDevSetup, setShowDevSetup] = useState(false);

  // ── Strava state ────────────────────────────────────────────────────────────
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [syncMessage, setSyncMessage] = useState("");

  // ── Fetch Garmin status on mount ────────────────────────────────────────────

  useEffect(() => {
    async function fetchGarminStatus() {
      setGarminStatusLoading(true);
      try {
        const res = await fetch("/api/garmin/status");
        if (res.ok) {
          const data = await res.json();
          setGarminConnected(data.connected ?? false);
          setGarminLastSync(data.lastSync ?? null);
        }
      } catch {
        // ignore — defaults to not connected
      } finally {
        setGarminStatusLoading(false);
      }
    }
    fetchGarminStatus();
  }, []);

  // ── Garmin Sync ─────────────────────────────────────────────────────────────

  async function garminSync() {
    setGarminSyncStatus("loading");
    setGarminSyncMessage("");
    try {
      const res = await fetch("/api/garmin/sync");
      const data = await res.json();
      if (res.ok) {
        setGarminSyncStatus("ok");
        setGarminSyncMessage(data.message ?? "Sync complete");
        setGarminLastSync(new Date().toISOString());
      } else {
        setGarminSyncStatus("error");
        setGarminSyncMessage(data.error ?? "Sync failed");
      }
    } catch {
      setGarminSyncStatus("error");
      setGarminSyncMessage("Network error");
    }
  }

  // ── Garmin Disconnect ───────────────────────────────────────────────────────

  async function garminDisconnect() {
    setGarminDisconnecting(true);
    try {
      const res = await fetch("/api/garmin/disconnect", { method: "POST" });
      if (res.ok) {
        setGarminConnected(false);
        setGarminLastSync(null);
        setGarminSyncStatus("idle");
        setGarminSyncMessage("");
      }
    } catch {
      // ignore
    } finally {
      setGarminDisconnecting(false);
    }
  }

  // ── Strava Sync ─────────────────────────────────────────────────────────────

  async function stravaSync() {
    setSyncStatus("loading");
    setSyncMessage("");
    try {
      const res = await fetch("/api/strava/sync?pages=5");
      const data = await res.json();
      if (res.ok) {
        setSyncStatus("ok");
        setSyncMessage(data.message ?? "Sync complete");
      } else {
        setSyncStatus("error");
        setSyncMessage(data.error ?? "Sync failed");
      }
    } catch {
      setSyncStatus("error");
      setSyncMessage("Network error");
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-brand-500" />
        <div>
          <h1 className="text-slate-900">Settings &amp; Integrations</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage integrations and account preferences
          </p>
        </div>
      </div>

      {/* ── Garmin Connect ───────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-slate-800 font-semibold text-base">
                Garmin Connect
              </h2>
              {garminStatusLoading ? (
                <div className="h-4 w-24 rounded bg-slate-100 animate-pulse mt-1" />
              ) : garminConnected ? (
                <p className="text-green-600 text-sm flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Connected
                </p>
              ) : (
                <p className="text-slate-500 text-sm">Not connected</p>
              )}
            </div>
          </div>
        </div>

        {garminStatusLoading ? null : garminConnected ? (
          /* ── Connected state ── */
          <div className="space-y-4">
            {garminLastSync && (
              <p className="text-sm text-slate-500">
                Last sync:{" "}
                {new Date(garminLastSync).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={garminSync}
                disabled={garminSyncStatus === "loading"}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${garminSyncStatus === "loading" ? "animate-spin" : ""}`}
                />
                {garminSyncStatus === "loading" ? "Syncing..." : "Sync Now"}
              </button>
              <button
                onClick={garminDisconnect}
                disabled={garminDisconnecting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {garminDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
            {garminSyncStatus === "ok" && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {garminSyncMessage}
              </p>
            )}
            {garminSyncStatus === "error" && (
              <p className="text-sm text-red-600">{garminSyncMessage}</p>
            )}
          </div>
        ) : (
          /* ── Not connected state ── */
          <div className="space-y-5">
            <p className="text-slate-600 text-sm">
              Sync your Fenix 8 data — Body Battery, sleep, stress, HRV,
              training readiness, and steps.
            </p>

            {/* What you'll get */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-3">
                What you&apos;ll get
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: <Battery className="w-5 h-5 text-blue-500" />, label: "Body Battery", bg: "bg-blue-50 border-blue-100" },
                  { icon: <Moon className="w-5 h-5 text-purple-500" />, label: "Sleep Quality", bg: "bg-purple-50 border-purple-100" },
                  { icon: <Dumbbell className="w-5 h-5 text-green-500" />, label: "Training Readiness", bg: "bg-green-50 border-green-100" },
                  { icon: <BrainCircuit className="w-5 h-5 text-orange-500" />, label: "Stress & HRV", bg: "bg-orange-50 border-orange-100" },
                ].map(({ icon, label, bg }) => (
                  <div
                    key={label}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-center ${bg}`}
                  >
                    {icon}
                    <span className="text-xs text-slate-600 leading-tight font-medium">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <a
              href="/api/garmin/connect"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Activity className="w-4 h-4" />
              Connect Garmin
            </a>

            <p className="text-xs text-slate-400">
              Requires Garmin Health API credentials. See setup instructions
              below.
            </p>

            {/* Collapsible Developer Setup */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowDevSetup((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>Developer Setup</span>
                {showDevSetup ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {showDevSetup && (
                <div className="px-4 pb-4 space-y-2 text-sm text-slate-600 border-t border-slate-100">
                  <ol className="space-y-2 mt-3">
                    <li>
                      <span className="font-medium">1.</span> Register at{" "}
                      <a
                        href="https://developer.garmin.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        developer.garmin.com
                      </a>
                    </li>
                    <li>
                      <span className="font-medium">2.</span> Apply for Health
                      API access
                    </li>
                    <li>
                      <span className="font-medium">3.</span> Once approved,
                      add to Vercel environment variables:
                      <div className="mt-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs text-slate-700 space-y-1">
                        <p>GARMIN_CLIENT_ID=your_consumer_key</p>
                        <p>GARMIN_CLIENT_SECRET=your_consumer_secret</p>
                      </div>
                    </li>
                    <li>
                      <span className="font-medium">4.</span> Redeploy and come
                      back here to connect
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Strava ───────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
            <Activity className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-slate-800 font-semibold text-base">Strava</h2>
            <p className="text-green-600 text-sm flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Connected
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={stravaSync}
            disabled={syncStatus === "loading"}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${syncStatus === "loading" ? "animate-spin" : ""}`}
            />
            {syncStatus === "loading" ? "Syncing..." : "Sync Now"}
          </button>
          {syncStatus === "ok" && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              {syncMessage}
            </span>
          )}
          {syncStatus === "error" && (
            <span className="text-sm text-red-600">{syncMessage}</span>
          )}
        </div>
      </section>

      {/* ── Account ──────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600" />
          </div>
          <h2 className="text-slate-800 font-semibold text-base">Account</h2>
        </div>

        <div className="space-y-1">
          <p className="text-slate-900 font-medium">
            {session?.user?.name ?? "—"}
          </p>
          <p className="text-slate-500 text-sm">
            {session?.user?.email ?? "—"}
          </p>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
