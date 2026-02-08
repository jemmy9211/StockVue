<template>
  <div class="line-chart-wrapper" ref="wrapper">
    <canvas
      ref="canvas"
      :width="width"
      :height="height"
      @mousemove="onMouseMove"
      @mouseleave="onMouseLeave"
    ></canvas>
    <div
      v-if="tooltip.show"
      class="chart-tooltip"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      <div class="tooltip-date">{{ tooltip.date }}</div>
      <div class="tooltip-row"><span class="tooltip-label">Open</span><span class="tooltip-val">${{ tooltip.open }}</span></div>
      <div class="tooltip-row"><span class="tooltip-label">High</span><span class="tooltip-val up">${{ tooltip.high }}</span></div>
      <div class="tooltip-row"><span class="tooltip-label">Low</span><span class="tooltip-val down">${{ tooltip.low }}</span></div>
      <div class="tooltip-row"><span class="tooltip-label">Close</span><span class="tooltip-val">${{ tooltip.close }}</span></div>
      <div class="tooltip-row"><span class="tooltip-label">Vol</span><span class="tooltip-val">{{ tooltip.volume }}</span></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LineChart',
  props: {
    data: { type: Array, default: () => [] },
    width: { type: Number, default: 800 },
    height: { type: Number, default: 400 },
  },
  data() {
    return {
      tooltip: { show: false, x: 0, y: 0, date: '', open: '', high: '', low: '', close: '', volume: '' },
      animationId: null,
      animProgress: 0,
    };
  },
  computed: {
    padding() {
      return { top: 20, right: 60, bottom: 30, left: 16 };
    },
    plotWidth() {
      return this.width - this.padding.left - this.padding.right;
    },
    plotHeight() {
      return this.height - this.padding.top - this.padding.bottom;
    },
    closePrices() {
      return this.data.map(d => d[4]);
    },
    minPrice() {
      if (this.closePrices.length === 0) return 0;
      return Math.min(...this.closePrices) * 0.998;
    },
    maxPrice() {
      if (this.closePrices.length === 0) return 1;
      return Math.max(...this.closePrices) * 1.002;
    },
    priceRange() {
      return this.maxPrice - this.minPrice || 1;
    },
  },
  watch: {
    data() {
      this.startAnimation();
    },
    width() {
      this.draw(1);
    },
    height() {
      this.draw(1);
    },
  },
  mounted() {
    if (this.data.length > 0) {
      this.startAnimation();
    }
  },
  beforeDestroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  },
  methods: {
    startAnimation() {
      this.animProgress = 0;
      if (this.animationId) cancelAnimationFrame(this.animationId);
      const duration = 600;
      const start = performance.now();
      const step = (now) => {
        const elapsed = now - start;
        this.animProgress = Math.min(elapsed / duration, 1);
        // easeOutCubic
        const t = this.animProgress;
        this.draw(1 - Math.pow(1 - t, 3));
        if (this.animProgress < 1) {
          this.animationId = requestAnimationFrame(step);
        }
      };
      this.animationId = requestAnimationFrame(step);
    },

    draw(progress) {
      const canvas = this.$refs.canvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const { width, height } = this;
      const { top, right, bottom, left } = this.padding;
      const data = this.data;

      ctx.clearRect(0, 0, width, height);

      if (data.length === 0) {
        ctx.fillStyle = '#555';
        ctx.font = '13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('沒有數據', width / 2, height / 2);
        return;
      }

      const prices = this.closePrices;
      const minP = this.minPrice;
      const maxP = this.maxPrice;
      const range = this.priceRange;
      const pw = this.plotWidth;
      const ph = this.plotHeight;

      const toX = (i) => left + (i / (data.length - 1)) * pw;
      const toY = (p) => top + (1 - (p - minP) / range) * ph;

      // --- Grid lines & price labels ---
      const gridLines = 5;
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#555';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      for (let i = 0; i <= gridLines; i++) {
        const price = minP + (range * i) / gridLines;
        const y = Math.round(toY(price)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(width - right, y);
        ctx.stroke();
        ctx.fillText(price.toFixed(2), width - 6, y + 3);
      }

      // --- Date labels ---
      ctx.textAlign = 'center';
      ctx.fillStyle = '#444';
      const labelCount = Math.min(6, data.length);
      for (let i = 0; i < labelCount; i++) {
        const idx = Math.round((i / (labelCount - 1)) * (data.length - 1));
        const d = new Date(data[idx][0]);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        ctx.fillText(label, toX(idx), height - 8);
      }

      // --- Determine line color based on trend ---
      const firstClose = prices[0];
      const lastClose = prices[Math.floor((prices.length - 1) * progress)];
      const isUp = lastClose >= firstClose;
      const lineColor = isUp ? '#66bb6a' : '#ef5350';
      const gradTop = isUp ? 'rgba(102,187,106,0.15)' : 'rgba(239,83,80,0.15)';
      const gradBot = isUp ? 'rgba(102,187,106,0)' : 'rgba(239,83,80,0)';

      // --- Draw gradient fill ---
      const visibleCount = Math.floor((data.length - 1) * progress) + 1;
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(prices[0]));
      for (let i = 1; i < visibleCount; i++) {
        ctx.lineTo(toX(i), toY(prices[i]));
      }
      ctx.lineTo(toX(visibleCount - 1), top + ph);
      ctx.lineTo(toX(0), top + ph);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, top, 0, top + ph);
      grad.addColorStop(0, gradTop);
      grad.addColorStop(1, gradBot);
      ctx.fillStyle = grad;
      ctx.fill();

      // --- Draw line ---
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(prices[0]));
      for (let i = 1; i < visibleCount; i++) {
        ctx.lineTo(toX(i), toY(prices[i]));
      }
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // --- Draw current price dot ---
      if (progress >= 1) {
        const lastIdx = data.length - 1;
        const cx = toX(lastIdx);
        const cy = toY(prices[lastIdx]);
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = lineColor;
        ctx.fill();
      }
    },

    onMouseMove(e) {
      const canvas = this.$refs.canvas;
      if (!canvas || this.data.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { left } = this.padding;
      const pw = this.plotWidth;

      const ratio = (mx - left) / pw;
      const idx = Math.round(ratio * (this.data.length - 1));
      if (idx < 0 || idx >= this.data.length) {
        this.tooltip.show = false;
        return;
      }

      const item = this.data[idx];
      const d = new Date(item[0]);
      const dateStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;

      // Draw crosshair
      this.draw(1);
      const ctx = canvas.getContext('2d');
      const toX = (i) => left + (i / (this.data.length - 1)) * pw;
      const toY = (p) => this.padding.top + (1 - (p - this.minPrice) / this.priceRange) * this.plotHeight;
      const cx = toX(idx);
      const cy = toY(item[4]);

      // Vertical line
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, this.padding.top);
      ctx.lineTo(cx, this.padding.top + this.plotHeight);
      ctx.stroke();
      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(left, cy);
      ctx.lineTo(left + pw, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dot
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      const isUp = item[4] >= this.data[0][4];
      ctx.fillStyle = isUp ? '#66bb6a' : '#ef5350';
      ctx.fill();

      // Format volume
      const vol = item[5];
      let volStr = vol.toString();
      if (vol >= 1e9) volStr = (vol / 1e9).toFixed(2) + 'B';
      else if (vol >= 1e6) volStr = (vol / 1e6).toFixed(2) + 'M';
      else if (vol >= 1e3) volStr = (vol / 1e3).toFixed(2) + 'K';

      // Position tooltip
      const tipW = 150;
      let tx = mx + 16;
      let ty = my - 60;
      if (tx + tipW > this.width) tx = mx - tipW - 16;
      if (ty < 0) ty = 10;

      this.tooltip = {
        show: true,
        x: tx,
        y: ty,
        date: dateStr,
        open: item[1].toFixed(2),
        high: item[2].toFixed(2),
        low: item[3].toFixed(2),
        close: item[4].toFixed(2),
        volume: volStr,
      };
    },

    onMouseLeave() {
      this.tooltip.show = false;
      this.draw(1);
    },
  },
};
</script>

<style scoped>
.line-chart-wrapper {
  position: relative;
  overflow: hidden;
}

canvas {
  display: block;
}

.chart-tooltip {
  position: absolute;
  pointer-events: none;
  background: rgba(26, 26, 46, 0.95);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 0.7rem;
  color: #ccc;
  min-width: 130px;
  z-index: 10;
  backdrop-filter: blur(8px);
}

.tooltip-date {
  font-weight: 600;
  color: #aaa;
  margin-bottom: 6px;
  font-size: 0.72rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  padding-bottom: 5px;
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  padding: 1.5px 0;
}

.tooltip-label {
  color: #666;
  font-weight: 500;
}

.tooltip-val {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #ccc;
}

.tooltip-val.up { color: #66bb6a; }
.tooltip-val.down { color: #ef5350; }
</style>
