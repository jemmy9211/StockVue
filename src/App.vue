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
  background: #0c0e1a;
  position: relative;
}

.app-content {
  position: relative;
  z-index: 1;
  height: 100%;
  width: 100%;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.18);
}
</style>
