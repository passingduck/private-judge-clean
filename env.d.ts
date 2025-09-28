declare namespace NodeJS {
  interface ProcessEnv {
    // Supabase
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE: string;
    SUPABASE_JWT_SECRET: string;
    
    // OpenAI
    OPENAI_API_KEY: string;
    OPENAI_MODEL: string;
    
    // App
    NEXT_PUBLIC_APP_URL: string;
    NODE_ENV: 'development' | 'production' | 'test';
    
    // MCP (optional)
    SUPABASE_ACCESS_TOKEN?: string;
  }
}
