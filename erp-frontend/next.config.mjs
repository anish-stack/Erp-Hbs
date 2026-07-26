/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxy API + Socket.IO to the ERP gateway / notification service in dev so the
  // browser talks to same-origin /api and avoids CORS. Adjust targets per env.
  async rewrites() {
    const gateway = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:4000';
    return [{ source: '/gateway/:path*', destination: `${gateway}/:path*` }];
  }
};
export default nextConfig;
