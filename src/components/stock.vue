<template>
    <trading-vue :data="this.ohlcv" :width="1000" :height="500"
    :color-back="colors.colorBack"
    :color-grid="colors.colorGrid"
    :color-text="colors.colorText"
    ></trading-vue>
</template>
<script>
import TradingVue from 'trading-vue-js'
import data from '../assets/data.json'

export default {
    name: 'app',
    components: { TradingVue },
    methods: {
    },
    data() {
        return {
            colors: {
                colorBack: '#fff',
                colorGrid: '#eee',
                colorText: '#333',
            },
            width: window.innerWidth,
            height: window.innerHeight,
            ohlcv: data,
        }
    }
}

</script>