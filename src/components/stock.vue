<template>
    <div class="stock-container container-fluid">
        <nav class="navigation-bar row py-3 bg-light text-dark">
            <div class="col-md-2">
                <h1 class="mb-0">{{ stockName }}</h1>
            </div>
            <div class="col-md-2">
                <p class="mb-0">當前價格: {{ currentPrice }}</p>
            </div>
            <div class="col-md-2">
                <p class="mb-0">漲跌幅: {{ priceChange }}</p>
            </div>
            <div class="col-md-2">
                <div class="stock-picker">
                    <label for="stockSymbol" class="stock-label">股票代號：</label>
                    <input type="text" id="stockSymbol" v-model="stockSymbol" @change="fetchStockData" class="stock-input">
                </div>
            </div>
            <div class="col-md-2">
                <div class="date-picker">
                    <label for="startDate" class="date-label">開始日期：</label>
                    <input type="date" id="startDate" v-model="startDate" @change="fetchStockData" class="date-input">
                </div>
            </div>
            <div class="col-md-2">
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
            startDate: '2024-01-09',
            endDate: '2024-07-10',
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
    height: 100vh;
    display: flex;
    flex-direction: column;
}

.navigation-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 30px;
    background-color: #2c3e50;
    color: #ecf0f1;
    height: 70px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
}

.navigation-bar h1 {
    margin: 0;
    font-size: 24px;
    color: #3498db;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.navigation-bar p {
    margin: 0 20px;
    font-size: 18px;
    font-weight: 500;
    color: #bdc3c7;
}

.navigation-bar:hover {
    background-color: #34495e;
}

button {
    margin: 0 5px;
    padding: 5px 10px;
    background-color: #4CAF50;
    color: white;
    border: none;
    cursor: pointer;
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
    align-items: center;
    background-color: #34495e;
    padding: 5px 10px;
    border-radius: 5px;
}

.date-label, .stock-label {
    color: #ecf0f1;
    margin-right: 10px;
    font-weight: bold;
}

.date-input, .stock-input {
    padding: 5px;
    border: none;
    border-radius: 3px;
    background-color: #ecf0f1;
    color: #2c3e50;
    font-size: 14px;
}

.date-input:focus, .stock-input:focus {
    outline: none;
    box-shadow: 0 0 0 2px #3498db;
}
</style>