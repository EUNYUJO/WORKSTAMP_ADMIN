/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["antd"],
  output: 'standalone', // 서버 배포를 위한 standalone 빌드
};

module.exports = nextConfig;
