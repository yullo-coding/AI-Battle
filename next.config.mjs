/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@vibe/design-system'],
  experimental: {
    serverComponentsExternalPackages: ['yahoo-finance2'],
  },
}

export default nextConfig
