/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ hostname: "*" }] },
  output: "standalone",
};

export default nextConfig;
