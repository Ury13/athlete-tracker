/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true, // enables src/instrumentation.ts on server startup
  },
};

module.exports = nextConfig;
