/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@multi-ai/shared-types'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
