<template>
  <canvas ref="canvas" class="particle-background"></canvas>
</template>

<script>
export default {
  name: 'ParticleBackground',
  data() {
    return {
      particles: [],
      animationId: null,
    };
  },
  mounted() {
    this.initCanvas();
    this.createParticles();
    this.animate();
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    initCanvas() {
      const canvas = this.$refs.canvas;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    },
    createParticles() {
      const canvas = this.$refs.canvas;
      // Very sparse particles for minimal look
      const count = Math.floor((canvas.width * canvas.height) / 50000);
      
      this.particles = [];
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1 + 0.3,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          opacity: Math.random() * 0.2 + 0.05,
          pulseSpeed: Math.random() * 0.008 + 0.003,
          pulseOffset: Math.random() * Math.PI * 2,
        });
      }
    },
    handleResize() {
      this.initCanvas();
      this.createParticles();
    },
    draw(time) {
      const canvas = this.$refs.canvas;
      const ctx = canvas.getContext('2d');
      
      // Solid dark background
      ctx.fillStyle = '#0c0e1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle vignette
      const vignette = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.9
      );
      vignette.addColorStop(0, 'rgba(12, 14, 26, 0)');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw particles - no connections, no glow, just dots
      ctx.shadowBlur = 0;
      this.particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
        
        const pulse = Math.sin(time * particle.pulseSpeed + particle.pulseOffset) * 0.3 + 0.7;
        const r = particle.radius * pulse;
        const o = particle.opacity * pulse;
        
        ctx.fillStyle = `rgba(200, 200, 220, ${o})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, r, 0, Math.PI * 2);
        ctx.fill();
      });
    },
    animate(time = 0) {
      this.draw(time * 0.001);
      this.animationId = requestAnimationFrame(this.animate);
    },
  },
};
</script>

<style scoped>
.particle-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
</style>
