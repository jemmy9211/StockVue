<template>
  <div class="investment-advisor">
    <h3 class="advisor-title">投資建議</h3>
    
    <div class="indicators-section">
      <h4>技術指標</h4>
      
      <div class="indicator" v-if="rsi !== null">
        <div class="indicator-header">
          <span class="indicator-name">RSI (14天)</span>
          <span class="indicator-value" :class="rsiClass">{{ rsi }}</span>
        </div>
        <div class="indicator-description">{{ rsiDescription }}</div>
      </div>
      
      <div class="indicator" v-if="ma50 !== null && currentPrice">
        <div class="indicator-header">
          <span class="indicator-name">50日均線</span>
          <span class="indicator-value" :class="ma50Class">${{ ma50 }}</span>
        </div>
        <div class="indicator-description">{{ ma50Description }}</div>
      </div>
      
      <div class="indicator" v-if="macd !== null && signalLine !== null">
        <div class="indicator-header">
          <span class="indicator-name">MACD</span>
          <span class="indicator-value" :class="macdClass">{{ macd }}</span>
        </div>
        <div class="indicator-description">{{ macdDescription }}</div>
      </div>
    </div>
    
    <div class="advice-section">
      <h4>總體建議</h4>
      <div class="advice-card" :class="overallAdviceClass">
        <div class="advice-signal">{{ overallSignal }}</div>
        <div class="advice-text">{{ overallAdvice }}</div>
      </div>
    </div>
    
    <div class="disclaimer">
      <p><small>⚠️ 此建議僅供參考，投資有風險，請謹慎評估。</small></p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InvestmentAdvisor',
  props: {
    rsi: {
      type: [Number, String],
      default: null
    },
    ma50: {
      type: [Number, String],
      default: null
    },
    currentPrice: {
      type: [Number, String],
      default: null
    },
    macd: {
      type: [Number, String],
      default: null
    },
    signalLine: {
      type: [Number, String],
      default: null
    }
  },
  computed: {
    rsiValue() {
      return parseFloat(this.rsi);
    },
    ma50Value() {
      return parseFloat(this.ma50);
    },
    currentPriceValue() {
      return parseFloat(this.currentPrice);
    },
    macdValue() {
      return parseFloat(this.macd);
    },
    signalLineValue() {
      return parseFloat(this.signalLine);
    },
    
    rsiClass() {
      if (this.rsiValue >= 70) return 'bearish';
      if (this.rsiValue <= 30) return 'bullish';
      return 'neutral';
    },
    
    rsiDescription() {
      if (this.rsiValue >= 70) return '超買區間，可能下跌';
      if (this.rsiValue <= 30) return '超賣區間，可能上漲';
      return '正常區間';
    },
    
    ma50Class() {
      if (this.currentPriceValue > this.ma50Value) return 'bullish';
      if (this.currentPriceValue < this.ma50Value) return 'bearish';
      return 'neutral';
    },
    
    ma50Description() {
      if (this.currentPriceValue > this.ma50Value) {
        return '股價高於均線，趨勢偏多';
      } else if (this.currentPriceValue < this.ma50Value) {
        return '股價低於均線，趨勢偏空';
      }
      return '股價接近均線';
    },
    
    macdClass() {
      if (this.macdValue > this.signalLineValue) return 'bullish';
      if (this.macdValue < this.signalLineValue) return 'bearish';
      return 'neutral';
    },
    
    macdDescription() {
      if (this.macdValue > this.signalLineValue) {
        return 'MACD高於信號線，動能偏多';
      } else if (this.macdValue < this.signalLineValue) {
        return 'MACD低於信號線，動能偏空';
      }
      return 'MACD接近信號線';
    },
    
    overallSignal() {
      const score = this.calculateOverallScore();
      if (score >= 2) return '買入';
      if (score <= -2) return '賣出';
      if (score > 0) return '偏多';
      if (score < 0) return '偏空';
      return '中性';
    },
    
    overallAdviceClass() {
      const score = this.calculateOverallScore();
      if (score >= 2) return 'strong-bullish';
      if (score <= -2) return 'strong-bearish';
      if (score > 0) return 'bullish';
      if (score < 0) return 'bearish';
      return 'neutral';
    },
    
    overallAdvice() {
      const score = this.calculateOverallScore();
      if (score >= 2) return '多項指標顯示買入信號，但仍需注意風險管理';
      if (score <= -2) return '多項指標顯示賣出信號，建議謹慎操作';
      if (score > 0) return '技術指標偏向正面，可考慮適度加碼';
      if (score < 0) return '技術指標偏向負面，建議觀望或減碼';
      return '指標中性，建議持續觀察';
    }
  },
  methods: {
    calculateOverallScore() {
      let score = 0;
      
      // RSI 評分
      if (this.rsi !== null) {
        if (this.rsiValue <= 30) score += 1; // 超賣，偏多
        if (this.rsiValue >= 70) score -= 1; // 超買，偏空
      }
      
      // MA50 評分
      if (this.ma50 !== null && this.currentPrice !== null) {
        if (this.currentPriceValue > this.ma50Value) score += 1;
        if (this.currentPriceValue < this.ma50Value) score -= 1;
      }
      
      // MACD 評分
      if (this.macd !== null && this.signalLine !== null) {
        if (this.macdValue > this.signalLineValue) score += 1;
        if (this.macdValue < this.signalLineValue) score -= 1;
      }
      
      return score;
    }
  }
};
</script>

<style scoped>
.investment-advisor {
  background-color: #1e1e1e;
  border-radius: 8px;
  padding: 20px;
  color: #e0e0e0;
  height: fit-content;
}

.advisor-title {
  color: #4db6ac;
  margin: 0 0 20px 0;
  font-size: 1.2rem;
  font-weight: 500;
}

.indicators-section,
.advice-section {
  margin-bottom: 24px;
}

.indicators-section h4,
.advice-section h4 {
  color: #b0b0b0;
  font-size: 1rem;
  margin: 0 0 12px 0;
  font-weight: 500;
}

.indicator {
  background-color: #2c2c2c;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  border-left: 3px solid #424242;
}

.indicator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.indicator-name {
  font-weight: 500;
  color: #e0e0e0;
}

.indicator-value {
  font-weight: 600;
  font-size: 1.1rem;
}

.indicator-description {
  font-size: 0.9rem;
  color: #b0b0b0;
}

.advice-card {
  background-color: #2c2c2c;
  border-radius: 6px;
  padding: 16px;
  border-left: 4px solid #424242;
}

.advice-signal {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.advice-text {
  color: #b0b0b0;
  line-height: 1.4;
}

/* Signal colors */
.bullish {
  color: #4caf50;
}

.bearish {
  color: #f44336;
}

.neutral {
  color: #9e9e9e;
}

.strong-bullish {
  border-left-color: #4caf50;
}

.strong-bullish .advice-signal {
  color: #4caf50;
}

.strong-bearish {
  border-left-color: #f44336;
}

.strong-bearish .advice-signal {
  color: #f44336;
}

.disclaimer {
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid #424242;
  color: #888;
  text-align: center;
}

@media (max-width: 768px) {
  .investment-advisor {
    padding: 16px;
  }
  
  .indicator-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style> 