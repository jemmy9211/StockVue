<template>
  <div class="stock-view">
    <!-- Loading Overlay -->
    <transition name="fade">
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner-container">
          <div class="loading-spinner-ring"></div>
          <div class="loading-spinner-ring"></div>
          <div class="loading-spinner-ring"></div>
          <span class="loading-text">載入中...</span>
        </div>
      </div>
    </transition>

    <!-- API Status Indicator -->
    <div class="api-status" :class="apiStatusClass">
      <span class="api-status-dot"></span>
      <span class="api-status-text">{{ apiStatusText }}</span>
    </div>

    <header class="header">
      <div class="header-left">
        <h1 class="app-title">
          <span class="title-icon">📈</span>
          StockVue
          <span class="title-badge">Pro</span>
        </h1>
        <div class="stock-search">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              v-model="searchQuery" 
              @input="handleSearchInput"
              @keyup.enter="updateStockSymbol" 
              @keydown.down="navigateSuggestions('down')"
              @keydown.up="navigateSuggestions('up')"
              @blur="hideSuggestions"
              @focus="showSuggestionsIfAvailable"
              placeholder="輸入股票代號 (如: AAPL, TSLA)..."
              class="search-input"
              autocomplete="off"
            />
            <div v-if="showSuggestions && suggestions.length > 0" class="suggestions-dropdown">
              <div class="suggestions-header">搜尋結果</div>
              <div 
                v-for="(suggestion, index) in suggestions" 
                :key="suggestion.symbol"
                :class="['suggestion-item', { 'highlighted': index === highlightedIndex }]"
                @mousedown="selectSuggestion(suggestion)"
                @mouseenter="highlightedIndex = index"
              >
                <div class="suggestion-icon">📊</div>
                <div class="suggestion-content">
                  <div class="suggestion-symbol">{{ suggestion.symbol }}</div>
                  <div class="suggestion-name">{{ suggestion.name }}</div>
                </div>
                <div class="suggestion-arrow">→</div>
              </div>
            </div>
            <div v-else-if="noResults && !isLoadingSuggestions && searchQuery.trim().length > 0" class="suggestions-dropdown">
              <div class="suggestion-item no-results">
                <span class="no-results-icon">🔎</span>
                沒有符合 "{{ searchQuery.toUpperCase() }}" 的結果
              </div>
            </div>
          </div>
          <button @click="updateStockSymbol" class="search-button" :disabled="isLoading">
            <span v-if="!isLoading">搜尋</span>
            <span v-else class="btn-loading"></span>
          </button>
        </div>
      </div>

      <!-- Quick Select Popular Stocks -->
      <div class="quick-select">
        <span class="quick-label">熱門:</span>
        <button 
          v-for="stock in popularStocks" 
          :key="stock"
          @click="quickSelectStock(stock)"
          :class="['quick-btn', { 'active': stockSymbol === stock }]"
        >
          {{ stock }}
        </button>
      </div>

      <div class="stock-info">
        <div class="info-card">
          <span class="info-icon">🏢</span>
          <div class="info-content">
            <span class="info-title">股票名稱</span>
            <span class="info-label">{{ stockName }}</span>
          </div>
        </div>
        <div class="info-card price-card">
          <span class="info-icon">💰</span>
          <div class="info-content">
            <span class="info-title">目前價格</span>
            <span class="info-value">${{ currentPrice }}</span>
          </div>
        </div>
        <div class="info-card change-card">
          <span class="info-icon" :class="priceChangeClass">{{ priceChangeRaw >= 0 ? '📈' : '📉' }}</span>
          <div class="info-content">
            <div class="change-period-selector">
              <button 
                v-for="period in changePeriods" 
                :key="period.value"
                :class="['period-btn', { 'active': selectedChangePeriod === period.value }]"
                @click="selectedChangePeriod = period.value"
              >
                {{ period.label }}
              </button>
            </div>
            <span class="info-change" :class="priceChangeClass">{{ priceChange }}</span>
          </div>
        </div>
      </div>

      <div class="date-filters">
        <div class="date-picker">
          <span class="date-icon">📅</span>
          <label for="startDate">開始:</label>
          <input type="date" id="startDate" v-model="startDate" @change="fetchStockData" class="date-input">
        </div>
        <div class="date-picker">
          <span class="date-icon">📅</span>
          <label for="endDate">結束:</label>
          <input type="date" id="endDate" v-model="endDate" @change="fetchStockData" class="date-input">
        </div>
        <button @click="setDateRange('1M')" class="date-preset-btn">1M</button>
        <button @click="setDateRange('3M')" class="date-preset-btn">3M</button>
        <button @click="setDateRange('6M')" class="date-preset-btn">6M</button>
        <button @click="setDateRange('1Y')" class="date-preset-btn active">1Y</button>
        <button @click="setDateRange('YTD')" class="date-preset-btn">YTD</button>
      </div>
    </header>
    <div class="content-wrapper">
      <main class="main-content">
        <!-- Market Summary Bar -->
        <div class="market-summary">
          <div class="market-item" v-for="item in marketSummary" :key="item.symbol">
            <span class="market-symbol">{{ item.symbol }}</span>
            <span class="market-price">{{ item.price }}</span>
            <span :class="['market-change', item.change >= 0 ? 'positive' : 'negative']">
              {{ item.change >= 0 ? '+' : '' }}{{ item.change }}%
            </span>
          </div>
        </div>
        <div class="chart-container">
          <trading-vue
            :data="chartData"
            :width="chartWidth"
            :height="chartHeight"
            :color-theme="colorTheme"
          />
        </div>
        <!-- Volume Info -->
        <div class="volume-info" v-if="latestVolume">
          <span class="volume-label">📊 成交量:</span>
          <span class="volume-value">{{ formatVolume(latestVolume) }}</span>
          <span class="volume-label">| 📈 最高:</span>
          <span class="volume-value high">${{ latestHigh }}</span>
          <span class="volume-label">| 📉 最低:</span>
          <span class="volume-value low">${{ latestLow }}</span>
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
        <!-- Stock Stats Card -->
        <div class="stats-card">
          <h4 class="stats-title">📊 股票統計</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">52週最高</span>
              <span class="stat-value">${{ week52High || '--' }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">52週最低</span>
              <span class="stat-value">${{ week52Low || '--' }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">平均成交量</span>
              <span class="stat-value">{{ formatVolume(avgVolume) || '--' }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">數據天數</span>
              <span class="stat-value">{{ ohlcv.length }} 天</span>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Error Toast -->
    <transition name="slide-up">
      <div v-if="errorMessage" class="error-toast">
        <span class="error-icon">⚠️</span>
        {{ errorMessage }}
        <button @click="errorMessage = ''" class="error-close">✕</button>
      </div>
    </transition>
  </div>
</template>

<script>
import TradingVue from 'trading-vue-js';
import axios from 'axios';
import InvestmentAdvisor from '@/components/InvestmentAdvisor.vue';
import { COMMON_TICKERS } from '@/data/tickers.js';

export default {
  name: 'HomeView',
  components: { TradingVue, InvestmentAdvisor },
  data() {
    const today = new Date();
    const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    return {
      chartWidth: window.innerWidth * 0.72,
      chartHeight: window.innerHeight - 200,
      colorTheme: 'dark',
      stockName: 'Apple Inc.',
      currentPrice: 0,
      ohlcv: [],
      startDate: lastYear.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      stockSymbol: 'AAPL',
      searchQuery: 'AAPL',
      rsi: null,
      ma50: null,
      macd: null, 
      signalLine: null,
      suggestions: [],
      showSuggestions: false,
      isLoadingSuggestions: false,
      highlightedIndex: -1,
      searchTimeout: null,
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
      // API configuration - supports multiple providers
      apiProviders: {
        polygon: {
          name: 'Polygon.io',
          baseUrl: 'https://api.polygon.io/v2/aggs/ticker',
          apiKey: 'Za0nOUx7I57_RcDoZWL5Y4MpwbR5WKM2',
          rateLimit: '5 calls/min',
        },
        finnhub: {
          name: 'Finnhub',
          baseUrl: 'https://finnhub.io/api/v1',
          apiKey: '', // Add your Finnhub API key here (free tier: 60 calls/min)
          rateLimit: '60 calls/min',
        },
        alphavantage: {
          name: 'Alpha Vantage',
          baseUrl: 'https://www.alphavantage.co/query',
          apiKey: '', // Add your Alpha Vantage API key here (free tier: 25 calls/day)
          rateLimit: '25 calls/day',
        },
        twelvedata: {
          name: 'Twelve Data',
          baseUrl: 'https://api.twelvedata.com',
          apiKey: '', // Add your Twelve Data API key here (free tier: 800 calls/day)
          rateLimit: '800 calls/day',
        }
      },
      currentApiProvider: 'polygon',
    };
  },
  computed: {
    chartData() {
      return { ohlcv: this.ohlcv };
    },
    apiUrl() {
      const provider = this.apiProviders[this.currentApiProvider];
      if (this.currentApiProvider === 'polygon') {
        return `${provider.baseUrl}/${this.stockSymbol}/range/1/day/${this.startDate}/${this.endDate}?adjusted=true&sort=asc&apiKey=${provider.apiKey}`;
      }
      // Add other provider URL patterns here
      return '';
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
      const statusMessages = {
        ok: `${provider.name} 連線正常`,
        warning: `${provider.name} 額度偏低`,
        error: `${provider.name} 連線失敗`
      };
      return statusMessages[this.apiStatus];
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
    async fetchStockData() {
      if (!this.stockSymbol) return;
      
      this.isLoading = true;
      this.errorMessage = '';
      
      try {
        const res = await axios.get(this.apiUrl);
        
        if (res.data && res.data.results && res.data.results.length > 0) {
          const data = res.data.results;
          this.ohlcv = data.map(item => [item.t, item.o, item.h, item.l, item.c, item.v]);
          this.updateStockInfo(data);
          this.stockName = this.getStockFullName(res.data.ticker);
          this.calculateIndicators();
          this.apiStatus = 'ok';
        } else {
          this.ohlcv = [];
          this.stockName = `${this.stockSymbol} (找不到資料)`;
          this.currentPrice = 0;
          this.rsi = null;
          this.ma50 = null;
          this.macd = null;
          this.signalLine = null;
          this.apiStatus = 'warning';
          this.errorMessage = '找不到該股票的資料，請確認股票代號是否正確';
        }
      } catch (error) {
        console.error("下載股票資料時發生錯誤:", error);
        this.ohlcv = [];
        this.stockName = `${this.stockSymbol} (載入失敗)`;
        this.currentPrice = 0;
        this.rsi = null;
        this.ma50 = null;
        this.macd = null;
        this.signalLine = null;
        this.apiStatus = 'error';
        
        if (error.response?.status === 429) {
          this.errorMessage = 'API 請求次數已達上限，請稍後再試或切換 API 來源';
        } else {
          this.errorMessage = '載入資料時發生錯誤，請檢查網路連線';
        }
      } finally {
        this.isLoading = false;
      }
    },
    getStockFullName(symbol) {
      const ticker = COMMON_TICKERS.find(t => t.symbol === symbol);
      return ticker ? ticker.name : symbol;
    },
    updateStockInfo(data) {
      if (data.length >= 1) {
        const latestData = data[data.length - 1];
        this.currentPrice = latestData.c.toFixed(2);
      }
    },
    updateStockSymbol() {
      this.stockSymbol = this.searchQuery.toUpperCase();
      this.showSuggestions = false;
      this.suggestions = [];
      this.fetchStockData();
    },
    handleResize() {
      this.chartWidth = window.innerWidth * 0.72;
      this.chartHeight = window.innerHeight - 200;
    },
    handleSearchInput() {
      const query = this.searchQuery.trim().toUpperCase();

      if (this.searchTimeout) clearTimeout(this.searchTimeout);

      if (query.length === 0) {
        this.suggestions = [];
        this.showSuggestions = false;
        this.noResults = false;
        return;
      }

      this.searchTimeout = setTimeout(() => {
        // 搜尋邏輯：先匹配代號開頭，再匹配代號包含，最後匹配名稱包含
        const prefix = COMMON_TICKERS.filter(t => t.symbol.startsWith(query));
        const symbolContains = COMMON_TICKERS.filter(t => 
          !t.symbol.startsWith(query) && t.symbol.includes(query));
        const nameContains = COMMON_TICKERS.filter(t => 
          !t.symbol.startsWith(query) && 
          !t.symbol.includes(query) && 
          t.name.toUpperCase().includes(query));
        const merged = [...prefix, ...symbolContains, ...nameContains].slice(0, 15);

        this.suggestions = merged;
        this.showSuggestions = merged.length > 0;
        this.noResults = merged.length === 0;
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
      this.updateStockSymbol();
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
        this.highlightedIndex = -1;
        if (this.searchQuery.trim().length === 0) {
          this.noResults = false;
        }
      }, 200);
    },
    showSuggestionsIfAvailable() {
      if (this.suggestions.length > 0) {
        this.showSuggestions = true;
      }
    }
  },
  created() {
    this.fetchStockData();
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
  },
};
</script>

<style scoped>
:root {
  --background-color: #121212;
  --header-background: #1e1e1e;
  --text-color: #e0e0e0;
  --primary-color: #4db6ac;
  --primary-dark: #26a69a;
  --positive-color: #4caf50;
  --negative-color: #f44336;
  --neutral-color: #9e9e9e;
  --input-background: #2c2c2c;
  --border-color: #424242;
  --glass-bg: rgba(30, 30, 46, 0.6);
  --glass-border: rgba(77, 182, 172, 0.2);
}

/* Animations */
@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(77, 182, 172, 0.3),
                0 0 40px rgba(77, 182, 172, 0.2),
                0 0 60px rgba(77, 182, 172, 0.1);
  }
  50% {
    box-shadow: 0 0 30px rgba(77, 182, 172, 0.5),
                0 0 60px rgba(77, 182, 172, 0.3),
                0 0 90px rgba(77, 182, 172, 0.2);
  }
}

@keyframes slideInFromTop {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter, .slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 14, 39, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-spinner-container {
  position: relative;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid transparent;
  animation: spin 1.5s linear infinite;
}

.loading-spinner-ring:nth-child(1) {
  border-top-color: #4db6ac;
  animation-delay: 0s;
}

.loading-spinner-ring:nth-child(2) {
  width: 80%;
  height: 80%;
  border-right-color: #26a69a;
  animation-delay: 0.15s;
  animation-direction: reverse;
}

.loading-spinner-ring:nth-child(3) {
  width: 60%;
  height: 60%;
  border-bottom-color: #00897b;
  animation-delay: 0.3s;
}

.loading-text {
  font-size: 0.9rem;
  color: rgba(77, 182, 172, 0.9);
  font-weight: 600;
  letter-spacing: 1px;
}

/* API Status Indicator */
.api-status {
  position: fixed;
  top: 10px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  backdrop-filter: blur(10px);
  z-index: 100;
  animation: fadeIn 0.5s ease;
}

.api-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

.status-ok {
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid rgba(76, 175, 80, 0.4);
  color: #4caf50;
}

.status-ok .api-status-dot {
  background: #4caf50;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.6);
}

.status-warning {
  background: rgba(255, 152, 0, 0.2);
  border: 1px solid rgba(255, 152, 0, 0.4);
  color: #ff9800;
}

.status-warning .api-status-dot {
  background: #ff9800;
  box-shadow: 0 0 10px rgba(255, 152, 0, 0.6);
}

.status-error {
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.4);
  color: #f44336;
}

.status-error .api-status-dot {
  background: #f44336;
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.6);
}

/* Error Toast */
.error-toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(244, 67, 54, 0.95);
  color: white;
  padding: 16px 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 8px 32px rgba(244, 67, 54, 0.4);
  z-index: 1000;
  max-width: 90%;
}

.error-icon {
  font-size: 1.2rem;
}

.error-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  transition: background 0.2s;
}

.error-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Main Layout */
.stock-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: transparent;
  color: var(--text-color, #e0e0e0);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  overflow: hidden;
  animation: fadeIn 0.5s ease;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: rgba(30, 30, 46, 0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(77, 182, 172, 0.15);
  flex-wrap: wrap;
  gap: 12px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
  animation: slideInFromTop 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 50;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.app-title {
  font-size: 1.6rem;
  font-weight: 800;
  background: linear-gradient(135deg, #4db6ac 0%, #26a69a 50%, #00897b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.5px;
}

.title-icon {
  font-size: 1.4rem;
  animation: float 3s ease-in-out infinite;
}

.title-badge {
  font-size: 0.6rem;
  background: linear-gradient(135deg, #4db6ac, #26a69a);
  -webkit-background-clip: unset;
  -webkit-text-fill-color: #0a0e27;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* Quick Select */
.quick-select {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(44, 44, 60, 0.4);
  border-radius: 10px;
  animation: slideInFromTop 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}

.quick-label {
  font-size: 0.8rem;
  color: rgba(224, 224, 224, 0.6);
  font-weight: 500;
}

.quick-btn {
  padding: 6px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid rgba(77, 182, 172, 0.3);
  border-radius: 6px;
  background: transparent;
  color: rgba(224, 224, 224, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-btn:hover {
  background: rgba(77, 182, 172, 0.15);
  border-color: rgba(77, 182, 172, 0.5);
  transform: translateY(-2px);
}

.quick-btn.active {
  background: linear-gradient(135deg, #4db6ac 0%, #26a69a 100%);
  color: #0a0e27;
  border-color: transparent;
  box-shadow: 0 2px 10px rgba(77, 182, 172, 0.4);
}

/* Search */
.stock-search {
  display: flex;
  align-items: center;
  position: relative;
  z-index: 100;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  z-index: 100;
}

.search-icon {
  position: absolute;
  left: 14px;
  font-size: 1rem;
  z-index: 1;
  opacity: 0.7;
}

.search-input {
  padding: 12px 14px 12px 42px;
  border: 2px solid rgba(77, 182, 172, 0.3);
  border-radius: 10px 0 0 10px;
  background: rgba(44, 44, 60, 0.6);
  backdrop-filter: blur(10px);
  color: var(--text-color, #e0e0e0);
  font-size: 0.95rem;
  outline: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 280px;
}

.search-input:focus {
  border-color: var(--primary-color, #4db6ac);
  box-shadow: 0 0 20px rgba(77, 182, 172, 0.3);
  transform: translateY(-1px);
}

.search-input::placeholder {
  color: rgba(224, 224, 224, 0.4);
}

/* Suggestions Dropdown */
.suggestions-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: rgba(30, 30, 46, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(77, 182, 172, 0.3);
  border-radius: 12px;
  max-height: 450px;
  overflow-y: auto;
  z-index: 9999;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5),
              0 0 50px rgba(77, 182, 172, 0.1);
  animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.suggestions-header {
  padding: 12px 16px;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(77, 182, 172, 0.8);
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(77, 182, 172, 0.1);
}

.suggestion-item {
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-bottom: 1px solid rgba(77, 182, 172, 0.08);
  display: flex;
  align-items: center;
  gap: 12px;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover,
.suggestion-item.highlighted {
  background: rgba(77, 182, 172, 0.12);
  transform: translateX(4px);
}

.suggestion-icon {
  font-size: 1.2rem;
  opacity: 0.7;
}

.suggestion-content {
  flex: 1;
}

.suggestion-symbol {
  font-weight: 700;
  font-size: 1rem;
  color: #4db6ac;
  margin-bottom: 2px;
}

.suggestion-name {
  font-size: 0.8rem;
  color: rgba(224, 224, 224, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-arrow {
  color: rgba(77, 182, 172, 0.5);
  opacity: 0;
  transition: all 0.2s;
}

.suggestion-item:hover .suggestion-arrow,
.suggestion-item.highlighted .suggestion-arrow {
  opacity: 1;
  transform: translateX(4px);
}

.suggestion-item.no-results {
  cursor: default;
  opacity: 0.6;
  display: flex;
  align-items: center;
  gap: 8px;
}

.no-results-icon {
  font-size: 1.1rem;
}

/* Search Button */
.search-button {
  padding: 12px 24px;
  border: 2px solid var(--primary-color, #4db6ac);
  border-left: none;
  border-radius: 0 10px 10px 0;
  background: linear-gradient(135deg, #4db6ac 0%, #26a69a 100%);
  color: #0a0e27;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  min-width: 80px;
}

.search-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.search-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s;
}

.search-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(77, 182, 172, 0.4);
}

.search-button:hover:not(:disabled)::before {
  left: 100%;
}

.btn-loading {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(10, 14, 39, 0.3);
  border-top-color: #0a0e27;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

/* Stock Info Cards */
.stock-info {
  display: flex;
  align-items: stretch;
  gap: 12px;
  animation: slideInFromTop 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.2s backwards;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-radius: 12px;
  background: rgba(44, 44, 60, 0.5);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(77, 182, 172, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.info-card:hover {
  transform: translateY(-3px);
  background: rgba(44, 44, 60, 0.7);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
  border-color: rgba(77, 182, 172, 0.3);
}

.info-icon {
  font-size: 1.4rem;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-title {
  font-size: 0.7rem;
  color: rgba(224, 224, 224, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.info-label {
  font-size: 1.1rem;
  font-weight: 700;
  color: #e0e0e0;
  letter-spacing: 0.3px;
}

.info-value {
  font-size: 1.3rem;
  font-weight: 700;
  background: linear-gradient(135deg, #fff 0%, #e0e0e0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.change-card .info-content {
  gap: 6px;
}

.change-period-selector {
  display: flex;
  gap: 3px;
  background: rgba(26, 26, 46, 0.6);
  border-radius: 6px;
  padding: 2px;
}

.period-btn {
  padding: 4px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(224, 224, 224, 0.5);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.period-btn:hover {
  color: rgba(224, 224, 224, 0.8);
  background: rgba(77, 182, 172, 0.1);
}

.period-btn.active {
  background: linear-gradient(135deg, #4db6ac 0%, #26a69a 100%);
  color: #0a0e27;
  box-shadow: 0 2px 6px rgba(77, 182, 172, 0.3);
}

.info-change {
  font-size: 1.2rem;
  font-weight: 700;
  animation: pulse 2s ease-in-out infinite;
}

.positive {
  color: var(--positive-color, #4caf50);
  text-shadow: 0 0 15px rgba(76, 175, 80, 0.4);
}

.negative {
  color: var(--negative-color, #f44336);
  text-shadow: 0 0 15px rgba(244, 67, 54, 0.4);
}

.neutral {
  color: var(--neutral-color, #9e9e9e);
}

/* Date Filters */
.date-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  animation: slideInFromTop 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.3s backwards;
}

.date-picker {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(44, 44, 60, 0.4);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.date-picker:hover {
  background: rgba(44, 44, 60, 0.6);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.date-icon {
  font-size: 0.9rem;
}

.date-picker label {
  color: rgba(224, 224, 224, 0.6);
  font-size: 0.8rem;
  font-weight: 500;
}

.date-input {
  background: rgba(26, 26, 46, 0.6);
  color: var(--text-color, #e0e0e0);
  border: 1px solid rgba(77, 182, 172, 0.2);
  border-radius: 6px;
  padding: 6px 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.85rem;
}

.date-input:focus {
  outline: none;
  border-color: var(--primary-color, #4db6ac);
  box-shadow: 0 0 12px rgba(77, 182, 172, 0.3);
}

.date-input::-webkit-calendar-picker-indicator {
  filter: invert(0.8);
  cursor: pointer;
}

.date-preset-btn {
  padding: 8px 14px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid rgba(77, 182, 172, 0.3);
  border-radius: 6px;
  background: transparent;
  color: rgba(224, 224, 224, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
}

.date-preset-btn:hover {
  background: rgba(77, 182, 172, 0.15);
  border-color: rgba(77, 182, 172, 0.5);
}

.date-preset-btn.active {
  background: linear-gradient(135deg, #4db6ac 0%, #26a69a 100%);
  color: #0a0e27;
  border-color: transparent;
}

/* Content Wrapper */
.content-wrapper {
  display: grid;
  grid-template-columns: 1fr 400px;
  flex-grow: 1;
  overflow: hidden;
  gap: 16px;
  padding: 16px;
  animation: fadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.4s backwards;
  position: relative;
  z-index: 1;
}

/* Main Content */
.main-content {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: rgba(30, 30, 46, 0.5);
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(77, 182, 172, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 1;
}

.main-content:hover {
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4),
              0 0 40px rgba(77, 182, 172, 0.1);
}

/* Market Summary */
.market-summary {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 10px 20px;
  background: rgba(26, 26, 46, 0.6);
  border-bottom: 1px solid rgba(77, 182, 172, 0.1);
}

.market-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
}

.market-symbol {
  color: rgba(224, 224, 224, 0.6);
  font-weight: 500;
}

.market-price {
  color: #e0e0e0;
  font-weight: 600;
}

.market-change {
  font-weight: 700;
  font-size: 0.8rem;
}

/* Chart Container */
.chart-container {
  flex: 1;
  overflow: hidden;
}

/* Volume Info */
.volume-info {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: rgba(26, 26, 46, 0.6);
  border-top: 1px solid rgba(77, 182, 172, 0.1);
  font-size: 0.85rem;
}

.volume-label {
  color: rgba(224, 224, 224, 0.6);
}

.volume-value {
  color: #e0e0e0;
  font-weight: 600;
}

.volume-value.high {
  color: #4caf50;
}

.volume-value.low {
  color: #f44336;
}

/* Sidebar */
.sidebar {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0;
  animation: slideInFromTop 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.5s backwards;
}

/* Stats Card */
.stats-card {
  background: rgba(30, 30, 46, 0.6);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(77, 182, 172, 0.2);
  animation: slideUp 0.6s ease 0.3s backwards;
}

.stats-title {
  color: rgba(224, 224, 224, 0.9);
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-item {
  background: rgba(44, 44, 60, 0.5);
  padding: 12px;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.stat-item:hover {
  background: rgba(44, 44, 60, 0.7);
  transform: translateY(-2px);
}

.stat-label {
  display: block;
  font-size: 0.7rem;
  color: rgba(224, 224, 224, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.stat-value {
  display: block;
  font-size: 1rem;
  font-weight: 700;
  color: #e0e0e0;
}

/* Responsive */
@media (max-width: 1400px) {
  .content-wrapper {
    grid-template-columns: 1fr 350px;
  }
  
  .quick-select {
    display: none;
  }
}

@media (max-width: 1200px) {
  .content-wrapper {
    grid-template-columns: 1fr 320px;
  }
  
  .header {
    padding: 10px 16px;
  }
  
  .stock-info {
    flex-wrap: wrap;
  }
}

@media (max-width: 992px) {
  .content-wrapper {
    grid-template-columns: 1fr;
  }
  
  .sidebar {
    max-height: 450px;
    flex-direction: row;
    overflow-x: auto;
  }
  
  .sidebar > * {
    min-width: 350px;
  }
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .header-left {
    flex-direction: column;
    align-items: stretch;
  }
  
  .app-title {
    justify-content: center;
  }
  
  .stock-info {
    justify-content: center;
  }
  
  .date-filters {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .search-input {
    min-width: 200px;
  }
  
  .market-summary {
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .api-status {
    position: static;
    margin: 0 auto;
  }
}
</style>
