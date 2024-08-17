<template>
    <div class="stock-container container-fluid">
        <nav class="navigation-bar row py-3 bg-light text-dark">
            <div class="col-12 col-md-4 mb-3 mb-md-0">
                <h1 class="mb-2 mb-md-0">{{ stockName }}</h1>
            </div>
            <div class="col-6 col-md-4 mb-3 mb-md-0">
                <p class="mb-2 mb-md-0">當前價格: {{ currentPrice }}</p>
            </div>
            <div class="col-6 col-md-4 mb-3 mb-md-0">
                <p class="mb-0">漲跌幅: {{ priceChange }}</p>
            </div>
            <div class="col-12 col-md-4 mb-3 mb-md-0">
                <div class="stock-picker">
                    <label for="stockSymbol" class="stock-label">股票代號：</label>
                    <select id="stockSymbol" v-model="stockSymbol" @change="fetchStockData" class="stock-input">
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
            <div class="col-12 col-md-4 mb-3 mb-md-0">
                <div class="date-picker">
                    <label for="startDate" class="date-label">開始日期：</label>
                    <input type="date" id="startDate" v-model="startDate" @change="fetchStockData" class="date-input">
                </div>
            </div>
            <div class="col-12 col-md-4">
                <div class="date-picker">
                    <label for="endDate" class="date-label">結束日期：</label>
                    <input type="date" id="endDate" v-model="endDate" @change="fetchStockData" class="date-input">
                </div>
            </div>
        </nav>
        <div class="row">
            <div class="col-12">
                <trading-vue :data="chartData" :width="width" :height="height" :color-theme="colorTheme"></trading-vue>
            </div>
        </div>
    </div>
</template>

<script>
import TradingVue from 'trading-vue-js'
import axios from 'axios'

export default {
    name: 'app',
    components: { TradingVue },
    data() {
        const today = new Date();
        const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        return {
            width: window.innerWidth-50,
            height: window.innerHeight-90, // 減去導覽列的高度
            colorTheme: 'dark',
            stockName: '',
            currentPrice: 0,
            priceChange: '0%',
            ohlcv: [],
            ma20: [], // 用於存儲 20 日均線數據
            ma50: [], // 用於存儲 50 日均線數據
            startDate: lastYear.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0], // 將結束日期設置為當前日期
            stockSymbol: 'AAPL'
        }
    },
    computed: {
        chartData() {
            return {
                ohlcv: this.ohlcv,
            }
        },
        apiUrl() {
            return `https://api.polygon.io/v2/aggs/ticker/${this.stockSymbol}/range/1/day/${this.startDate}/${this.endDate}?adjusted=true&sort=asc&apiKey=Za0nOUx7I57_RcDoZWL5Y4MpwbR5WKM2`
        }
    },
    methods: {
        fetchStockData() {
            axios.get(this.apiUrl, {
                mode: 'no-cors'
            }).then((res) => {
                console.log(res);
                if (res.data && res.data.results) {
                    this.ohlcv = res.data.results.map(item => [
                        item.t,
                        item.o,
                        item.h,
                        item.l,
                        item.c,
                        item.v
                    ]);
                    this.updateStockInfo(res.data.results);
                }
            }).catch((error) => {
                console.error("發生錯誤：", error);
                this.showdiv = false;
            });
        },
        updateStockInfo(data) {
            if (data.length > 0) {
                const latestData = data[data.length - 1];
                this.stockName = this.stockSymbol;
                this.currentPrice = latestData.c.toFixed(2);
                const previousClose = data[data.length - 2].c;
                const change = ((latestData.c - previousClose) / previousClose * 100).toFixed(2);
                this.priceChange = `${change > 0 ? '+' : ''}${change}%`;
            }
        }
    },
    created() {
        this.fetchStockData();
    }
}
</script>

<style scoped>
.stock-container {
    font-family: Arial, sans-serif;
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.navigation-bar {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background-color: #2c3e50;
    color: #ecf0f1;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
}

.navigation-bar h1 {
    margin: 0;
    font-size: 20px;
    color: #3498db;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.navigation-bar p {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    color: #bdc3c7;
}

.navigation-bar:hover {
    background-color: #34495e;
}

button {
    margin: 5px 0;
    padding: 5px 10px;
    background-color: #4CAF50;
    color: white;
    border: none;
    cursor: pointer;
    width: 100%;
}

.stock-info {
    margin-top: 20px;
    background-color: #f0f0f0;
    padding: 15px;
    border-radius: 5px;
}

h2 {
    margin-top: 0;
    color: #333;
}

.date-picker, .stock-picker {
    display: flex;
    flex-direction: column;
    background-color: #34495e;
    padding: 10px;
    border-radius: 5px;
    margin-bottom: 10px;
}

.date-label, .stock-label {
    color: #ecf0f1;
    margin-bottom: 5px;
    font-weight: bold;
}

.date-input, .stock-input {
    padding: 8px;
    border: none;
    border-radius: 3px;
    background-color: #ecf0f1;
    color: #2c3e50;
    font-size: 14px;
    width: 100%;
}

.date-input:focus, .stock-input:focus {
    outline: none;
    box-shadow: 0 0 0 2px #3498db;
}

@media (min-width: 768px) {
    .navigation-bar h1 {
        font-size: 24px;
    }

    .navigation-bar p {
        font-size: 18px;
    }

    .date-picker, .stock-picker {
        flex-direction: row;
        align-items: center;
    }

    .date-label, .stock-label {
        margin-right: 10px;
        margin-bottom: 0;
    }

    .date-input, .stock-input {
        width: auto;
    }
}
</style>