import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  experimental: {
    serverActions: {
        // Esto permite que las Server Actions funcionen a través de tu túnel de desarrollo.
        // En producción, el 'origin' y el 'host' deberían coincidir de forma natural.
        allowedOrigins: ["ml9bs1sb-3000.asse.devtunnels.ms"],
    }
}
};

export default nextConfig;
