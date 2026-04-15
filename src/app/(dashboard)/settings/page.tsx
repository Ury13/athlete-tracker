"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  Activity,
  CheckCircle,
  ClipboardCopy,
  Heart,
  KeyRound,
  RefreshCw,
  Settings,
  TriangleAlert,
  User,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskKey(key: string): string {
  return key.slice(0, 8) + "...";
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Settings Page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session } = useSession();

  // API Key state
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyLoading, setKeyLoading] = useState(true);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRegenWarning, setShowRegenWarning] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Test import state
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [testMessage, setTestMessage] = useState<string>("");

  // Strava sync state
  const [syncStatus, setSyncStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState<string>("");

  // ── Fetch API Key ───────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchKey() {
      setKeyLoading(true);
      setKeyError(null);
      try {
        const res = await fetch("/api/settings/apikey");
        if (!res.ok) throw new Error("Failed to fetch API key");
        const data = await res.json();
        setApiKey(data.apiKey ?? null);
      } catch (err) {
        setKeyError(err instanceof Error ? err.message : "Error loading key");
      } finally {
        setKeyLoading(false);
      }
    }
    fetchKey();
  }, []);

  // ── Generate / Regenerate API Key ───────────────────────────────────────────

  async function generateKey() {
    setGenerating(true);
    setKeyError(null);
    setShowRegenWarning(false);
    try {
      const res = await fetch("/api/settings/apikey", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate API key");
      const data = await res.json();
      setApiKey(data.apiKey);
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : "Error generating key");
    } finally {
      setGenerating(false);
    }
  }

  // ── Copy to Clipboard ───────────────────────────────────────────────────────

  async function copyKey() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Test Import ─────────────────────────────────────────────────────────────

  async function testImport() {
    if (!apiKey) return;
    setTestStatus("loading");
    setTestMessage("");
    try {
      const res = await fetch("/api/health/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          date: today(),
          weight: 70.5,
          restingHR: 58,
          sleepHours: 7.5,
          hrv: 42,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestStatus("ok");
        setTestMessage("Test import succeeded! Check your Metrics page.");
      } else {
        setTestStatus("error");
        setTestMessage(data.error ?? "Import failed");
      }
    } catch {
      setTestStatus("error");
      setTestMessage("Network error");
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

      {/* ── Apple Health ─────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
            <Heart className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-slate-800 font-semibold text-base">Apple Health</h2>
            <p className="text-slate-500 text-sm">
              Connect your iPhone&apos;s Health app using the iOS Shortcut below.
              Data syncs automatically every day.
            </p>
          </div>
        </div>

        {/* API Key display */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">API Key</p>

          {keyLoading ? (
            <div className="h-10 rounded-lg bg-slate-100 animate-pulse w-64" />
          ) : keyError ? (
            <p className="text-sm text-red-600">{keyError}</p>
          ) : apiKey ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="bg-slate-100 text-slate-800 text-sm rounded-lg px-3 py-2 font-mono">
                  {maskKey(apiKey)}
                </code>
                <button
                  onClick={copyKey}
                  className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardCopy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowRegenWarning(true)}
                  disabled={generating}
                  className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
                  Regenerate
                </button>
              </div>

              {showRegenWarning && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                  <TriangleAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">This will break your existing Shortcut until you update it.</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={generateKey}
                        disabled={generating}
                        className="px-3 py-1 rounded bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 disabled:opacity-50"
                      >
                        {generating ? "Regenerating..." : "Yes, regenerate"}
                      </button>
                      <button
                        onClick={() => setShowRegenWarning(false)}
                        className="px-3 py-1 rounded border border-amber-300 text-xs font-medium hover:bg-amber-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={generateKey}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              {generating ? "Generating..." : "Generate API Key"}
            </button>
          )}
        </div>

        {/* What gets synced */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-3">What gets synced</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: "⚖️", label: "Weight" },
              { icon: "❤️", label: "Resting Heart Rate" },
              { icon: "😴", label: "Sleep" },
              { icon: "📊", label: "HRV" },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100 text-center"
              >
                <span className="text-xl">{icon}</span>
                <span className="text-xs text-slate-600 leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Setup Instructions */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-3">Setup Instructions</p>
          <ol className="space-y-4 text-sm text-slate-700">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <span>Tap &quot;Generate API Key&quot; above and copy it.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <span>
                Open the <strong>Shortcuts</strong> app on your iPhone &rarr; tap{" "}
                <strong>+</strong> (new shortcut).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">
                3
              </span>
              <div className="space-y-2">
                <p>Add these actions in order:</p>
                <div className="rounded-lg bg-slate-50 border border-slate-200 divide-y divide-slate-200 text-xs font-mono">
                  {[
                    "Find Health Samples → Body Measurements → Weight → Last 1 → Latest First",
                    "Find Health Samples → Heart → Resting Heart Rate → Last 1",
                    "Find Health Samples → Sleep → Time in Bed → Last 1",
                    "Find Health Samples → Heart → Heart Rate Variability → Last 1",
                  ].map((step) => (
                    <div key={step} className="px-3 py-2 text-slate-600">
                      {step}
                    </div>
                  ))}
                  <div className="px-3 py-2 text-slate-600 space-y-1">
                    <p>
                      <strong>Get Contents of URL</strong> &rarr;{" "}
                      <span className="break-all">
                        https://athlete-tracker-xi.vercel.app/api/health/import
                      </span>
                    </p>
                    <p>Method: POST</p>
                    <p>
                      Headers: <code>Authorization: Bearer YOUR_API_KEY</code>
                    </p>
                    <p>
                      Body (JSON):{" "}
                      <code>
                        {
                          '{ "date": "YYYY-MM-DD", "weight": ..., "restingHR": ..., "sleepHours": ..., "hrv": ... }'
                        }
                      </code>
                    </p>
                    <p className="text-slate-400 text-xs not-italic font-sans">
                      Use &quot;Current Date&quot; formatted as <em>YYYY-MM-DD</em> for the date
                      field, and map each Health sample&apos;s value to the corresponding key.
                    </p>
                  </div>
                </div>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">
                4
              </span>
              <span>
                Add an <strong>Automation</strong> &rarr; Personal Automation &rarr; Time of Day
                (e.g., 8:00 AM daily) &rarr; run this shortcut.
              </span>
            </li>
          </ol>
        </div>

        {/* Test button */}
        {apiKey && (
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={testImport}
              disabled={testStatus === "loading"}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {testStatus === "loading" ? "Sending..." : "Test Import"}
            </button>
            {testStatus === "ok" && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {testMessage}
              </span>
            )}
            {testStatus === "error" && (
              <span className="text-sm text-red-600">{testMessage}</span>
            )}
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
            <RefreshCw className={`w-4 h-4 ${syncStatus === "loading" ? "animate-spin" : ""}`} />
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
