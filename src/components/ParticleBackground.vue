<template>
  <canvas ref="canvas" class="particle-background"></canvas>
</template>

<script>
export default {
  name: 'ParticleBackground',
  data() {
    return {
      particles: [],
      stars: [],
      animationId: null,
      mouseX: 0,
      mouseY: 0,
      hue: 170, // Teal color base
    };
  },
  mounted() {
    this.initCanvas();
    this.createParticles();
    this.createStars();
    this.animate();
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('mousemove', this.handleMouseMove);
  },
  beforeDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('mousemove', this.handleMouseMove);
  },
  methods: {
    initCanvas() {
      const canvas = this.$refs.canvas;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    },
    createParticles() {
      const canvas = this.$refs.canvas;
      const particleCount = Math.floor((canvas.width * canvas.height) / 12000);
      
      for (let i = 0; i < particleCount; i++) {
        this.particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2.5 + 0.5,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          opacity: Math.random() * 0.5 + 0.2,
          pulseSpeed: Math.random() * 0.02 + 0.01,
          pulseOffset: Math.random() * Math.PI * 2,
        });
      }
    },
    createStars() {
      const canvas = this.$refs.canvas;
      const starCount = Math.floor((canvas.width * canvas.height) / 30000);
      
      for (let i = 0; i < starCount; i++) {
        this.stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5 + 0.5,
          twinkleSpeed: Math.random() * 0.03 + 0.01,
          twinkleOffset: Math.random() * Math.PI * 2,
        });
      }
    },
    handleResize() {
      this.initCanvas();
      this.particles = [];
      this.stars = [];
      this.createParticles();
      this.createStars();
    },
    handleMouseMove(event) {
      this.mouseX = event.clientX;
      this.mouseY = event.clientY;
    },
    drawParticles(time) {
      const canvas = this.$refs.canvas;
      const ctx = canvas.getContext('2d');
      
      // Create gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.8
      );
      gradient.addColorStop(0, '#0a0e27');
      gradient.addColorStop(0.5, '#1a1a2e');
      gradient.addColorStop(1, '#0f0f1a');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw stars (background twinkling)
      this.stars.forEach(star => {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.5 + 0.5;
        
        ctx.shadowBlur = 5;
        ctx.shadowColor = `rgba(255, 255, 255, ${twinkle * 0.5})`;
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.7})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius * twinkle, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Draw particles
      this.particles.forEach((particle, i) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Bounce off edges with damping
        if (particle.x < 0 || particle.x > canvas.width) {
          particle.vx *= -1;
          particle.x = Math.max(0, Math.min(canvas.width, particle.x));
        }
        if (particle.y < 0 || particle.y > canvas.height) {
          particle.vy *= -1;
          particle.y = Math.max(0, Math.min(canvas.height, particle.y));
        }
        
        // Mouse interaction with smooth attraction
        const dx = this.mouseX - particle.x;
        const dy = this.mouseY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 200) {
          const force = (200 - distance) / 200;
          // Repel from mouse
          particle.x -= (dx / distance) * force * 1.5;
          particle.y -= (dy / distance) * force * 1.5;
        }
        
        // Pulse effect
        const pulse = Math.sin(time * particle.pulseSpeed + particle.pulseOffset) * 0.3 + 0.7;
        const currentRadius = particle.radius * pulse;
        const currentOpacity = particle.opacity * pulse;
        
        // Draw particle with glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = `rgba(77, 182, 172, ${currentOpacity})`;
        ctx.fillStyle = `rgba(77, 182, 172, ${currentOpacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw connections
        for (let j = i + 1; j < this.particles.length; j++) {
          const other = this.particles[j];
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 150) {
            const lineOpacity = (1 - distance / 150) * 0.2;
            
            // Create gradient line
            const lineGradient = ctx.createLinearGradient(
              particle.x, particle.y, other.x, other.y
            );
            lineGradient.addColorStop(0, `rgba(77, 182, 172, ${lineOpacity})`);
            lineGradient.addColorStop(0.5, `rgba(38, 166, 154, ${lineOpacity * 1.2})`);
            lineGradient.addColorStop(1, `rgba(77, 182, 172, ${lineOpacity})`);
            
            ctx.shadowBlur = 0;
            ctx.strokeStyle = lineGradient;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        }
        
        // Draw mouse connection
        if (distance < 180) {
          const mouseLineOpacity = (1 - distance / 180) * 0.25;
          ctx.strokeStyle = `rgba(77, 182, 172, ${mouseLineOpacity})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(this.mouseX, this.mouseY);
          ctx.stroke();
        }
      });
      
      // Draw mouse glow
      if (this.mouseX > 0 && this.mouseY > 0) {
        const mouseGlow = ctx.createRadialGradient(
          this.mouseX, this.mouseY, 0,
          this.mouseX, this.mouseY, 100
        );
        mouseGlow.addColorStop(0, 'rgba(77, 182, 172, 0.15)');
        mouseGlow.addColorStop(0.5, 'rgba(77, 182, 172, 0.05)');
        mouseGlow.addColorStop(1, 'rgba(77, 182, 172, 0)');
        
        ctx.fillStyle = mouseGlow;
        ctx.beginPath();
        ctx.arc(this.mouseX, this.mouseY, 100, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    animate(time = 0) {
      this.drawParticles(time * 0.001);
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
