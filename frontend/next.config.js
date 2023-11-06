require('dotenv').config()

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
module.exports = withBundleAnalyzer({
  reactStrictMode: true,
  experimental: {
    externalDir: true,
  },
  images: {
    domains: [
      'cdn.martianwallet.xyz',
      'cdn.discordapp.com',
      'raw.githubusercontent.com',
    ],
    unoptimized: true,
  },
  swcMinify: false,
  env: {
    ENDPOINT: process.env.ENDPOINT,
    CLUSTER: process.env.CLUSTER,
    PROGRAM_ID: process.env.PROGRAM_ID,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
      }
    }
    config.experiments = { asyncWebAssembly: true, layers: true }

    const fileLoaderRule = config.module.rules.find(
      (rule) => rule.test && rule.test.test('.svg')
    )
    fileLoaderRule.exclude = /\.inline\.svg$/
    config.module.rules.push({
      test: /\.inline\.svg$/,
      loader: require.resolve('@svgr/webpack'),
    })

    return config
  },
})
