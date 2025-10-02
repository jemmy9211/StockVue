<template>
  <div id="app">
    <ParticleBackground />
    <div class="app-content">
      <RouterView />
    </div>
  </div>
</template>

<script>
import ParticleBackground from '@/components/ParticleBackground.vue';

export default {
  name: 'App',
  components: {
    ParticleBackground,
  },
};
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  height: 100vh;
  width: 100vw;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  overflow: hidden;
  background: linear-gradient(135deg, #0a0e27 0%, #1a1a2e 50%, #16213e 100%);
  position: relative;
}

.app-content {
  position: relative;
  z-index: 1;
  height: 100%;
  width: 100%;
}

/* Smooth animations */
* {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(26, 26, 46, 0.5);
}

::-webkit-scrollbar-thumb {
  background: rgba(77, 182, 172, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(77, 182, 172, 0.5);
}
</style>
