<template>
  <div class="stock-view">
    <!-- Loading Overlay -->
    <transition name="fade">
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
      </div>
    </transition>

    <!-- Provider Panel -->
    <transition name="slide-down">
      <div v-if="showProviderPanel" class="provider-panel">
        <div class="provider-panel-header">
          <h4>API 來源管理</h4>
          <button @click="showProviderPanel = false" class="panel-close">&times;</button>
        </div>
        <div class="provider-list">
          <div 
            v-for="(provider, key) in apiProviders" 
            :key="key"
            :class="['provider-item', { 'active': currentApiProvider === key, 'disabled': provider.failCount >= 3 }]"
            @click="switchProvider(key)"
          >
            <div class="provider-info">
              <span class="provider-name">{{ provider.name }}</span>
              <span class="provider-rate">{{ provider.rateLimit }}</span>
            </div>
            <div class="provider-status">
              <span v-if="currentApiProvider === key" class="provider-badge current">使用中</span>
              <span v-else-if="provider.failCount >= 3" class="provider-badge failed">暫停</span>
              <span v-else-if="!provider.apiKey && provider.requiresKey && !useProxy" class="provider-badge no-key">未設定</span>
              <span v-else class="provider-badge ready">可用</span>
            </div>
          </div>
        </div>
        <div class="provider-panel-footer">
          <button @click="resetAllProviders" class="reset-btn">重置所有來源狀態</button>
        </div>
      </div>
    </transition>

    <!-- Header -->
    <header class="header">
      <div class="header-top">
        <h1 class="app-title">StockView</h1>

        <div class="search-area">
          <div class="search-box">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input 
              type="text" 
              v-model="searchQuery" 
              @input="handleSearchInput"
              @keyup.enter="updateStockSymbol" 
              @keydown.down="navigateSuggestions('down')"
              @keydown.up="navigateSuggestions('up')"
              @blur="hideSuggestions"
              @focus="showSuggestionsIfAvailable"
              placeholder="搜尋股票代號或名稱..."
              class="search-input"
              autocomplete="off"
            />
            <button @click="updateStockSymbol" class="search-submit" :disabled="isLoading">
              <span v-if="!isLoading">&rarr;</span>
              <span v-else class="btn-loading"></span>
            </button>

            <!-- Suggestions Dropdown -->
            <div v-if="showSuggestions && suggestions.length > 0" class="suggestions-dropdown">
              <div 
                v-for="(suggestion, index) in suggestions" 
                :key="suggestion.symbol"
                :class="['suggestion-item', { 'highlighted': index === highlightedIndex }]"
              @mousedown.prevent="selectSuggestion(suggestion)"
              @click.stop="selectSuggestion(suggestion)"
                @mouseenter="highlightedIndex = index"
              >
                <span class="suggestion-symbol">{{ suggestion.symbol }}</span>
                <span class="suggestion-name">{{ suggestion.name }}</span>
              </div>
            </div>
            <div v-else-if="noResults && !isLoadingSuggestions && searchQuery.trim().length > 0" class="suggestions-dropdown">
              <div class="suggestion-item no-results">
                找不到 "{{ searchQuery.toUpperCase() }}"
              </div>
            </div>
          </div>
        </div>

        <div class="header-meta">
          <div class="quick-stocks">
            <button 
              v-for="stock in popularStocks" 
              :key="stock"
              @click="quickSelectStock(stock)"
              :class="['quick-btn', { 'active': stockSymbol === stock }]"
            >
              {{ stock }}
            </button>
          </div>
          <div class="api-status" :class="apiStatusClass" @click="showProviderPanel = !showProviderPanel">
            <span class="api-status-dot"></span>
            <span class="api-status-text">{{ apiStatusText }}</span>
            <span v-if="failoverCount > 0" class="api-fallback-badge">fallback x{{ failoverCount }}</span>
          </div>
        </div>
      </div>

      <div class="header-info">
        <div class="stock-summary">
          <span class="stock-symbol-display">{{ stockSymbol }}</span>
          <span class="stock-name-display">{{ stockName }}</span>
          <span class="stock-price">${{ currentPrice }}</span>
          <span class="stock-change" :class="priceChangeClass">{{ priceChange }}</span>
          <div class="change-periods">
            <button 
              v-for="period in changePeriods" 
              :key="period.value"
              :class="['period-btn', { 'active': selectedChangePeriod === period.value }]"
              @click="selectedChangePeriod = period.value"
            >
              {{ period.label }}
            </button>
          </div>
        </div>
        <div class="date-controls">
          <div class="date-presets">
            <button @click="setDateRange('1M')" :class="['preset-btn', { active: activeDateRange === '1M' }]">1M</button>
            <button @click="setDateRange('3M')" :class="['preset-btn', { active: activeDateRange === '3M' }]">3M</button>
            <button @click="setDateRange('6M')" :class="['preset-btn', { active: activeDateRange === '6M' }]">6M</button>
            <button @click="setDateRange('1Y')" :class="['preset-btn', { active: activeDateRange === '1Y' }]">1Y</button>
            <button @click="setDateRange('YTD')" :class="['preset-btn', { active: activeDateRange === 'YTD' }]">YTD</button>
          </div>
          <div class="date-inputs">
            <input type="date" v-model="startDate" @change="activeDateRange = ''; fetchStockData()" class="date-input">
            <span class="date-sep">—</span>
            <input type="date" v-model="endDate" @change="activeDateRange = ''; fetchStockData()" class="date-input">
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="content-wrapper">
      <main class="main-content">
        <div class="chart-container">
          <LineChart
            :data="ohlcv"
            :width="chartWidth"
            :height="chartHeight"
          />
        </div>
        <div class="volume-bar" v-if="latestVolume">
          <span class="vol-item">
            <span class="vol-label">Vol</span>
            <span class="vol-value">{{ formatVolume(latestVolume) }}</span>
          </span>
          <span class="vol-item">
            <span class="vol-label">High</span>
            <span class="vol-value up">${{ latestHigh }}</span>
          </span>
          <span class="vol-item">
            <span class="vol-label">Low</span>
            <span class="vol-value down">${{ latestLow }}</span>
          </span>
        </div>
      </main>

      <aside class="sidebar">
        <InvestmentAdvisor 
          :rsi="rsi"
          :ma50="ma50"
          :current-price="currentPrice"
          :macd="macd"
          :signal-line="signalLine"
        />
        <div class="stats-card">
          <h4 class="stats-title">統計數據</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">52W High</span>
              <span class="stat-value">${{ week52High || '--' }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">52W Low</span>
              <span class="stat-value">${{ week52Low || '--' }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Avg Volume</span>
              <span class="stat-value">{{ formatVolume(avgVolume) || '--' }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">數據天數</span>
              <span class="stat-value">{{ ohlcv.length }}d</span>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Error Toast -->
    <transition name="slide-up">
      <div v-if="errorMessage" class="error-toast">
        {{ errorMessage }}
        <button @click="errorMessage = ''" class="error-close">&times;</button>
      </div>
    </transition>
  </div>
</template>

<script>
import axios from 'axios';
import InvestmentAdvisor from '@/components/InvestmentAdvisor.vue';
import LineChart from '@/components/LineChart.vue';
import { COMMON_TICKERS } from '@/data/tickers.js';

const ENV = import.meta.env || {};
const IS_DEV = ENV.DEV === true;
const ENV_USE_PROXY = ENV.VITE_USE_PROXY;

export default {
  name: 'HomeView',
  components: { InvestmentAdvisor, LineChart },
  data() {
    const today = new Date();
    const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    return {
      useProxy: ENV_USE_PROXY === 'true' || (IS_DEV && ENV_USE_PROXY !== 'false'),
      isDev: IS_DEV,
      apiProxyBase: ENV.VITE_API_PROXY_BASE || '/api',
      chartWidth: window.innerWidth - (window.innerWidth > 1200 ? 360 : (window.innerWidth > 992 ? 320 : 0)) - 2,
      chartHeight: window.innerWidth <= 768
        ? Math.min(window.innerWidth * 0.6, 320)
        : window.innerHeight - 200,
      stockName: 'Apple Inc.',
      currentPrice: 0,
      ohlcv: [],
      startDate: lastYear.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      stockSymbol: 'AAPL',
      searchQuery: 'AAPL',
      activeDateRange: '1Y',
      rsi: null,
      ma50: null,
      macd: null, 
      signalLine: null,
      suggestions: [],
      showSuggestions: false,
      isLoadingSuggestions: false,
      highlightedIndex: -1,
      searchTimeout: null,
      searchRequestId: 0,
      noResults: false,
      selectedChangePeriod: 1,
      changePeriods: [
        { label: '1天', value: 1 },
        { label: '5天', value: 5 },
        { label: '1月', value: 30 },
        { label: '6月', value: 180 }
      ],
      // New state variables
      isLoading: false,
      errorMessage: '',
      apiStatus: 'ok', // 'ok', 'warning', 'error'
      popularStocks: ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'META', 'AMZN'],
      marketSummary: [
        { symbol: 'S&P 500', price: '--', change: 0 },
        { symbol: 'NASDAQ', price: '--', change: 0 },
        { symbol: 'DOW', price: '--', change: 0 },
      ],
      // API configuration - supports multiple providers with auto-fallback
      apiProviders: {
        polygon: {
          name: 'Polygon.io',
          baseUrl: 'https://api.polygon.io',
          apiKey: ENV.VITE_POLYGON_API_KEY || '',
          rateLimit: '5 calls/min',
          requiresKey: true,
          failCount: 0,
          lastFailTime: null,
        },
        alphavantage: {
          name: 'Alpha Vantage',
          baseUrl: 'https://www.alphavantage.co',
          apiKey: ENV.VITE_ALPHA_VANTAGE_API_KEY || '',
          rateLimit: '25 calls/day',
          requiresKey: true,
          failCount: 0,
          lastFailTime: null,
        },
        twelvedata: {
          name: 'Twelve Data',
          baseUrl: 'https://api.twelvedata.com',
          apiKey: ENV.VITE_TWELVEDATA_API_KEY || '',
          rateLimit: '800 calls/day',
          requiresKey: true,
          failCount: 0,
          lastFailTime: null,
        },
        finnhub: {
          name: 'Finnhub',
          baseUrl: 'https://finnhub.io/api/v1',
          apiKey: ENV.VITE_FINNHUB_API_KEY || '',
          rateLimit: '60 calls/min',
          requiresKey: true,
          failCount: 0,
          lastFailTime: null,
        },
        stooq: {
          name: 'Stooq',
          baseUrl: 'https://stooq.com',
          apiKey: '',
          rateLimit: '無限制',
          requiresKey: false,
          failCount: 0,
          lastFailTime: null,
        },
      },
      // Provider priority order for fallback
      providerOrder: ['polygon', 'alphavantage', 'twelvedata', 'finnhub', 'stooq'],
      currentApiProvider: 'polygon',
      failoverCount: 0,
      showProviderPanel: false,
      // Cache
      dataCache: {},
      cacheTTL: 5 * 60 * 1000, // 5 分鐘快取
      searchCache: {},
      searchCacheTTL: 5 * 60 * 1000, // 5 分鐘快取
    };
  },
  computed: {
    apiUrl() {
      return this.buildApiUrl(this.currentApiProvider, this.stockSymbol, this.startDate, this.endDate);
    },
    priceChangeRaw() {
      if (!this.ohlcv || this.ohlcv.length < 2) return 0;
      
      const latestPrice = this.ohlcv[this.ohlcv.length - 1][4];
      const lookbackIndex = Math.max(0, this.ohlcv.length - 1 - this.selectedChangePeriod);
      const previousPrice = this.ohlcv[lookbackIndex][4];
      
      if (!previousPrice || previousPrice === 0) return 0;
      
      return (latestPrice - previousPrice) / previousPrice;
    },
    priceChange() {
      const change = this.priceChangeRaw;
      if (change === 0) return '0.00%';
      return `${change > 0 ? '+' : ''}${(change * 100).toFixed(2)}%`;
    },
    priceChangeClass() {
      if (this.priceChangeRaw > 0) return 'positive';
      if (this.priceChangeRaw < 0) return 'negative';
      return 'neutral';
    },
    apiStatusClass() {
      return `status-${this.apiStatus}`;
    },
    apiStatusText() {
      const provider = this.apiProviders[this.currentApiProvider];
      if (!provider) return '未知來源';
      const statusMessages = {
        ok: `${provider.name} 連線正常`,
        warning: `${provider.name} (已切換)`,
        error: `所有來源連線失敗`
      };
      return statusMessages[this.apiStatus] || provider.name;
    },
    latestVolume() {
      if (!this.ohlcv || this.ohlcv.length === 0) return 0;
      return this.ohlcv[this.ohlcv.length - 1][5];
    },
    latestHigh() {
      if (!this.ohlcv || this.ohlcv.length === 0) return '--';
      return this.ohlcv[this.ohlcv.length - 1][2].toFixed(2);
    },
    latestLow() {
      if (!this.ohlcv || this.ohlcv.length === 0) return '--';
      return this.ohlcv[this.ohlcv.length - 1][3].toFixed(2);
    },
    week52High() {
      if (!this.ohlcv || this.ohlcv.length === 0) return null;
      return Math.max(...this.ohlcv.map(d => d[2])).toFixed(2);
    },
    week52Low() {
      if (!this.ohlcv || this.ohlcv.length === 0) return null;
      return Math.min(...this.ohlcv.map(d => d[3])).toFixed(2);
    },
    avgVolume() {
      if (!this.ohlcv || this.ohlcv.length === 0) return 0;
      const sum = this.ohlcv.reduce((acc, d) => acc + d[5], 0);
      return Math.round(sum / this.ohlcv.length);
    }
  },
  methods: {
    formatVolume(volume) {
      if (!volume) return '--';
      if (volume >= 1e9) return (volume / 1e9).toFixed(2) + 'B';
      if (volume >= 1e6) return (volume / 1e6).toFixed(2) + 'M';
      if (volume >= 1e3) return (volume / 1e3).toFixed(2) + 'K';
      return volume.toString();
    },
    setDateRange(range) {
      const today = new Date();
      let startDate = new Date();
      
      switch (range) {
        case '1M':
          startDate.setMonth(today.getMonth() - 1);
          break;
        case '3M':
          startDate.setMonth(today.getMonth() - 3);
          break;
        case '6M':
          startDate.setMonth(today.getMonth() - 6);
          break;
        case '1Y':
          startDate.setFullYear(today.getFullYear() - 1);
          break;
        case 'YTD':
          startDate = new Date(today.getFullYear(), 0, 1);
          break;
      }
      
      this.startDate = startDate.toISOString().split('T')[0];
      this.endDate = today.toISOString().split('T')[0];
      this.activeDateRange = range;
      this.fetchStockData();
    },
    quickSelectStock(symbol) {
      this.searchQuery = symbol;
      this.updateStockSymbol();
    },
    calculateIndicators() {
      if (!this.ohlcv || this.ohlcv.length === 0) {
        this.rsi = this.ma50 = this.macd = this.signalLine = null;
        return;
      }

      const closePrices = this.ohlcv.map(d => d[4]);

      // 50-day Moving Average
      if (closePrices.length >= 50) {
        const sum = closePrices.slice(-50).reduce((a, b) => a + b, 0);
        this.ma50 = (sum / 50).toFixed(2);
      } else {
        this.ma50 = null;
      }

      // 14-day RSI
      if (closePrices.length >= 15) {
        const changes = [];
        for (let i = 1; i < closePrices.length; i++) {
          changes.push(closePrices[i] - closePrices[i - 1]);
        }
        
        const last14Changes = changes.slice(-14);
        const gains = last14Changes.filter(c => c > 0).reduce((a, b) => a + b, 0);
        const losses = Math.abs(last14Changes.filter(c => c < 0).reduce((a, b) => a + b, 0));

        const avgGain = gains / 14;
        const avgLoss = losses / 14;

        if (avgLoss === 0) {
          this.rsi = 100;
        } else {
          const rs = avgGain / avgLoss;
          this.rsi = (100 - (100 / (1 + rs))).toFixed(2);
        }
      } else {
        this.rsi = null;
      }

      // MACD
      if (closePrices.length < 35) {
        this.macd = null;
        this.signalLine = null;
        return;
      }

      const getEmaSeries = (data, period) => {
        const k = 2 / (period + 1);
        const emas = [data.slice(0, period).reduce((a, b) => a + b, 0) / period];
        for (let i = period; i < data.length; i++) {
          emas.push(data[i] * k + emas[emas.length - 1] * (1 - k));
        }
        return emas;
      };

      const ema12Series = getEmaSeries(closePrices, 12);
      const ema26Series = getEmaSeries(closePrices, 26);
      
      const macdLineSeries = ema26Series.map((ema26Value, index) => {
        const ema12 = ema12Series[index + (ema12Series.length - ema26Series.length)];
        return ema12 - ema26Value;
      });

      if (macdLineSeries.length >= 9) {
        const signalLineSeries = getEmaSeries(macdLineSeries, 9);
        this.macd = macdLineSeries[macdLineSeries.length - 1].toFixed(2);
        this.signalLine = signalLineSeries[signalLineSeries.length - 1].toFixed(2);
      } else {
        this.macd = null;
        this.signalLine = null;
      }
    },
    // ====== API URL Builder ======
    buildApiUrl(providerKey, symbol, startDate, endDate) {
      const provider = this.apiProviders[providerKey];
      if (!provider) return '';
      const baseUrl = this.getProviderBaseUrl(providerKey);
      const useProxy = this.useProxy;

      switch (providerKey) {
        case 'polygon':
          return `${baseUrl}/v2/aggs/ticker/${symbol}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=asc${useProxy ? '' : `&apiKey=${provider.apiKey}`}`;

        case 'alphavantage':
          return `${baseUrl}/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full${useProxy ? '' : `&apikey=${provider.apiKey}`}`;

        case 'twelvedata':
          return `${baseUrl}/time_series?symbol=${symbol}&interval=1day&start_date=${startDate}&end_date=${endDate}${useProxy ? '' : `&apikey=${provider.apiKey}`}`;

        case 'finnhub': {
          const from = Math.floor(new Date(startDate).getTime() / 1000);
          const to = Math.floor(new Date(endDate).getTime() / 1000);
          return `${baseUrl}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}${useProxy ? '' : `&token=${provider.apiKey}`}`;
        }

        case 'stooq':
          return `${baseUrl}/q/d/l/?s=${symbol}.US&d1=${startDate.replace(/-/g, '')}&d2=${endDate.replace(/-/g, '')}&i=d`;

        default:
          return '';
      }
    },

    // ====== Response Parser - normalize to OHLCV ======
    parseResponse(providerKey, data) {
      switch (providerKey) {
        case 'polygon':
          if (data && data.results && data.results.length > 0) {
            return data.results.map(item => [item.t, item.o, item.h, item.l, item.c, item.v]);
          }
          return null;

        case 'alphavantage': {
          const timeSeries = data['Time Series (Daily)'];
          if (!timeSeries) return null;
          const entries = Object.entries(timeSeries)
            .map(([date, values]) => [
              new Date(date).getTime(),
              parseFloat(values['1. open']),
              parseFloat(values['2. high']),
              parseFloat(values['3. low']),
              parseFloat(values['4. close']),
              parseInt(values['5. volume']),
            ])
            .filter(item => {
              const d = new Date(item[0]);
              return d >= new Date(this.startDate) && d <= new Date(this.endDate);
            })
            .sort((a, b) => a[0] - b[0]);
          return entries.length > 0 ? entries : null;
        }

        case 'twelvedata': {
          if (!data || !data.values || data.values.length === 0) return null;
          if (data.status === 'error') return null;
          return data.values
            .map(item => [
              new Date(item.datetime).getTime(),
              parseFloat(item.open),
              parseFloat(item.high),
              parseFloat(item.low),
              parseFloat(item.close),
              parseInt(item.volume),
            ])
            .sort((a, b) => a[0] - b[0]);
        }

        case 'finnhub': {
          if (!data || data.s !== 'ok' || !data.t || data.t.length === 0) return null;
          return data.t.map((time, i) => [
            time * 1000,
            data.o[i],
            data.h[i],
            data.l[i],
            data.c[i],
            data.v[i],
          ]);
        }

        case 'stooq': {
          // Stooq returns CSV data
          if (!data || typeof data !== 'string') return null;
          const lines = data.trim().split('\n');
          if (lines.length < 2) return null;
          // Header: Date,Open,High,Low,Close,Volume
          return lines.slice(1)
            .map(line => {
              const parts = line.split(',');
              if (parts.length < 6) return null;
              return [
                new Date(parts[0]).getTime(),
                parseFloat(parts[1]),
                parseFloat(parts[2]),
                parseFloat(parts[3]),
                parseFloat(parts[4]),
                parseInt(parts[5]) || 0,
              ];
            })
            .filter(item => item !== null && !isNaN(item[0]))
            .sort((a, b) => a[0] - b[0]);
        }

        default:
          return null;
      }
    },

    // ====== Check if a provider is available ======
    isProviderAvailable(providerKey) {
      const provider = this.apiProviders[providerKey];
      if (!provider) return false;
      
      // 需要 key 但沒有設定
      if (provider.requiresKey && !provider.apiKey && !this.useProxy) return false;
      
      // 失敗次數過多，冷卻 2 分鐘
      if (provider.failCount >= 3) {
        const cooldown = 2 * 60 * 1000;
        if (provider.lastFailTime && (Date.now() - provider.lastFailTime) < cooldown) {
          return false;
        }
        // 冷卻結束，重置 failCount
        provider.failCount = 0;
      }
      
      return true;
    },

    getProviderBaseUrl(providerKey) {
      const provider = this.apiProviders[providerKey];
      if (!provider) return '';
      if (!this.useProxy) return provider.baseUrl;
      return `${this.apiProxyBase}/${providerKey}`;
    },

    // ====== Search helpers ======
    buildSearchUrl(providerKey, query) {
      const provider = this.apiProviders[providerKey];
      if (!provider) return '';
      const baseUrl = this.getProviderBaseUrl(providerKey);
      const useProxy = this.useProxy;
      const encoded = encodeURIComponent(query);

      switch (providerKey) {
        case 'alphavantage':
          return `${baseUrl}/query?function=SYMBOL_SEARCH&keywords=${encoded}${useProxy ? '' : `&apikey=${provider.apiKey}`}`;
        case 'twelvedata':
          return `${baseUrl}/symbol_search?symbol=${encoded}${useProxy ? '' : `&apikey=${provider.apiKey}`}`;
        case 'finnhub':
          return `${baseUrl}/search?q=${encoded}${useProxy ? '' : `&token=${provider.apiKey}`}`;
        case 'polygon':
          return `${baseUrl}/v3/reference/tickers?search=${encoded}&active=true&limit=20${useProxy ? '' : `&apiKey=${provider.apiKey}`}`;
        default:
          return '';
      }
    },

    parseSearchResponse(providerKey, data) {
      switch (providerKey) {
        case 'alphavantage': {
          const matches = data && data.bestMatches ? data.bestMatches : [];
          return matches.map(item => ({
            symbol: item['1. symbol'],
            name: item['2. name'],
          })).filter(item => item.symbol && item.name);
        }
        case 'twelvedata': {
          const values = data && data.data ? data.data : [];
          return values.map(item => ({
            symbol: item.symbol,
            name: item.instrument_name || item.name || item.symbol,
          })).filter(item => item.symbol);
        }
        case 'finnhub': {
          const results = data && data.result ? data.result : [];
          return results.map(item => ({
            symbol: item.symbol,
            name: item.description || item.symbol,
          })).filter(item => item.symbol);
        }
        case 'polygon': {
          const results = data && data.results ? data.results : [];
          return results.map(item => ({
            symbol: item.ticker,
            name: item.name || item.ticker,
          })).filter(item => item.symbol);
        }
        default:
          return [];
      }
    },

    getSearchCacheKey(query) {
      return `${query.toLowerCase()}`;
    },

    getSearchCachedData(query) {
      const key = this.getSearchCacheKey(query);
      const cached = this.searchCache[key];
      if (cached && (Date.now() - cached.timestamp) < this.searchCacheTTL) {
        return cached.data;
      }
      return null;
    },

    setSearchCachedData(query, data) {
      const key = this.getSearchCacheKey(query);
      this.searchCache[key] = { data, timestamp: Date.now() };
    },

    async fetchSearchFromProvider(providerKey, query) {
      const url = this.buildSearchUrl(providerKey, query);
      if (!url) throw new Error('Invalid search URL');

      const res = await axios.get(url, { timeout: 8000 });
      const parsed = this.parseSearchResponse(providerKey, res.data);
      if (!parsed || parsed.length === 0) {
        throw new Error('No search results');
      }
      return parsed;
    },

    getSearchProviders() {
      return this.providerOrder.filter(key => {
        if (key === 'stooq') return false;
        return this.isProviderAvailable(key);
      });
    },

    localSearch(query) {
      const raw = query.trim();
      if (!raw) return [];
      const upper = raw.toUpperCase();
      const lower = raw.toLowerCase();

      const prefix = COMMON_TICKERS.filter(t => t.symbol.startsWith(upper));
      const symbolContains = COMMON_TICKERS.filter(t =>
        !t.symbol.startsWith(upper) && t.symbol.includes(upper));
      const nameLower = COMMON_TICKERS.filter(t =>
        !t.symbol.startsWith(upper) &&
        !t.symbol.includes(upper) &&
        t.name.toLowerCase().includes(lower));

      return [...prefix, ...symbolContains, ...nameLower].slice(0, 20);
    },

    // ====== Get available providers in priority order ======
    getAvailableProviders() {
      return this.providerOrder.filter(key => this.isProviderAvailable(key));
    },

    // ====== Cache helpers ======
    getCacheKey(provider, symbol) {
      return `${provider}:${symbol}:${this.startDate}:${this.endDate}`;
    },

    getCachedData(provider, symbol) {
      const key = this.getCacheKey(provider, symbol);
      const cached = this.dataCache[key];
      if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
        return cached.data;
      }
      return null;
    },

    setCachedData(provider, symbol, data) {
      const key = this.getCacheKey(provider, symbol);
      this.dataCache[key] = { data, timestamp: Date.now() };
    },

    // ====== Single provider fetch with timeout ======
    async fetchFromProvider(providerKey) {
      const url = this.buildApiUrl(providerKey, this.stockSymbol, this.startDate, this.endDate);
      if (!url) throw new Error('Invalid URL');

      // Stooq returns CSV, others return JSON
      const isCSV = providerKey === 'stooq';
      
      const res = await axios.get(url, {
        timeout: 10000, // 10 秒超時
        responseType: isCSV ? 'text' : 'json',
      });

      const parsed = this.parseResponse(providerKey, res.data);
      if (!parsed || parsed.length === 0) {
        throw new Error('No data returned');
      }

      return parsed;
    },

    // ====== Validate API config on startup ======
    validateApiConfig() {
      const hasKey = Object.values(this.apiProviders).some(
        (provider) => provider.requiresKey && provider.apiKey
      );

      if (!hasKey && this.apiProviders.stooq) {
        this.currentApiProvider = 'stooq';
      }

      if (this.useProxy && !this.isDev) {
        this.apiStatus = 'warning';
        this.errorMessage = '目前為正式版模式，若無後端代理，請關閉 VITE_USE_PROXY 或提供 /api 代理。';
        setTimeout(() => { this.errorMessage = ''; }, 7000);
        return;
      }

      if (!this.useProxy && !hasKey) {
        this.apiStatus = 'warning';
        this.errorMessage = '未設定 API Key，已改用 Stooq。建議設定 .env 或啟用代理以避免 CORS。';
        setTimeout(() => { this.errorMessage = ''; }, 7000);
      }
    },

    // ====== Main fetch with auto-fallback ======
    async fetchStockData() {
      if (!this.stockSymbol) return;
      
      this.isLoading = true;
      this.errorMessage = '';
      this.failoverCount = 0;

      // 1. 先嘗試快取
      const cachedData = this.getCachedData(this.currentApiProvider, this.stockSymbol);
      if (cachedData) {
        this.ohlcv = cachedData;
        this.updateStockInfoFromOhlcv();
        this.stockName = this.getStockFullName(this.stockSymbol);
        this.calculateIndicators();
        this.apiStatus = 'ok';
        this.isLoading = false;
        return;
      }

      // 2. 取得可用的 providers
      const providers = this.getAvailableProviders();
      if (providers.length === 0) {
        this.handleFetchFailure('所有 API 來源目前都不可用，請稍後再試');
        return;
      }

      // 3. 確保目前 provider 排在最前面
      const orderedProviders = [
        ...providers.filter(p => p === this.currentApiProvider),
        ...providers.filter(p => p !== this.currentApiProvider),
      ];

      // 4. 逐一嘗試每個 provider
      for (let i = 0; i < orderedProviders.length; i++) {
        const providerKey = orderedProviders[i];
        
        try {
          console.log(`[StockView] 嘗試 ${this.apiProviders[providerKey].name}...`);
          const ohlcvData = await this.fetchFromProvider(providerKey);
          
          // 成功！
          this.ohlcv = ohlcvData;
          this.setCachedData(providerKey, this.stockSymbol, ohlcvData);
          this.updateStockInfoFromOhlcv();
          this.stockName = this.getStockFullName(this.stockSymbol);
          this.calculateIndicators();
          
          // 重置該 provider 的失敗計數
          this.apiProviders[providerKey].failCount = 0;
          
          // 如果 fallback 成功
          if (i > 0) {
            this.failoverCount = i;
            this.currentApiProvider = providerKey;
            this.apiStatus = 'warning';
            this.errorMessage = `已自動切換至 ${this.apiProviders[providerKey].name} (原始來源不可用)`;
            // 5 秒後清除提示
            setTimeout(() => { this.errorMessage = ''; }, 5000);
          } else {
            this.apiStatus = 'ok';
          }
          
          this.isLoading = false;
          return;
          
        } catch (error) {
          console.warn(`[StockView] ${this.apiProviders[providerKey].name} 失敗:`, error.message);
          
          // 記錄失敗
          this.apiProviders[providerKey].failCount++;
          this.apiProviders[providerKey].lastFailTime = Date.now();
          
          // 如果還有下一個 provider，繼續嘗試
          if (i < orderedProviders.length - 1) {
            this.failoverCount = i + 1;
            continue;
          }
        }
      }

      // 5. 所有 provider 都失敗了
      this.handleFetchFailure('所有 API 來源都無法取得資料，請稍後再試或檢查網路連線');
    },

    // ====== Handle complete failure ======
    handleFetchFailure(message) {
      this.ohlcv = [];
      this.stockName = `${this.stockSymbol} (載入失敗)`;
      this.currentPrice = 0;
      this.rsi = null;
      this.ma50 = null;
      this.macd = null;
      this.signalLine = null;
      this.apiStatus = 'error';
      this.errorMessage = message;
      this.isLoading = false;
    },

    // ====== Update stock info from OHLCV data ======
    updateStockInfoFromOhlcv() {
      if (this.ohlcv && this.ohlcv.length > 0) {
        const latest = this.ohlcv[this.ohlcv.length - 1];
        this.currentPrice = latest[4].toFixed(2);
      } else {
        this.currentPrice = 0;
      }
    },

    // ====== Switch provider manually ======
    switchProvider(providerKey) {
      if (!this.isProviderAvailable(providerKey)) return;
      this.currentApiProvider = providerKey;
      this.showProviderPanel = false;
      this.fetchStockData();
    },

    // ====== Reset all provider states ======
    resetAllProviders() {
      Object.keys(this.apiProviders).forEach(key => {
        this.apiProviders[key].failCount = 0;
        this.apiProviders[key].lastFailTime = null;
      });
      this.currentApiProvider = this.providerOrder[0];
      this.failoverCount = 0;
      this.dataCache = {};
      this.showProviderPanel = false;
      this.fetchStockData();
    },
    getStockFullName(symbol) {
      const ticker = COMMON_TICKERS.find(t => t.symbol === symbol);
      return ticker ? ticker.name : symbol;
    },
    updateStockInfo(data) {
      // Legacy method kept for compatibility
      if (data.length >= 1) {
        const latestData = data[data.length - 1];
        this.currentPrice = latestData.c ? latestData.c.toFixed(2) : 0;
      }
    },
    updateStockSymbol() {
      this.stockSymbol = this.searchQuery.toUpperCase();
      this.showSuggestions = false;
      this.suggestions = [];
      this.noResults = false;
      this.highlightedIndex = -1;
      // Blur the input so the dropdown won't reappear on focus
      if (document.activeElement && document.activeElement.classList.contains('search-input')) {
        document.activeElement.blur();
      }
      this.fetchStockData();
    },
    handleResize() {
      const w = window.innerWidth;
      const sidebarWidth = w > 1200 ? 360 : (w > 992 ? 320 : 0);
      this.chartWidth = w - sidebarWidth - 2;
      this.chartHeight = w <= 768
        ? Math.min(w * 0.6, 320)
        : window.innerHeight - 200;
    },
    handleSearchInput() {
      const raw = this.searchQuery.trim();
      const query = raw.toUpperCase();

      if (this.searchTimeout) clearTimeout(this.searchTimeout);

      if (raw.length === 0) {
        this.suggestions = [];
        this.showSuggestions = false;
        this.noResults = false;
        return;
      }

      this.searchTimeout = setTimeout(async () => {
        const requestId = ++this.searchRequestId;
        this.isLoadingSuggestions = true;

        // 1) Cache
        const cached = this.getSearchCachedData(raw);
        if (cached) {
          if (requestId !== this.searchRequestId) return;
          this.suggestions = cached;
          this.showSuggestions = cached.length > 0;
          this.noResults = cached.length === 0;
          this.highlightedIndex = -1;
          this.isLoadingSuggestions = false;
          return;
        }

        // 2) Try API providers in order
        const providers = this.getSearchProviders();
        for (let i = 0; i < providers.length; i++) {
          const providerKey = providers[i];
          try {
            const results = await this.fetchSearchFromProvider(providerKey, raw);
            if (requestId !== this.searchRequestId) return;
            const merged = results.slice(0, 20);
            this.setSearchCachedData(raw, merged);
            this.suggestions = merged;
            this.showSuggestions = merged.length > 0;
            this.noResults = merged.length === 0;
            this.highlightedIndex = -1;
            this.isLoadingSuggestions = false;
            return;
          } catch (error) {
            if (i < providers.length - 1) continue;
          }
        }

        // 3) Fallback to local search if API fails
        if (requestId !== this.searchRequestId) return;
        const localResults = this.localSearch(raw);
        this.suggestions = localResults;
        this.showSuggestions = localResults.length > 0;
        this.noResults = localResults.length === 0;
        this.highlightedIndex = -1;
        this.isLoadingSuggestions = false;
      }, 150);
    },
    selectSuggestion(suggestion) {
      this.searchQuery = suggestion.symbol;
      this.showSuggestions = false;
      this.suggestions = [];
      this.highlightedIndex = -1;
      this.noResults = false;
      this.stockSymbol = suggestion.symbol;
      // Blur input so dropdown stays closed
      if (document.activeElement && document.activeElement.classList.contains('search-input')) {
        document.activeElement.blur();
      }
      this.fetchStockData();
    },
    navigateSuggestions(direction) {
      if (!this.showSuggestions || this.suggestions.length === 0) return;
      
      if (direction === 'down') {
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.suggestions.length - 1);
      } else if (direction === 'up') {
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
      }
      
      if (this.highlightedIndex >= 0) {
        this.searchQuery = this.suggestions[this.highlightedIndex].symbol;
      }
    },
    hideSuggestions() {
      setTimeout(() => {
        this.showSuggestions = false;
        this.noResults = false;
        this.highlightedIndex = -1;
      }, 200);
    },
    showSuggestionsIfAvailable() {
      if (this.suggestions.length > 0) {
        this.showSuggestions = true;
      }
    }
  },
  created() {
    this.validateApiConfig();
    this.fetchStockData();
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
  },
};
</script>

<style scoped>
/* ========== MINIMAL DESIGN SYSTEM ========== */

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter, .fade-leave-to { opacity: 0; }
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.2s ease; }
.slide-up-enter, .slide-up-leave-to { opacity: 0; transform: translateY(12px); }
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.2s ease; }
.slide-down-enter, .slide-down-leave-to { opacity: 0; transform: translateY(-8px); }

/* ========== LAYOUT ========== */
.stock-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  color: #c8c8c8;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow: hidden;
}

/* ========== LOADING ========== */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 14, 30, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(255,255,255,0.1);
  border-top-color: rgba(255,255,255,0.6);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* ========== API STATUS ========== */
.api-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.2s;
  white-space: nowrap;
}
.api-status:hover { opacity: 0.8; }

.api-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-ok { background: rgba(76,175,80,0.1); border: 1px solid rgba(76,175,80,0.2); color: #66bb6a; }
.status-ok .api-status-dot { background: #66bb6a; }
.status-warning { background: rgba(255,152,0,0.1); border: 1px solid rgba(255,152,0,0.2); color: #ffa726; }
.status-warning .api-status-dot { background: #ffa726; }
.status-error { background: rgba(244,67,54,0.1); border: 1px solid rgba(244,67,54,0.2); color: #ef5350; }
.status-error .api-status-dot { background: #ef5350; }

.api-fallback-badge {
  font-size: 0.6rem;
  background: rgba(255,152,0,0.15);
  color: #ffa726;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 600;
}

/* ========== PROVIDER PANEL ========== */
.provider-panel {
  position: fixed;
  top: 44px;
  right: 16px;
  width: 300px;
  background: #1a1a2e;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  z-index: 200;
  box-shadow: 0 8px 30px rgba(0,0,0,0.5);
  overflow: hidden;
}

.provider-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.provider-panel-header h4 { margin: 0; font-size: 0.8rem; color: #aaa; font-weight: 600; }

.panel-close {
  background: none;
  border: none;
  color: #666;
  font-size: 1rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.panel-close:hover { color: #aaa; }

.provider-list { padding: 6px; }

.provider-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
.provider-item:hover { background: rgba(255,255,255,0.04); }
.provider-item.active { background: rgba(255,255,255,0.06); }
.provider-item.disabled { opacity: 0.4; cursor: not-allowed; }

.provider-info { display: flex; flex-direction: column; gap: 2px; }
.provider-name { font-size: 0.8rem; font-weight: 600; color: #ccc; }
.provider-rate { font-size: 0.65rem; color: #666; }

.provider-badge {
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.provider-badge.current { background: rgba(255,255,255,0.08); color: #aaa; }
.provider-badge.ready { background: rgba(76,175,80,0.1); color: #66bb6a; }
.provider-badge.failed { background: rgba(244,67,54,0.1); color: #ef5350; }
.provider-badge.no-key { background: rgba(158,158,158,0.1); color: #888; }

.provider-panel-footer {
  padding: 10px 12px;
  border-top: 1px solid rgba(255,255,255,0.06);
}

.reset-btn {
  width: 100%;
  padding: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  background: transparent;
  color: #888;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}
.reset-btn:hover { background: rgba(255,255,255,0.04); color: #aaa; }

/* ========== HEADER ========== */
.header {
  padding: 0 20px;
  background: rgba(18, 18, 32, 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: relative;
  z-index: 50;
  flex-shrink: 0;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 20px;
  height: 48px;
}

.app-title {
  font-size: 1rem;
  font-weight: 700;
  color: #e0e0e0;
  margin: 0;
  letter-spacing: -0.3px;
  white-space: nowrap;
}

/* ========== SEARCH ========== */
.search-area {
  flex: 1;
  max-width: 420px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  width: 15px;
  height: 15px;
  color: #555;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 7px 36px 7px 32px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  color: #d0d0d0;
  font-size: 0.8rem;
  outline: none;
  transition: border-color 0.15s, background 0.15s;
}
.search-input:focus {
  border-color: rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.07);
}
.search-input::placeholder { color: #555; }

.search-submit {
  position: absolute;
  right: 4px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: rgba(255,255,255,0.08);
  color: #aaa;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.search-submit:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
.search-submit:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-loading {
  width: 12px;
  height: 12px;
  border: 1.5px solid rgba(255,255,255,0.2);
  border-top-color: #aaa;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}

/* Suggestions */
.suggestions-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #1a1a2e;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  max-height: 320px;
  overflow-y: auto;
  z-index: 9999;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}

.suggestion-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.1s;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}
.suggestion-item:last-child { border-bottom: none; }
.suggestion-item:hover,
.suggestion-item.highlighted { background: rgba(255,255,255,0.05); }

.suggestion-symbol {
  font-weight: 600;
  font-size: 0.8rem;
  color: #e0e0e0;
  min-width: 60px;
}
.suggestion-name {
  font-size: 0.75rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.suggestion-item.no-results {
  cursor: default;
  color: #555;
  font-size: 0.75rem;
}

/* ========== HEADER META (Quick stocks) ========== */
.header-meta {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.quick-stocks {
  display: flex;
  gap: 4px;
}

.quick-btn {
  padding: 4px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #666;
  cursor: pointer;
  transition: all 0.15s;
}
.quick-btn:hover { color: #aaa; background: rgba(255,255,255,0.05); }
.quick-btn.active { color: #e0e0e0; background: rgba(255,255,255,0.1); }

/* ========== HEADER INFO BAR ========== */
.header-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-top: 1px solid rgba(255,255,255,0.04);
}

.stock-summary {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.stock-symbol-display {
  font-size: 1.1rem;
  font-weight: 700;
  color: #e0e0e0;
  letter-spacing: -0.3px;
}

.stock-name-display {
  font-size: 0.75rem;
  color: #666;
}

.stock-price {
  font-size: 1.1rem;
  font-weight: 700;
  color: #e0e0e0;
  font-variant-numeric: tabular-nums;
}

.stock-change {
  font-size: 0.85rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.positive { color: #66bb6a; }
.negative { color: #ef5350; }
.neutral { color: #888; }

.change-periods {
  display: flex;
  gap: 2px;
  margin-left: 4px;
}

.period-btn {
  padding: 2px 6px;
  font-size: 0.65rem;
  font-weight: 600;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: #555;
  cursor: pointer;
  transition: all 0.15s;
}
.period-btn:hover { color: #aaa; }
.period-btn.active { background: rgba(255,255,255,0.1); color: #ccc; }

/* Date Controls */
.date-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.date-presets {
  display: flex;
  gap: 2px;
}

.preset-btn {
  padding: 3px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #555;
  cursor: pointer;
  transition: all 0.15s;
}
.preset-btn:hover { color: #aaa; background: rgba(255,255,255,0.05); }
.preset-btn.active { color: #e0e0e0; background: rgba(255,255,255,0.1); }

.date-inputs {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-sep { color: #444; font-size: 0.75rem; }

.date-input {
  background: rgba(255,255,255,0.04);
  color: #aaa;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 0.7rem;
  outline: none;
  transition: border-color 0.15s;
}
.date-input:focus { border-color: rgba(255,255,255,0.15); }
.date-input::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; }

/* ========== MAIN CONTENT ========== */
.content-wrapper {
  display: grid;
  grid-template-columns: 1fr 360px;
  flex-grow: 1;
  overflow: hidden;
  gap: 1px;
  background: rgba(255,255,255,0.04);
  position: relative;
  z-index: 1;
}

.main-content {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: rgba(18, 18, 32, 0.6);
  position: relative;
}

.chart-container {
  flex: 1;
  overflow: hidden;
}

/* Volume Bar */
.volume-bar {
  display: flex;
  gap: 20px;
  padding: 8px 16px;
  border-top: 1px solid rgba(255,255,255,0.04);
  font-size: 0.75rem;
}

.vol-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.vol-label { color: #555; font-weight: 500; }
.vol-value { color: #aaa; font-weight: 600; font-variant-numeric: tabular-nums; }
.vol-value.up { color: #66bb6a; }
.vol-value.down { color: #ef5350; }

/* ========== SIDEBAR ========== */
.sidebar {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: rgba(18, 18, 32, 0.6);
  padding: 12px;
  gap: 12px;
}

/* Stats Card */
.stats-card {
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(255,255,255,0.05);
}

.stats-title {
  color: #888;
  font-size: 0.75rem;
  font-weight: 600;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stat-item {
  padding: 8px;
  border-radius: 6px;
  background: rgba(255,255,255,0.02);
}

.stat-label {
  display: block;
  font-size: 0.65rem;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: #ccc;
  font-variant-numeric: tabular-nums;
}

/* ========== ERROR TOAST ========== */
.error-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #2a1a1a;
  border: 1px solid rgba(239,83,80,0.3);
  color: #ef5350;
  padding: 10px 16px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8rem;
  z-index: 1000;
  max-width: 90%;
}

.error-close {
  background: none;
  border: none;
  color: #ef5350;
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  margin-left: 8px;
  opacity: 0.6;
}
.error-close:hover { opacity: 1; }

/* ========== RESPONSIVE ========== */
@media (max-width: 1200px) {
  .content-wrapper { grid-template-columns: 1fr 320px; }
  .quick-stocks { display: none; }
}

@media (max-width: 992px) {
  .content-wrapper {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
  .sidebar {
    max-height: 260px;
    flex-direction: row;
    overflow-x: auto;
    padding: 8px;
    gap: 8px;
    -webkit-overflow-scrolling: touch;
  }
  .sidebar > * { min-width: 260px; flex-shrink: 0; }
}

@media (max-width: 768px) {
  .stock-view { overflow-y: auto; overflow-x: hidden; }

  .header { padding: 0 12px; }
  .header-top {
    flex-wrap: wrap;
    height: auto;
    padding: 8px 0;
    gap: 6px;
  }
  .app-title { font-size: 0.9rem; }
  .search-area { max-width: 100%; order: 2; flex-basis: 100%; }
  .search-input { font-size: 0.85rem; padding: 9px 36px 9px 32px; }
  .header-meta {
    display: flex;
    width: 100%;
    justify-content: flex-end;
    gap: 6px;
  }
  .quick-stocks { display: none; }

  .header-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 6px 0;
  }
  .stock-summary { flex-wrap: wrap; gap: 8px; }
  .stock-symbol-display { font-size: 1rem; }
  .stock-price { font-size: 1rem; }
  .stock-change { font-size: 0.8rem; }

  .date-controls { flex-wrap: wrap; gap: 6px; width: 100%; }
  .date-presets { flex-wrap: wrap; gap: 3px; }
  .date-inputs { width: 100%; }
  .date-input { flex: 1; min-width: 0; }

  .content-wrapper {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    overflow-y: auto;
    flex-grow: 1;
  }
  .main-content { min-height: 0; }

  .volume-bar { gap: 12px; padding: 6px 12px; font-size: 0.7rem; }

  .sidebar {
    max-height: none;
    flex-direction: column;
    overflow-x: visible;
    padding: 8px 12px;
    gap: 8px;
  }
  .sidebar > * { min-width: 0; }

  .api-status { margin: 0; font-size: 0.65rem; }
  .api-status-text { max-width: 120px; overflow: hidden; text-overflow: ellipsis; }

  .provider-panel {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    border-radius: 12px 12px 0 0;
    max-height: 70vh;
    overflow-y: auto;
  }

  .error-toast {
    left: 12px;
    right: 12px;
    transform: none;
    max-width: 100%;
    font-size: 0.75rem;
  }

  .suggestions-dropdown { max-height: 240px; }
}

@media (max-width: 480px) {
  .header { padding: 0 8px; }
  .stock-summary { gap: 6px; }
  .stock-name-display { display: none; }
  .change-periods { display: none; }
  .preset-btn { padding: 4px 10px; font-size: 0.7rem; }
  .date-inputs { font-size: 0.65rem; }
  .date-input { padding: 4px 4px; font-size: 0.65rem; }
}
</style>
