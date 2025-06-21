<template>
  <div class="stock-view">
    <header class="header">
      <div class="header-left">
        <h1 class="app-title">StockVue</h1>
        <div class="stock-search">
          <input 
            type="text" 
            v-model="searchQuery" 
            @keyup.enter="updateStockSymbol" 
            placeholder="輸入股票代號..."
            class="search-input"
          />
          <button @click="updateStockSymbol" class="search-button">搜尋</button>
        </div>
      </div>
      <div class="stock-info">
        <div class="info-item">
          <span class="info-label">{{ stockName }}</span>
        </div>
        <div class="info-item">
          <span class="info-value">{{ currentPrice }}</span>
        </div>
        <div class="info-item">
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
      priceChange: '0%',
      ohlcv: [],
      startDate: lastYear.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      stockSymbol: 'AAPL',
      searchQuery: 'AAPL',
      priceChangeRaw: 0,
      rsi: null,
      ma50: null,
      macd: null, 
      signalLine: null,
    };
  },
  computed: {
    chartData() {
      return { ohlcv: this.ohlcv };
    },
    apiUrl() {
      return `https://api.polygon.io/v2/aggs/ticker/${this.stockSymbol}/range/1/day/${this.startDate}/${this.endDate}?adjusted=true&sort=asc&apiKey=Za0nOUx7I57_RcDoZWL5Y4MpwbR5WKM2`;
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
            this.priceChange = '0%';
            this.priceChangeRaw = 0;
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
          this.rsi = null;
          this.ma50 = null;
          this.macd = null;
          this.signalLine = null;
        });
    },
    updateStockInfo(data) {
      if (data.length > 1) {
        const latestData = data[data.length - 1];
        const previousClose = data[data.length - 2].c;
        this.currentPrice = latestData.c.toFixed(2);
        const change = (latestData.c - previousClose) / previousClose;
        this.priceChangeRaw = change;
        this.priceChange = `${change > 0 ? '+' : ''}${(change * 100).toFixed(2)}%`;
      } else if (data.length === 1) {
        this.currentPrice = data[0].c.toFixed(2);
        this.priceChange = '0%';
        this.priceChangeRaw = 0;
      }
    },
    updateStockSymbol() {
      this.stockSymbol = this.searchQuery.toUpperCase();
      this.fetchStockData();
    },
    handleResize() {
      this.chartWidth = window.innerWidth * 0.75;
      this.chartHeight = window.innerHeight - 80; // Adjust height for header
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

.stock-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--background-color, #121212);
  color: var(--text-color, #e0e0e0);
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  overflow: hidden; /* Prevent full-page scroll */
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: var(--header-background, #1e1e1e);
  border-bottom: 1px solid var(--border-color, #424242);
  flex-wrap: wrap;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 20px;
}

.app-title {
  font-size: 1.8rem;
  font-weight: 500;
  color: var(--primary-color, #4db6ac);
  margin: 0;
}

.stock-search {
  display: flex;
  align-items: center;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid var(--border-color, #424242);
  border-radius: 4px 0 0 4px;
  background-color: var(--input-background, #2c2c2c);
  color: var(--text-color, #e0e0e0);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: var(--primary-color, #4db6ac);
}

.search-button {
  padding: 8px 15px;
  border: 1px solid var(--primary-color, #4db6ac);
  border-left: none;
  border-radius: 0 4px 4px 0;
  background-color: var(--primary-color, #4db6ac);
  color: #121212;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-button:hover {
  background-color: #5cc9b5;
}

.stock-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.info-label {
    font-size: 1.5rem;
    font-weight: bold;
}

.info-value {
  font-size: 1.5rem;
  font-weight: 500;
}

.info-change {
  font-size: 1.5rem;
  font-weight: 500;
}

.positive {
  color: var(--positive-color, #4caf50);
}

.negative {
  color: var(--negative-color, #f44336);
}

.neutral {
  color: var(--neutral-color, #9e9e9e);
}

.date-filters {
    display: flex;
    align-items: center;
    gap: 15px;
}

.date-picker {
    display: flex;
    align-items: center;
    gap: 5px;
}

.date-input {
    background-color: var(--input-background, #2c2c2c);
    color: var(--text-color, #e0e0e0);
    border: 1px solid var(--border-color, #424242);
    border-radius: 4px;
    padding: 6px;
}

.content-wrapper {
  display: grid;
  grid-template-columns: 1fr 350px; /* Main content and sidebar */
  flex-grow: 1;
  overflow: hidden;
}

.main-content {
  overflow: hidden; /* Prevents chart from overflowing */
  display: flex; /* Helps contain the chart */
}

.sidebar {
  overflow-y: auto; /* Allow sidebar to scroll if content is too long */
  padding: 10px;
  border-left: 1px solid var(--border-color, #424242);
}
</style>
