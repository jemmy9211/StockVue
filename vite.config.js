import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import legacy from '@vitejs/plugin-legacy'
import vue2 from '@vitejs/plugin-vue2'

// https://vitejs.dev/config/
const appendQuery = (path, key, value) => {
  if (!value || path.includes(`${key}=`)) return path
  const join = path.includes('?') ? '&' : '?'
  return `${path}${join}${key}=${encodeURIComponent(value)}`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useProxy = env.VITE_USE_PROXY === 'true'
  const apiBase = env.VITE_API_PROXY_BASE || '/api'

  const polygonKey = env.VITE_POLYGON_API_KEY
  const alphaKey = env.VITE_ALPHA_VANTAGE_API_KEY
  const twelveKey = env.VITE_TWELVEDATA_API_KEY
  const finnhubKey = env.VITE_FINNHUB_API_KEY

  const proxy = useProxy
    ? {
        [`${apiBase}/polygon`]: {
          target: 'https://api.polygon.io',
          changeOrigin: true,
          rewrite: (path) => appendQuery(path.replace(new RegExp(`^${apiBase}/polygon`), ''), 'apiKey', polygonKey),
        },
        [`${apiBase}/alphavantage`]: {
          target: 'https://www.alphavantage.co',
          changeOrigin: true,
          rewrite: (path) => appendQuery(path.replace(new RegExp(`^${apiBase}/alphavantage`), ''), 'apikey', alphaKey),
        },
        [`${apiBase}/twelvedata`]: {
          target: 'https://api.twelvedata.com',
          changeOrigin: true,
          rewrite: (path) => appendQuery(path.replace(new RegExp(`^${apiBase}/twelvedata`), ''), 'apikey', twelveKey),
        },
        [`${apiBase}/finnhub`]: {
          target: 'https://finnhub.io/api/v1',
          changeOrigin: true,
          rewrite: (path) => appendQuery(path.replace(new RegExp(`^${apiBase}/finnhub`), ''), 'token', finnhubKey),
        },
        [`${apiBase}/stooq`]: {
          target: 'https://stooq.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(new RegExp(`^${apiBase}/stooq`), ''),
        },
      }
    : undefined

  return {
    base: '/StockVue/',
    plugins: [
      vue2(),
      legacy({
        targets: ['ie >= 11'],
        additionalLegacyPolyfills: ['regenerator-runtime/runtime']
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: proxy ? { proxy } : undefined,
  }
})
