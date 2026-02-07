<template>
  <div class="investment-advisor">
    <div class="advisor-header">
      <h3 class="advisor-title">投資建議</h3>
      <div class="advisor-badge" :class="overallAdviceClass">
        {{ overallSignal }}
      </div>
    </div>
    
    <div class="indicators-section">
      <h4 class="section-title">技術指標</h4>
      
      <div class="indicator" v-if="rsi !== null">
        <div class="indicator-header">
          <span class="indicator-name">RSI (14)</span>
          <span class="indicator-value" :class="rsiClass">{{ rsi }}</span>
        </div>
        <div class="indicator-bar">
          <div class="indicator-bar-fill" :class="rsiClass" :style="{ width: `${Math.min(rsi, 100)}%` }"></div>
        </div>
        <div class="indicator-desc">{{ rsiDescription }}</div>
      </div>
      
      <div class="indicator" v-if="ma50 !== null && currentPrice">
        <div class="indicator-header">
          <span class="indicator-name">MA50</span>
          <span class="indicator-value" :class="ma50Class">${{ ma50 }}</span>
        </div>
        <div class="ma-row">
          <span class="ma-cell"><span class="ma-label">Price</span>${{ currentPrice }}</span>
          <span class="ma-sep">vs</span>
          <span class="ma-cell"><span class="ma-label">MA50</span>${{ ma50 }}</span>
        </div>
        <div class="indicator-desc">{{ ma50Description }}</div>
      </div>
      
      <div class="indicator" v-if="macd !== null && signalLine !== null">
        <div class="indicator-header">
          <span class="indicator-name">MACD</span>
          <span class="indicator-value" :class="macdClass">{{ macd }}</span>
        </div>
        <div class="macd-row">
          <span class="macd-cell"><span class="macd-label">MACD</span><span :class="macdClass">{{ macd }}</span></span>
          <span class="macd-cell"><span class="macd-label">Signal</span>{{ signalLine }}</span>
        </div>
        <div class="indicator-desc">{{ macdDescription }}</div>
      </div>

      <div class="indicator no-data" v-if="rsi === null && ma50 === null && macd === null">
        <div class="no-data-text">數據不足，無法計算技術指標</div>
      </div>
    </div>
    
    <div class="advice-section">
      <h4 class="section-title">總體建議</h4>
      <div class="advice-card" :class="overallAdviceClass">
        <div class="advice-main">
          <div class="advice-signal">{{ overallSignal }}</div>
          <div class="advice-text">{{ overallAdvice }}</div>
        </div>
        <div class="advice-score">{{ Math.abs(calculateOverallScore()) }}/3</div>
      </div>
    </div>
    
    <div class="disclaimer">
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
/* ========== MINIMAL INVESTMENT ADVISOR ========== */

.investment-advisor {
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  padding: 16px;
  color: #c8c8c8;
  height: fit-content;
  border: 1px solid rgba(255,255,255,0.05);
}

/* Header */
.advisor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.advisor-title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #aaa;
}

.advisor-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.advisor-badge.strong-bullish { background: rgba(76,175,80,0.1); color: #66bb6a; }
.advisor-badge.strong-bearish { background: rgba(244,67,54,0.1); color: #ef5350; }
.advisor-badge.bullish { background: rgba(76,175,80,0.08); color: #66bb6a; }
.advisor-badge.bearish { background: rgba(244,67,54,0.08); color: #ef5350; }
.advisor-badge.neutral { background: rgba(158,158,158,0.08); color: #888; }

/* Section */
.section-title {
  color: #666;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 10px 0;
}

.indicators-section { margin-bottom: 16px; }
.advice-section { margin-bottom: 12px; }

/* Indicator Cards */
.indicator {
  background: rgba(255,255,255,0.02);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid rgba(255,255,255,0.04);
}

.indicator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.indicator-name {
  font-weight: 600;
  color: #aaa;
  font-size: 0.8rem;
}

.indicator-value {
  font-weight: 700;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
}

/* RSI Bar */
.indicator-bar {
  height: 3px;
  background: rgba(255,255,255,0.06);
  border-radius: 2px;
  margin-bottom: 8px;
  overflow: hidden;
}

.indicator-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease;
}

.indicator-bar-fill.bullish { background: #66bb6a; }
.indicator-bar-fill.bearish { background: #ef5350; }
.indicator-bar-fill.neutral { background: #888; }

.indicator-desc {
  font-size: 0.7rem;
  color: #666;
  line-height: 1.5;
}

/* MA Row */
.ma-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: rgba(255,255,255,0.02);
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 0.8rem;
}
.ma-cell { display: flex; flex-direction: column; flex: 1; font-weight: 600; color: #ccc; }
.ma-label { font-size: 0.6rem; color: #555; text-transform: uppercase; margin-bottom: 2px; font-weight: 500; }
.ma-sep { color: #444; font-size: 0.7rem; }

/* MACD Row */
.macd-row {
  display: flex;
  gap: 12px;
  padding: 6px 8px;
  background: rgba(255,255,255,0.02);
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 0.8rem;
}
.macd-cell { flex: 1; display: flex; flex-direction: column; font-weight: 600; color: #ccc; }
.macd-label { font-size: 0.6rem; color: #555; text-transform: uppercase; margin-bottom: 2px; font-weight: 500; }

/* No Data */
.indicator.no-data {
  text-align: center;
  padding: 20px;
}
.no-data-text { color: #555; font-size: 0.75rem; }

/* Advice Card */
.advice-card {
  background: rgba(255,255,255,0.02);
  border-radius: 6px;
  padding: 12px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border: 1px solid rgba(255,255,255,0.04);
}

.advice-main { flex: 1; }

.advice-signal {
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.advice-text {
  color: #666;
  line-height: 1.5;
  font-size: 0.75rem;
}

.advice-score {
  font-size: 0.9rem;
  font-weight: 700;
  color: #aaa;
  white-space: nowrap;
  padding: 4px 8px;
  background: rgba(255,255,255,0.04);
  border-radius: 4px;
}

/* Variants */
.advice-card.strong-bullish { border-color: rgba(76,175,80,0.15); }
.advice-card.strong-bullish .advice-signal { color: #66bb6a; }
.advice-card.strong-bearish { border-color: rgba(244,67,54,0.15); }
.advice-card.strong-bearish .advice-signal { color: #ef5350; }
.advice-card.bullish .advice-signal { color: #66bb6a; }
.advice-card.bearish .advice-signal { color: #ef5350; }
.advice-card.neutral .advice-signal { color: #888; }

/* Signal colors */
.bullish { color: #66bb6a; }
.bearish { color: #ef5350; }
.neutral { color: #888; }

/* Disclaimer */
.disclaimer {
  margin-top: 12px;
  padding: 8px 10px;
  background: rgba(255,152,0,0.04);
  border: 1px solid rgba(255,152,0,0.08);
  border-radius: 4px;
}

.disclaimer p {
  margin: 0;
  color: #666;
  font-size: 0.65rem;
  line-height: 1.5;
}

/* Responsive */
@media (max-width: 768px) {
  .investment-advisor { padding: 12px; }
  .advisor-header { flex-direction: column; align-items: flex-start; gap: 8px; }
  .advice-card { flex-direction: column; }
}
</style>