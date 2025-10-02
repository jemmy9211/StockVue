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
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes glow-pulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(77, 182, 172, 0.3),
                0 0 40px rgba(77, 182, 172, 0.1);
  }
  50% {
    box-shadow: 0 0 30px rgba(77, 182, 172, 0.5),
                0 0 60px rgba(77, 182, 172, 0.2);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes countUp {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.investment-advisor {
  background: rgba(30, 30, 46, 0.6);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  color: #e0e0e0;
  height: fit-content;
  border: 1px solid rgba(77, 182, 172, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.investment-advisor:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4),
              0 0 40px rgba(77, 182, 172, 0.15);
}

.advisor-title {
  background: linear-gradient(135deg, #4db6ac 0%, #26a69a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 24px 0;
  font-size: 1.4rem;
  font-weight: 700;
  text-shadow: 0 2px 10px rgba(77, 182, 172, 0.3);
  letter-spacing: 0.5px;
  animation: slideInRight 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.indicators-section,
.advice-section {
  margin-bottom: 28px;
}

.indicators-section h4,
.advice-section h4 {
  color: rgba(176, 176, 176, 0.9);
  font-size: 1rem;
  margin: 0 0 16px 0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  position: relative;
  padding-bottom: 8px;
}

.indicators-section h4::after,
.advice-section h4::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 40px;
  height: 2px;
  background: linear-gradient(90deg, #4db6ac, transparent);
}

.indicator {
  background: rgba(44, 44, 60, 0.5);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 14px;
  border-left: 3px solid rgba(77, 182, 172, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.indicator::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(77, 182, 172, 0.1), transparent);
  transition: left 0.6s;
}

.indicator:hover {
  transform: translateX(5px);
  background: rgba(44, 44, 60, 0.7);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3),
              -5px 0 20px rgba(77, 182, 172, 0.1);
  border-left-width: 4px;
}

.indicator:hover::before {
  left: 100%;
}

.indicator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.indicator-name {
  font-weight: 600;
  color: #e0e0e0;
  font-size: 0.95rem;
  letter-spacing: 0.3px;
}

.indicator-value {
  font-weight: 700;
  font-size: 1.2rem;
  animation: countUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.indicator-description {
  font-size: 0.85rem;
  color: rgba(176, 176, 176, 0.8);
  line-height: 1.5;
}

.advice-card {
  background: rgba(44, 44, 60, 0.5);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  border-left: 4px solid rgba(66, 66, 66, 0.5);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.2s backwards;
  position: relative;
  overflow: hidden;
}

.advice-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(77, 182, 172, 0.1) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.5s;
}

.advice-card:hover::before {
  opacity: 1;
}

.advice-card:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
}

.advice-signal {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  animation: countUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.advice-text {
  color: rgba(176, 176, 176, 0.9);
  line-height: 1.6;
  font-size: 0.95rem;
}

/* Signal colors */
.bullish {
  color: #4caf50;
  text-shadow: 0 0 15px rgba(76, 175, 80, 0.5);
}

.bearish {
  color: #f44336;
  text-shadow: 0 0 15px rgba(244, 67, 54, 0.5);
}

.neutral {
  color: #9e9e9e;
  text-shadow: 0 0 15px rgba(158, 158, 158, 0.3);
}

.strong-bullish {
  border-left-color: #4caf50;
  background: rgba(76, 175, 80, 0.05);
  animation: glow-pulse 2s ease-in-out infinite;
}

.strong-bullish .advice-signal {
  color: #4caf50;
  text-shadow: 0 0 20px rgba(76, 175, 80, 0.6);
}

.strong-bearish {
  border-left-color: #f44336;
  background: rgba(244, 67, 54, 0.05);
  animation: glow-pulse 2s ease-in-out infinite;
}

.strong-bearish .advice-signal {
  color: #f44336;
  text-shadow: 0 0 20px rgba(244, 67, 54, 0.6);
}

.disclaimer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(66, 66, 66, 0.3);
  color: rgba(136, 136, 136, 0.8);
  text-align: center;
  font-size: 0.85rem;
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.4s backwards;
}

.disclaimer p {
  margin: 0;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .investment-advisor {
    padding: 18px;
  }
  
  .indicator-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  
  .advisor-title {
    font-size: 1.2rem;
  }
  
  .indicator-value {
    font-size: 1.1rem;
  }
  
  .advice-signal {
    font-size: 1.2rem;
  }
}
</style> 