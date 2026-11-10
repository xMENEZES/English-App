const isDev = process.env.NODE_ENV !== 'production'

// CSP: o app usa estilos inline e handlers onclick do motor de exercicios, entao
// script-src/style-src precisam de 'unsafe-inline'. O restante fica restrito.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'"
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }
]

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // O gabarito (public/exercises.js) e lido no servidor para corrigir respostas
  experimental: {
    outputFileTracingIncludes: { '/api/exercicios/resultado': ['./public/exercises.js'] }
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  }
}
module.exports = nextConfig
