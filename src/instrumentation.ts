export async function register() {
  // Only run in Node.js runtime (not Edge), and only when a DB is configured
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.DATABASE_URL) {
    try {
      const { setupDatabase } = await import("@/lib/db-setup");
      await setupDatabase();
      console.log("[AthletIQ] Database schema ready");
    } catch (err) {
      console.error("[AthletIQ] Database setup failed:", err);
    }
  }
}
