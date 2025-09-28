import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Next.js 15: serverComponentsExternalPackages moved to serverExternalPackages
  serverExternalPackages: ['@supabase/supabase-js'],
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
  }
}

export default nextConfig
