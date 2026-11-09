/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // O gabarito (public/exercises.js) e lido no servidor para corrigir respostas
  experimental: {
    outputFileTracingIncludes: { '/api/exercicios/resultado': ['./public/exercises.js'] }
  }
}
module.exports = nextConfig
