<template>
    <div class="stock-container container-fluid">
      <nav class="navigation-bar">
        <div class="nav-item title">
          <h1>{{ stockName }}</h1>
        </div>
        <div class="nav-item">
          <p>當前價格: {{ currentPrice }}</p>
        </div>
        <div class="nav-item">
          <p>漲跌幅: {{ priceChange }}</p>
        </div>
        <div class="nav-item">
          <div class="stock-picker input-group">
            <label for="stockSymbol" class="input-label">股票代號：</label>
            <select id="stockSymbol" v-model="stockSymbol" @change="fetchStockData" class="input-field">
              <option value="AAPL">AAPL - Apple Inc.</option>
              <option value="MSFT">MSFT - Microsoft Corporation</option>
              <option value="AMZN">AMZN - Amazon.com Inc.</option>
              <option value="GOOGL">GOOGL - Alphabet Inc.</option>
              <option value="FB">FB - Meta Platforms Inc.</option>
              <option value="TSLA">TSLA - Tesla Inc.</option>
              <option value="NVDA">NVDA - NVIDIA Corporation</option>
              <option value="JPM">JPM - JPMorgan Chase & Co.</option>
              <option value="JNJ">JNJ - Johnson & Johnson</option>
              <option value="V">V - Visa Inc.</option>
              <option value="PG">PG - Procter & Gamble Co.</option>
              <option value="UNH">UNH - UnitedHealth Group Inc.</option>
              <option value="HD">HD - The Home Depot Inc.</option>
              <option value="MA">MA - Mastercard Inc.</option>
              <option value="DIS">DIS - The Walt Disney Company</option>
              <option value="PYPL">PYPL - PayPal Holdings Inc.</option>
              <option value="BAC">BAC - Bank of America Corp.</option>
              <option value="ADBE">ADBE - Adobe Inc.</option>
              <option value="CMCSA">CMCSA - Comcast Corporation</option>
              <option value="NFLX">NFLX - Netflix Inc.</option>
            </select>
          </div>
        </div>
        <div class="nav-item">
          <div class="date-picker input-group">
            <label for="startDate" class="input-label">開始日期：</label>
            <input type="date" id="startDate" v-model="startDate" @change="fetchStockData" class="input-field">
          </div>
        </div>
        <div class="nav-item">
          <div class="date-picker input-group">
            <label for="endDate" class="input-label">結束日期：</label>
            <input type="date" id="endDate" v-model="endDate" @change="fetchStockData" class="input-field">
          </div>
        </div>
      </nav>
      <div class="chart-row">
        <trading-vue
          :data="chartData"
          :width="width"
          :height="height"
          :color-theme="colorTheme"
        />
      </div>
    </div>
  </template>
  
  <script>
  import TradingVue from 'trading-vue-js'
  import axios from 'axios'
  
  export default {
    name: 'StockChart',
    components: { TradingVue },
    data() {
      const today = new Date()
      const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
      return {
        width: window.innerWidth - 50,
        height: window.innerHeight - 90, // 減去導航列高度
        colorTheme: 'dark',
        stockName: 'AAPL',
        currentPrice: 0,
        priceChange: '0%',
        ohlcv: [],
        startDate: lastYear.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
        stockSymbol: 'AAPL'
      }
    },
    computed: {
      chartData() {
        return { ohlcv: this.ohlcv }
      },
      apiUrl() {
        return `https://api.polygon.io/v2/aggs/ticker/${this.stockSymbol}/range/1/day/${this.startDate}/${this.endDate}?adjusted=true&sort=asc&apiKey=Za0nOUx7I57_RcDoZWL5Y4MpwbR5WKM2`
      }
    },
    methods: {
      fetchStockData() {
        axios
          .get(this.apiUrl)
          .then((res) => {
            if (res.data && res.data.results) {
              const data = res.data.results
              this.ohlcv = data.map(item => [
                item.t,
                item.o,
                item.h,
                item.l,
                item.c,
                item.v
              ])
              this.updateStockInfo(data)
            }
          })
          .catch((error) => {
            console.error("發生錯誤：", error)
          })
      },
      updateStockInfo(data) {
        // 若資料筆數不足兩筆則不更新漲跌幅
        if (data.length > 1) {
          const latestData = data[data.length - 1]
          const previousClose = data[data.length - 2].c
          this.stockName = this.stockSymbol
          this.currentPrice = latestData.c.toFixed(2)
          const change = ((latestData.c - previousClose) / previousClose * 100).toFixed(2)
          this.priceChange = `${change > 0 ? '+' : ''}${change}%`
        }
      }
    },
    created() {
      this.fetchStockData()
    }
  }
  </script>
  
  <style scoped>
  /* 基本容器設定 */
  .stock-container {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    min-height: 100vh;
    background-color: #e0e0e0; /* 調整背景色 */
    padding: 20px;
  }
  
  /* 導航列設定：改為一行排列 */
  .navigation-bar {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    background-color: #1a1a1a; /* 深色背景 */
    color: #f0f0f0; /* 淺色文字 */
    padding: 10px 15px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    margin-bottom: 20px;
    overflow-x: auto;
  }
  
  /* 每個項目的間距 */
  .nav-item {
    margin-right: 15px;
    display: flex;
    align-items: center;
  }
  
  /* 標題顏色調整 */
  .title h1 {
    font-size: 1.5rem;
    color: #4db6ac; /* 調整標題顏色 */
    margin: 0;
    text-transform: uppercase;
  }
  
  /* 文字調整 */
  .navigation-bar p {
    font-size: 1rem;
    margin: 0;
  }
  
  /* 輸入組件 */
  .input-group {
    display: flex;
    flex-direction: row;
    align-items: center;
    background-color: #333333; /* 深色背景 */
    padding: 5px 8px;
    border-radius: 5px;
  }
  
  .input-label {
    color: #f0f0f0;
    font-weight: bold;
    margin-right: 5px;
  }
  
  .input-field {
    padding: 5px;
    border: none;
    border-radius: 3px;
    font-size: 1rem;
    background-color: #f0f0f0;
    color: #333333;
    transition: box-shadow 0.2s ease;
  }
  
  .input-field:focus {
    outline: none;
    box-shadow: 0 0 0 2px #4db6ac;
  }
  
  /* 圖表區域 */
  .chart-row {
    margin-top: 20px;
  }
  </style>
  