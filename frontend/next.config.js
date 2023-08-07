require('dotenv').config()

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  experimental: {
    externalDir: true,
  },
  images: {
    domains: ['cdn.martianwallet.xyz', 'raw.githubusercontent.com'],
  },
  swcMinify: false,
  env: {
    ENDPOINT: process.env.ENDPOINT,
    CLUSTER: process.env.CLUSTER,
  },
  webpack: (config) => {
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
}
