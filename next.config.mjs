/** @type {import('next').NextConfig} */
const nextConfig = {
  // Phaser is created in a useEffect with a cleanup that destroys it, so StrictMode is safe.
  reactStrictMode: true,
};

export default nextConfig;
