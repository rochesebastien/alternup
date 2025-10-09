export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  
  return { 
    status: 'ok',
    version: config.public.appVersion,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  }
})