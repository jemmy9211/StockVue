<template>
  <div class="investment-advisor">
    <div class="advisor-header">
      <h3 class="advisor-title">
        <span class="title-icon">🎯</span>
        投資建議
      </h3>
      <div class="advisor-badge" :class="overallAdviceClass">
        {{ overallSignal }}
      </div>
    </div>
    
    <div class="indicators-section">
      <div class="section-header">
        <span class="section-icon">📊</span>
        <h4>技術指標分析</h4>
      </div>
      
      <div class="indicator" v-if="rsi !== null">
        <div class="indicator-icon-wrapper" :class="rsiClass">
          <span class="indicator-emoji">📈</span>
        </div>
        <div class="indicator-content">
          <div class="indicator-header">
            <span class="indicator-name">RSI (14天)</span>
            <span class="indicator-value" :class="rsiClass">{{ rsi }}</span>
          </div>
          <div class="indicator-bar">
            <div class="indicator-bar-fill" :class="rsiClass" :style="{ width: `${Math.min(rsi, 100)}%` }"></div>
            <div class="indicator-bar-markers">
              <span class="marker" style="left: 30%">30</span>
              <span class="marker" style="left: 70%">70</span>
            </div>
          </div>
          <div class="indicator-description">{{ rsiDescription }}</div>
        </div>
      </div>
      
      <div class="indicator" v-if="ma50 !== null && currentPrice">
        <div class="indicator-icon-wrapper" :class="ma50Class">
          <span class="indicator-emoji">📉</span>
        </div>
        <div class="indicator-content">
          <div class="indicator-header">
            <span class="indicator-name">50日均線</span>
            <span class="indicator-value" :class="ma50Class">${{ ma50 }}</span>
          </div>
          <div class="ma-comparison">
            <div class="ma-item">
              <span class="ma-label">目前價格</span>
              <span class="ma-value">${{ currentPrice }}</span>
            </div>
            <span class="ma-vs">vs</span>
            <div class="ma-item">
              <span class="ma-label">50日均線</span>
              <span class="ma-value">${{ ma50 }}</span>
            </div>
          </div>
          <div class="indicator-description">{{ ma50Description }}</div>
        </div>
      </div>
      
      <div class="indicator" v-if="macd !== null && signalLine !== null">
        <div class="indicator-icon-wrapper" :class="macdClass">
          <span class="indicator-emoji">⚡</span>
        </div>
        <div class="indicator-content">
          <div class="indicator-header">
            <span class="indicator-name">MACD</span>
            <span class="indicator-value" :class="macdClass">{{ macd }}</span>
          </div>
          <div class="macd-detail">
            <div class="macd-item">
              <span class="macd-label">MACD線</span>
              <span class="macd-value" :class="macdClass">{{ macd }}</span>
            </div>
            <div class="macd-item">
              <span class="macd-label">信號線</span>
              <span class="macd-value">{{ signalLine }}</span>
            </div>
          </div>
          <div class="indicator-description">{{ macdDescription }}</div>
        </div>
      </div>

      <div class="indicator no-data" v-if="rsi === null && ma50 === null && macd === null">
        <div class="no-data-icon">📭</div>
        <div class="no-data-text">數據不足，無法計算技術指標</div>
      </div>
    </div>
    
    <div class="advice-section">
      <div class="section-header">
        <span class="section-icon">💡</span>
        <h4>總體建議</h4>
      </div>
      <div class="advice-card" :class="overallAdviceClass">
        <div class="advice-icon">
          {{ adviceIcon }}
        </div>
        <div class="advice-content">
          <div class="advice-signal">{{ overallSignal }}</div>
          <div class="advice-text">{{ overallAdvice }}</div>
        </div>
        <div class="advice-score">
          <div class="score-label">信心分數</div>
          <div class="score-value">{{ Math.abs(calculateOverallScore()) }}/3</div>
        </div>
      </div>
    </div>
    
    <div class="disclaimer">
      <span class="disclaimer-icon">⚠️</span>
      <p>此建議僅供參考，投資有風險，請謹慎評估並自行決策。</p>
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
      if (this.rsiValue >= 70) return '超買區間，可能面臨回調壓力';
      if (this.rsiValue <= 30) return '超賣區間，可能出現反彈機會';
      return '正常區間，走勢相對平穩';
    },
    
    ma50Class() {
      if (this.currentPriceValue > this.ma50Value) return 'bullish';
      if (this.currentPriceValue < this.ma50Value) return 'bearish';
      return 'neutral';
    },
    
    ma50Description() {
      const diff = ((this.currentPriceValue - this.ma50Value) / this.ma50Value * 100).toFixed(2);
      if (this.currentPriceValue > this.ma50Value) {
        return `股價高於均線 ${Math.abs(diff)}%，中期趨勢偏多`;
      } else if (this.currentPriceValue < this.ma50Value) {
        return `股價低於均線 ${Math.abs(diff)}%，中期趨勢偏空`;
      }
      return '股價接近均線，方向不明確';
    },
    
    macdClass() {
      if (this.macdValue > this.signalLineValue) return 'bullish';
      if (this.macdValue < this.signalLineValue) return 'bearish';
      return 'neutral';
    },
    
    macdDescription() {
      if (this.macdValue > this.signalLineValue) {
        return 'MACD 高於信號線，動能偏強，多方佔優';
      } else if (this.macdValue < this.signalLineValue) {
        return 'MACD 低於信號線，動能轉弱，空方佔優';
      }
      return 'MACD 接近信號線，即將出現交叉';
    },
    
    overallSignal() {
      const score = this.calculateOverallScore();
      if (score >= 2) return '強力買入';
      if (score <= -2) return '強力賣出';
      if (score > 0) return '偏多操作';
      if (score < 0) return '偏空觀望';
      return '中性持有';
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
      if (score >= 2) return '多項技術指標同步發出買入訊號，可考慮積極佈局，但仍需設定停損點位';
      if (score <= -2) return '多項指標顯示賣出訊號，建議減持或觀望，注意控制風險';
      if (score > 0) return '技術面偏向正面，可適度加碼，但建議分批進場';
      if (score < 0) return '技術指標偏向負面，建議保持謹慎，可考慮減少持倉';
      return '指標呈現中性，建議持股觀望，等待更明確的方向訊號';
    },
    
    adviceIcon() {
      const score = this.calculateOverallScore();
      if (score >= 2) return '🚀';
      if (score <= -2) return '⛔';
      if (score > 0) return '📈';
      if (score < 0) return '📉';
      return '⚖️';
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

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.investment-advisor {
  background: rgba(30, 30, 46, 0.7);
  backdrop-filter: blur(20px);
  border-radius: 20px;
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
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4),
              0 0 50px rgba(77, 182, 172, 0.15);
  border-color: rgba(77, 182, 172, 0.3);
}

/* Header */
.advisor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(77, 182, 172, 0.15);
}

.advisor-title {
  background: linear-gradient(135deg, #4db6ac 0%, #26a69a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  letter-spacing: 0.5px;
}

.title-icon {
  font-size: 1.2rem;
  animation: float 3s ease-in-out infinite;
}

.advisor-badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  animation: pulse 2s ease-in-out infinite;
}

.advisor-badge.strong-bullish {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.1));
  color: #4caf50;
  border: 1px solid rgba(76, 175, 80, 0.4);
}

.advisor-badge.strong-bearish {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(244, 67, 54, 0.1));
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.4);
}

.advisor-badge.bullish {
  background: rgba(76, 175, 80, 0.15);
  color: #4caf50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.advisor-badge.bearish {
  background: rgba(244, 67, 54, 0.15);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.advisor-badge.neutral {
  background: rgba(158, 158, 158, 0.15);
  color: #9e9e9e;
  border: 1px solid rgba(158, 158, 158, 0.3);
}

/* Section Headers */
.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.section-icon {
  font-size: 1rem;
}

.section-header h4 {
  color: rgba(224, 224, 224, 0.9);
  font-size: 0.9rem;
  margin: 0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.indicators-section,
.advice-section {
  margin-bottom: 24px;
}

/* Indicator Cards */
.indicator {
  background: rgba(44, 44, 60, 0.5);
  backdrop-filter: blur(10px);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  gap: 14px;
  border: 1px solid rgba(77, 182, 172, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
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
  background: linear-gradient(90deg, transparent, rgba(77, 182, 172, 0.08), transparent);
  transition: left 0.6s;
}

.indicator:hover {
  transform: translateX(5px);
  background: rgba(44, 44, 60, 0.7);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
  border-color: rgba(77, 182, 172, 0.25);
}

.indicator:hover::before {
  left: 100%;
}

.indicator-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  flex-shrink: 0;
  transition: all 0.3s;
}

.indicator-icon-wrapper.bullish {
  background: rgba(76, 175, 80, 0.15);
  box-shadow: 0 0 15px rgba(76, 175, 80, 0.2);
}

.indicator-icon-wrapper.bearish {
  background: rgba(244, 67, 54, 0.15);
  box-shadow: 0 0 15px rgba(244, 67, 54, 0.2);
}

.indicator-icon-wrapper.neutral {
  background: rgba(158, 158, 158, 0.15);
  box-shadow: 0 0 15px rgba(158, 158, 158, 0.2);
}

.indicator-content {
  flex: 1;
  min-width: 0;
}

.indicator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.indicator-name {
  font-weight: 600;
  color: #e0e0e0;
  font-size: 0.9rem;
  letter-spacing: 0.3px;
}

.indicator-value {
  font-weight: 700;
  font-size: 1.15rem;
  animation: countUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* RSI Bar */
.indicator-bar {
  height: 6px;
  background: rgba(66, 66, 66, 0.5);
  border-radius: 3px;
  margin-bottom: 10px;
  position: relative;
  overflow: visible;
}

.indicator-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.indicator-bar-fill.bullish {
  background: linear-gradient(90deg, #4caf50, #81c784);
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.4);
}

.indicator-bar-fill.bearish {
  background: linear-gradient(90deg, #f44336, #e57373);
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.4);
}

.indicator-bar-fill.neutral {
  background: linear-gradient(90deg, #4db6ac, #80cbc4);
  box-shadow: 0 0 10px rgba(77, 182, 172, 0.4);
}

.indicator-bar-markers {
  position: absolute;
  top: 10px;
  left: 0;
  right: 0;
}

.marker {
  position: absolute;
  font-size: 0.6rem;
  color: rgba(224, 224, 224, 0.4);
  transform: translateX(-50%);
}

/* MA Comparison */
.ma-comparison {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(26, 26, 46, 0.5);
  border-radius: 8px;
  margin-bottom: 10px;
}

.ma-item {
  flex: 1;
  text-align: center;
}

.ma-label {
  display: block;
  font-size: 0.65rem;
  color: rgba(224, 224, 224, 0.5);
  text-transform: uppercase;
  margin-bottom: 4px;
}

.ma-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: #e0e0e0;
}

.ma-vs {
  color: rgba(77, 182, 172, 0.5);
  font-size: 0.7rem;
  font-weight: 600;
}

/* MACD Detail */
.macd-detail {
  display: flex;
  gap: 16px;
  padding: 10px;
  background: rgba(26, 26, 46, 0.5);
  border-radius: 8px;
  margin-bottom: 10px;
}

.macd-item {
  flex: 1;
}

.macd-label {
  display: block;
  font-size: 0.65rem;
  color: rgba(224, 224, 224, 0.5);
  text-transform: uppercase;
  margin-bottom: 4px;
}

.macd-value {
  font-size: 0.9rem;
  font-weight: 700;
}

.indicator-description {
  font-size: 0.8rem;
  color: rgba(176, 176, 176, 0.8);
  line-height: 1.5;
}

/* No Data State */
.indicator.no-data {
  justify-content: center;
  align-items: center;
  flex-direction: column;
  padding: 30px;
  text-align: center;
}

.no-data-icon {
  font-size: 2rem;
  margin-bottom: 10px;
  opacity: 0.5;
}

.no-data-text {
  color: rgba(224, 224, 224, 0.5);
  font-size: 0.85rem;
}

/* Advice Card */
.advice-card {
  background: rgba(44, 44, 60, 0.5);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  border: 1px solid rgba(66, 66, 66, 0.3);
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
  background: radial-gradient(circle, rgba(77, 182, 172, 0.08) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.5s;
}

.advice-card:hover::before {
  opacity: 1;
}

.advice-card:hover {
  transform: scale(1.02);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
}

.advice-icon {
  font-size: 2.2rem;
  animation: float 3s ease-in-out infinite;
}

.advice-content {
  flex: 1;
}

.advice-signal {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.advice-text {
  color: rgba(176, 176, 176, 0.9);
  line-height: 1.6;
  font-size: 0.85rem;
}

.advice-score {
  text-align: center;
  padding: 10px 14px;
  background: rgba(26, 26, 46, 0.6);
  border-radius: 10px;
}

.score-label {
  font-size: 0.6rem;
  color: rgba(224, 224, 224, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.score-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #4db6ac;
}

/* Advice Card Variants */
.strong-bullish {
  border-color: rgba(76, 175, 80, 0.4);
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.08), rgba(44, 44, 60, 0.5));
}

.strong-bullish .advice-signal {
  color: #4caf50;
  text-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
}

.strong-bearish {
  border-color: rgba(244, 67, 54, 0.4);
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.08), rgba(44, 44, 60, 0.5));
}

.strong-bearish .advice-signal {
  color: #f44336;
  text-shadow: 0 0 20px rgba(244, 67, 54, 0.5);
}

.bullish .advice-signal {
  color: #4caf50;
}

.bearish .advice-signal {
  color: #f44336;
}

.neutral .advice-signal {
  color: #9e9e9e;
}

/* Signal colors */
.bullish {
  color: #4caf50;
  text-shadow: 0 0 12px rgba(76, 175, 80, 0.4);
}

.bearish {
  color: #f44336;
  text-shadow: 0 0 12px rgba(244, 67, 54, 0.4);
}

.neutral {
  color: #9e9e9e;
  text-shadow: 0 0 12px rgba(158, 158, 158, 0.3);
}

/* Disclaimer */
.disclaimer {
  margin-top: 20px;
  padding: 14px;
  background: rgba(255, 152, 0, 0.08);
  border: 1px solid rgba(255, 152, 0, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.4s backwards;
}

.disclaimer-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.disclaimer p {
  margin: 0;
  color: rgba(255, 152, 0, 0.8);
  font-size: 0.75rem;
  line-height: 1.5;
}

/* Responsive */
@media (max-width: 768px) {
  .investment-advisor {
    padding: 18px;
  }
  
  .advisor-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .indicator {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .indicator-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  
  .advisor-title {
    font-size: 1.1rem;
  }
  
  .indicator-value {
    font-size: 1rem;
  }
  
  .advice-card {
    flex-direction: column;
    text-align: center;
  }
  
  .advice-score {
    align-self: stretch;
  }
}
</style> 