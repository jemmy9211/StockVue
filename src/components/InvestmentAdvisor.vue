<template>
  <div class="advisor">
    <!-- Signal badge -->
    <div class="signal-row">
      <span class="signal-label">綜合訊號</span>
      <span class="signal-badge" :class="signalClass">{{ signalText }}</span>
    </div>

    <!-- Indicators -->
    <div class="indicators" v-if="hasData">
      <div class="ind-row" v-if="rsi !== null">
        <span class="ind-name">RSI</span>
        <span class="ind-val" :class="rsiClass">{{ rsi }}</span>
        <span class="ind-tag" :class="rsiClass">{{ rsiTag }}</span>
      </div>
      <div class="ind-row" v-if="ma50 !== null && currentPrice">
        <span class="ind-name">MA50</span>
        <span class="ind-val" :class="ma50Class">${{ ma50 }}</span>
        <span class="ind-tag" :class="ma50Class">{{ ma50Tag }}</span>
      </div>
      <div class="ind-row" v-if="macd !== null && signalLine !== null">
        <span class="ind-name">MACD</span>
        <span class="ind-val" :class="macdClass">{{ macd }}</span>
        <span class="ind-tag" :class="macdClass">{{ macdTag }}</span>
      </div>
    </div>
    <div class="no-data" v-else>數據不足</div>

    <div class="disclaimer">僅供參考，投資有風險</div>
  </div>
</template>

<script>
export default {
  name: 'InvestmentAdvisor',
  props: {
    rsi: { type: [Number, String], default: null },
    ma50: { type: [Number, String], default: null },
    currentPrice: { type: [Number, String], default: null },
    macd: { type: [Number, String], default: null },
    signalLine: { type: [Number, String], default: null },
  },
  computed: {
    rsiVal() { return parseFloat(this.rsi); },
    ma50Val() { return parseFloat(this.ma50); },
    priceVal() { return parseFloat(this.currentPrice); },
    macdVal() { return parseFloat(this.macd); },
    sigVal() { return parseFloat(this.signalLine); },

    hasData() {
      return this.rsi !== null || this.ma50 !== null || this.macd !== null;
    },

    rsiClass() {
      if (this.rsiVal >= 70) return 'bear';
      if (this.rsiVal <= 30) return 'bull';
      return 'neut';
    },
    rsiTag() {
      if (this.rsiVal >= 70) return '超買';
      if (this.rsiVal <= 30) return '超賣';
      return '正常';
    },

    ma50Class() {
      if (this.priceVal > this.ma50Val) return 'bull';
      if (this.priceVal < this.ma50Val) return 'bear';
      return 'neut';
    },
    ma50Tag() {
      if (this.priceVal > this.ma50Val) return '多方';
      if (this.priceVal < this.ma50Val) return '空方';
      return '持平';
    },

    macdClass() {
      if (this.macdVal > this.sigVal) return 'bull';
      if (this.macdVal < this.sigVal) return 'bear';
      return 'neut';
    },
    macdTag() {
      if (this.macdVal > this.sigVal) return '偏多';
      if (this.macdVal < this.sigVal) return '偏空';
      return '交叉';
    },

    score() {
      let s = 0;
      if (this.rsi !== null) { if (this.rsiVal <= 30) s++; if (this.rsiVal >= 70) s--; }
      if (this.ma50 !== null && this.currentPrice) { if (this.priceVal > this.ma50Val) s++; if (this.priceVal < this.ma50Val) s--; }
      if (this.macd !== null && this.signalLine !== null) { if (this.macdVal > this.sigVal) s++; if (this.macdVal < this.sigVal) s--; }
      return s;
    },
    signalClass() {
      if (this.score >= 2) return 'bull';
      if (this.score <= -2) return 'bear';
      if (this.score > 0) return 'bull';
      if (this.score < 0) return 'bear';
      return 'neut';
    },
    signalText() {
      if (this.score >= 2) return '強力買入';
      if (this.score <= -2) return '強力賣出';
      if (this.score > 0) return '偏多';
      if (this.score < 0) return '偏空';
      return '中性';
    },
  },
};
</script>

<style scoped>
.advisor {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 14px;
}

.signal-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.signal-label { font-size: 0.75rem; color: #888; font-weight: 600; }
.signal-badge {
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.signal-badge.bull { background: rgba(76,175,80,0.1); color: #66bb6a; }
.signal-badge.bear { background: rgba(244,67,54,0.1); color: #ef5350; }
.signal-badge.neut { background: rgba(158,158,158,0.08); color: #888; }

.indicators { display: flex; flex-direction: column; gap: 6px; }

.ind-row {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  background: rgba(255,255,255,0.02);
  border-radius: 5px;
  border: 1px solid rgba(255,255,255,0.03);
}
.ind-name { font-size: 0.7rem; color: #666; font-weight: 600; width: 44px; flex-shrink: 0; }
.ind-val {
  flex: 1;
  font-size: 0.8rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
  margin-right: 10px;
}
.ind-tag {
  font-size: 0.6rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  flex-shrink: 0;
}
.ind-tag.bull { background: rgba(76,175,80,0.08); color: #66bb6a; }
.ind-tag.bear { background: rgba(244,67,54,0.08); color: #ef5350; }
.ind-tag.neut { background: rgba(158,158,158,0.06); color: #888; }

.ind-val.bull { color: #66bb6a; }
.ind-val.bear { color: #ef5350; }
.ind-val.neut { color: #aaa; }

.no-data { text-align: center; color: #555; font-size: 0.75rem; padding: 16px 0; }

.disclaimer {
  margin-top: 12px;
  text-align: center;
  color: #555;
  font-size: 0.6rem;
}
</style>