import { createApp } from 'vue'
import App from './App.vue'
import router from '@/core/router'
import { pinia, vuetify } from '@/core/plugins'
import { useAuthStore } from '@/features/auth/store'

// Import global styles
import './assets/main.css'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(vuetify)

// Initialize auth store and wait for it to complete
const authStore = useAuthStore()
authStore.initialize().then(() => {
  app.mount('#app')
})
