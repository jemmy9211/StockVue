<template>
  <div class="stock-view">
    <header class="header">
      <div class="header-left">
        <h1 class="app-title">StockVue</h1>
        <div class="stock-search">
          <div class="search-input-wrapper">
            <input 
              type="text" 
              v-model="searchQuery" 
              @input="handleSearchInput"
              @keyup.enter="updateStockSymbol" 
              @keydown.down="navigateSuggestions('down')"
              @keydown.up="navigateSuggestions('up')"
              @blur="hideSuggestions"
              @focus="showSuggestionsIfAvailable"
              placeholder="輸入股票代號..."
              class="search-input"
              autocomplete="off"
            />
            <div v-if="showSuggestions && suggestions.length > 0" class="suggestions-dropdown">
              <div 
                v-for="(suggestion, index) in suggestions" 
                :key="suggestion.symbol"
                :class="['suggestion-item', { 'highlighted': index === highlightedIndex }]"
                @mousedown="selectSuggestion(suggestion)"
                @mouseenter="highlightedIndex = index"
              >
                <div class="suggestion-symbol">{{ suggestion.symbol }}</div>
                <div class="suggestion-name">{{ suggestion.name }}</div>
              </div>
            </div>
            <div v-if="isLoadingSuggestions" class="loading-suggestions">
              <div class="loading-spinner"></div>
            </div>
          </div>
          <button @click="updateStockSymbol" class="search-button">搜尋</button>
        </div>
      </div>
      <div class="stock-info">
        <div class="info-item">
          <span class="info-label">{{ stockName }}</span>
        </div>
        <div class="info-item">
          <span class="info-value">${{ currentPrice }}</span>
        </div>
        <div class="info-item info-change-container">
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
       <div class="date-filters">
        <div class="date-picker">
          <label for="startDate">開始日期:</label>
          <input type="date" id="startDate" v-model="startDate" @change="fetchStockData" class="date-input">
        </div>
        <div class="date-picker">
          <label for="endDate">結束日期:</label>
          <input type="date" id="endDate" v-model="endDate" @change="fetchStockData" class="date-input">
        </div>
      </div>
    </header>
    <div class="content-wrapper">
      <main class="main-content">
        <trading-vue
          :data="chartData"
          :width="chartWidth"
          :height="chartHeight"
          :color-theme="colorTheme"
        />
      </main>
      <aside class="sidebar">
        <InvestmentAdvisor 
          :rsi="rsi"
          :ma50="ma50"
          :current-price="currentPrice"
          :macd="macd"
          :signal-line="signalLine"
        />
      </aside>
    </div>
  </div>
</template>

<script>
import TradingVue from 'trading-vue-js';
import axios from 'axios';
import InvestmentAdvisor from '@/components/InvestmentAdvisor.vue';

export default {
  name: 'HomeView',
  components: { TradingVue, InvestmentAdvisor },
  data() {
    const today = new Date();
    const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    return {
      chartWidth: window.innerWidth * 0.75, // Adjusted for sidebar
      chartHeight: window.innerHeight - 80, // Adjust height for header
      colorTheme: 'dark',
      stockName: 'AAPL',
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
      selectedChangePeriod: 1,
      changePeriods: [
        { label: '1天', value: 1 },
        { label: '5天', value: 5 },
        { label: '1月', value: 30 },
        { label: '6月', value: 180 }
      ],
    };
  },
  computed: {
    chartData() {
      return { ohlcv: this.ohlcv };
    },
    apiUrl() {
      return `https://api.polygon.io/v2/aggs/ticker/${this.stockSymbol}/range/1/day/${this.startDate}/${this.endDate}?adjusted=true&sort=asc&apiKey=Za0nOUx7I57_RcDoZWL5Y4MpwbR5WKM2`;
    },
    priceChangeRaw() {
      if (!this.ohlcv || this.ohlcv.length < 2) return 0;
      
      const latestPrice = this.ohlcv[this.ohlcv.length - 1][4]; // Close price
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
    }
  },
  methods: {
    calculateIndicators() {
      if (!this.ohlcv) {
        this.rsi = this.ma50 = this.macd = this.signalLine = null;
        return;
      }

      const closePrices = this.ohlcv.map(d => d[4]);

      // --- 50-day Moving Average ---
      if (closePrices.length >= 50) {
        const sum = closePrices.slice(-50).reduce((a, b) => a + b, 0);
        this.ma50 = (sum / 50).toFixed(2);
      } else {
        this.ma50 = null;
      }

      // --- 14-day RSI ---
      if (closePrices.length >= 15) { // Need 14 price changes
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

      // --- MACD ---
      if (closePrices.length < 35) { // Need at least 26 for EMA26 + 9 for Signal Line EMA
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
    fetchStockData() {
      if (!this.stockSymbol) return;
      axios
        .get(this.apiUrl)
        .then((res) => {
          if (res.data && res.data.results && res.data.results.length > 0) {
            const data = res.data.results;
            this.ohlcv = data.map(item => [item.t, item.o, item.h, item.l, item.c, item.v]);
            this.updateStockInfo(data);
            this.stockName = res.data.ticker;
            this.calculateIndicators();
          } else {
            console.warn("API回傳無效或空的資料:", res.data);
            this.ohlcv = [];
            this.stockName = `${this.stockSymbol} (找不到資料)`;
            this.currentPrice = 0;
            this.rsi = null;
            this.ma50 = null;
            this.macd = null;
            this.signalLine = null;
          }
        })
        .catch((error) => {
          console.error("下載股票資料時發生錯誤:", error);
          this.ohlcv = [];
          this.stockName = `${this.stockSymbol} (載入失敗)`;
          this.currentPrice = 0;
          this.rsi = null;
          this.ma50 = null;
          this.macd = null;
          this.signalLine = null;
        });
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
      this.chartWidth = window.innerWidth * 0.75;
      this.chartHeight = window.innerHeight - 80; // Adjust height for header
    },
    async handleSearchInput() {
      const query = this.searchQuery.trim();
      
      // Clear previous timeout
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      
      // If query is too short, hide suggestions
      if (query.length < 1) {
        this.suggestions = [];
        this.showSuggestions = false;
        return;
      }
      
      // Debounce the search
      this.searchTimeout = setTimeout(async () => {
        this.isLoadingSuggestions = true;
        try {
          const upperQuery = query.toUpperCase();
          const response = await axios.get(
            `https://api.polygon.io/v3/reference/tickers?ticker.gte=${upperQuery}&ticker.lt=${upperQuery}Z&active=true&limit=50&apiKey=Za0nOUx7I57_RcDoZWL5Y4MpwbR5WKM2`
          );
          
          if (response.data && response.data.results) {
            // Filter results to only show tickers that start with the query
            const filteredResults = response.data.results
              .filter(item => item.ticker.startsWith(upperQuery))
              .slice(0, 10);
            
            this.suggestions = filteredResults.map(item => ({
              symbol: item.ticker,
              name: item.name
            }));
            this.showSuggestions = true;
            this.highlightedIndex = -1;
          }
        } catch (error) {
          console.error('Error fetching suggestions:', error);
          this.suggestions = [];
        } finally {
          this.isLoadingSuggestions = false;
        }
      }, 300); // 300ms debounce
    },
    selectSuggestion(suggestion) {
      this.searchQuery = suggestion.symbol;
      this.showSuggestions = false;
      this.suggestions = [];
      this.highlightedIndex = -1;
      this.updateStockSymbol();
    },
    navigateSuggestions(direction) {
      if (!this.showSuggestions || this.suggestions.length === 0) return;
      
      if (direction === 'down') {
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.suggestions.length - 1);
      } else if (direction === 'up') {
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
      }
      
      // If an item is highlighted, update search query
      if (this.highlightedIndex >= 0) {
        this.searchQuery = this.suggestions[this.highlightedIndex].symbol;
      }
    },
    hideSuggestions() {
      // Delay to allow click events to fire
      setTimeout(() => {
        this.showSuggestions = false;
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
  --positive-color: #4caf50;
  --negative-color: #f44336;
  --neutral-color: #9e9e9e;
  --input-background: #2c2c2c;
  --border-color: #424242;
}

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
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.stock-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: transparent;
  color: var(--text-color, #e0e0e0);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  overflow: hidden;
  animation: slideInFromTop 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: rgba(30, 30, 46, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(77, 182, 172, 0.2);
  flex-wrap: wrap;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
  animation: slideInFromTop 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 50;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.app-title {
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, #4db6ac 0%, #26a69a 50%, #00897b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  text-shadow: 0 0 30px rgba(77, 182, 172, 0.5);
  letter-spacing: 1px;
}

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

.search-input {
  padding: 10px 14px;
  border: 2px solid rgba(77, 182, 172, 0.3);
  border-radius: 8px 0 0 8px;
  background: rgba(44, 44, 60, 0.6);
  backdrop-filter: blur(10px);
  color: var(--text-color, #e0e0e0);
  font-size: 1rem;
  outline: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 250px;
}

.search-input:focus {
  border-color: var(--primary-color, #4db6ac);
  box-shadow: 0 0 20px rgba(77, 182, 172, 0.3);
  transform: translateY(-1px);
}

.search-input::placeholder {
  color: rgba(224, 224, 224, 0.4);
}

.suggestions-dropdown {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  right: 0;
  background: rgba(30, 30, 46, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(77, 182, 172, 0.3);
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 9999;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
              0 0 40px rgba(77, 182, 172, 0.1);
  animation: slideInFromTop 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.suggestion-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-bottom: 1px solid rgba(77, 182, 172, 0.1);
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover,
.suggestion-item.highlighted {
  background: rgba(77, 182, 172, 0.15);
  transform: translateX(5px);
}

.suggestion-symbol {
  font-weight: 700;
  font-size: 1rem;
  color: #4db6ac;
  margin-bottom: 4px;
  text-shadow: 0 0 10px rgba(77, 182, 172, 0.3);
}

.suggestion-name {
  font-size: 0.85rem;
  color: rgba(224, 224, 224, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.loading-suggestions {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(77, 182, 172, 0.3);
  border-top-color: #4db6ac;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.search-button {
  padding: 10px 20px;
  border: 2px solid var(--primary-color, #4db6ac);
  border-left: none;
  border-radius: 0 8px 8px 0;
  background: linear-gradient(135deg, #4db6ac 0%, #26a69a 100%);
  color: #0a0e27;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
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

.search-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(77, 182, 172, 0.4);
}

.search-button:hover::before {
  left: 100%;
}

.search-button:active {
  transform: translateY(0);
}

.stock-info {
  display: flex;
  align-items: center;
  gap: 20px;
  animation: slideInFromTop 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.2s backwards;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 10px 15px;
  border-radius: 8px;
  background: rgba(44, 44, 60, 0.4);
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.info-item:hover {
  transform: translateY(-3px);
  background: rgba(44, 44, 60, 0.6);
  box-shadow: 0 5px 25px rgba(0, 0, 0, 0.3);
}

.info-change-container {
  gap: 8px;
  align-items: center;
}

.change-period-selector {
  display: flex;
  gap: 4px;
  background: rgba(26, 26, 46, 0.5);
  border-radius: 6px;
  padding: 3px;
}

.period-btn {
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(224, 224, 224, 0.6);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.3px;
}

.period-btn:hover {
  color: rgba(224, 224, 224, 0.9);
  background: rgba(77, 182, 172, 0.1);
}

.period-btn.active {
  background: linear-gradient(135deg, #4db6ac 0%, #26a69a 100%);
  color: #0a0e27;
  box-shadow: 0 2px 8px rgba(77, 182, 172, 0.3);
}

.info-label {
  font-size: 1.5rem;
  font-weight: 700;
  text-shadow: 0 2px 10px rgba(77, 182, 172, 0.3);
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 1.5rem;
  font-weight: 600;
  text-shadow: 0 2px 10px rgba(255, 255, 255, 0.2);
}

.info-change {
  font-size: 1.5rem;
  font-weight: 700;
  animation: pulse 2s ease-in-out infinite;
}

.positive {
  color: var(--positive-color, #4caf50);
  text-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
}

.negative {
  color: var(--negative-color, #f44336);
  text-shadow: 0 0 20px rgba(244, 67, 54, 0.5);
}

.neutral {
  color: var(--neutral-color, #9e9e9e);
}

.date-filters {
  display: flex;
  align-items: center;
  gap: 15px;
  animation: slideInFromTop 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.3s backwards;
}

.date-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(44, 44, 60, 0.4);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.date-picker:hover {
  background: rgba(44, 44, 60, 0.6);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
}

.date-picker label {
  color: rgba(224, 224, 224, 0.7);
  font-size: 0.9rem;
  font-weight: 500;
}

.date-input {
  background: rgba(26, 26, 46, 0.6);
  color: var(--text-color, #e0e0e0);
  border: 2px solid rgba(77, 182, 172, 0.3);
  border-radius: 6px;
  padding: 8px 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.9rem;
}

.date-input:focus {
  outline: none;
  border-color: var(--primary-color, #4db6ac);
  box-shadow: 0 0 15px rgba(77, 182, 172, 0.3);
}

.date-input::-webkit-calendar-picker-indicator {
  filter: invert(0.8);
  cursor: pointer;
}

.content-wrapper {
  display: grid;
  grid-template-columns: 1fr 380px;
  flex-grow: 1;
  overflow: hidden;
  gap: 15px;
  padding: 15px;
  animation: slideInFromTop 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.4s backwards;
  position: relative;
  z-index: 1;
}

.main-content {
  overflow: hidden;
  display: flex;
  border-radius: 16px;
  background: rgba(30, 30, 46, 0.4);
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
  transform: translateY(-2px);
}

.sidebar {
  overflow-y: auto;
  padding: 0;
  border: none;
  animation: slideInFromTop 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.5s backwards;
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .content-wrapper {
    grid-template-columns: 1fr 320px;
  }
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }
  
  .stock-info {
    justify-content: space-around;
  }
  
  .content-wrapper {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .sidebar {
    max-height: 400px;
  }
}
</style>
