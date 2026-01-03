/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // GitHub Pages için basePath ve assetPrefix
  // Repo adı: budget-tracker
  basePath: process.env.NODE_ENV === 'production' ? '/budget-tracker' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/budget-tracker' : '',
};

export default nextConfig;
