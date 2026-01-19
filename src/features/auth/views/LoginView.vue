<template>
    <div class="login-layout">
        <v-main class="login-main d-flex flex-column">
            <v-container fluid class="flex-grow-1 d-flex align-center justify-center py-8">
                <v-row align="center" justify="center">
                    <v-col cols="12" sm="8" md="5" lg="4">
                        <v-card elevation="12" rounded="lg">
                            <v-card-title class="text-h4 text-center pa-6">
                                <v-icon size="large" color="primary" class="mr-2">mdi-test-tube</v-icon>
                                {{ appName }} Login
                            </v-card-title>

                            <v-card-text>
                                <!-- Login Type Badge -->
                                <div class="d-flex flex-column align-center mb-4">
                                    <div class="text-caption text-medium-emphasis mb-2">Select Login Mode</div>
                                    <v-chip-group v-model="loginMode" mandatory>
                                        <v-chip value="local" color="primary" variant="tonal">
                                            <v-icon start>mdi-account</v-icon>
                                            Local Login
                                        </v-chip>
                                        <v-chip value="external" color="secondary" variant="tonal">
                                            <v-icon start>mdi-cloud-sync</v-icon>
                                            External Login
                                        </v-chip>
                                    </v-chip-group>
                                </div>

                                <v-form ref="loginFormRef" v-model="loginValid" @submit.prevent="handleLogin">
                                    <v-alert type="info" density="compact" class="mb-3">
                                        <small v-if="loginMode === 'local'">
                                            Local login only provides access to file parsing and comparison features.
                                        </small>
                                        <small v-else>
                                            <strong>External login</strong> provides full access including DUT Management API features.
                                        </small>
                                    </v-alert>

                                    <v-text-field v-model="username" :rules="[rules.required]" label="Username"
                                        prepend-inner-icon="mdi-account" variant="outlined" class="mb-3" />

                                    <v-text-field v-model="password" :rules="[rules.required]"
                                        :type="showPassword ? 'text' : 'password'" label="Password"
                                        prepend-inner-icon="mdi-lock"
                                        :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                                        variant="outlined" class="mb-3"
                                        @click:append-inner="showPassword = !showPassword" />

                                    <div class="d-flex align-center justify-space-between mb-3">
                                        <v-checkbox v-model="rememberMe" label="Remember Me" density="compact" hide-details />
                                    </div>

                                    <v-alert v-if="error" type="error" class="mb-3" closable
                                        @click:close="authStore.error = null">
                                        {{ error }}
                                    </v-alert>

                                    <v-btn :loading="loading" :disabled="!loginValid" block color="primary"
                                        size="large" type="submit">
                                        <v-icon start>{{ loginMode === 'local' ? 'mdi-login' : 'mdi-cloud-sync' }}</v-icon>
                                        {{ loginMode === 'local' ? 'Login' : 'Login with External Access' }}
                                    </v-btn>
                                </v-form>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
            </v-container>
        </v-main>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuth } from '../composables'
import { useAuthStore } from '../store'
import { useAppConfigStore } from '@/core/stores/appConfig.store'

// Use auth composable with router integration
const { login, externalLogin, loading, error } = useAuth()
const authStore = useAuthStore()
const appConfigStore = useAppConfigStore()
const { appName } = storeToRefs(appConfigStore)

// Form refs
const loginFormRef = ref()

// Form validity
const loginValid = ref(false)

// Tab state
const loginMode = ref<'local' | 'external'>(
    (localStorage.getItem('login_mode') as 'local' | 'external') || 'local'
)

// Shared credentials
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberMe = ref(localStorage.getItem('remember_me') === 'true')

const rules = {
    required: (value: string) => !!value || 'Required field'
}

// Clear error when switching tabs
watch(loginMode, () => {
    authStore.error = null
    localStorage.setItem('login_mode', loginMode.value)
})

if (rememberMe.value) {
    const rememberedUsername = localStorage.getItem('remember_username')
    if (rememberedUsername) {
        username.value = rememberedUsername
    }
}

async function handleLogin() {
    if (!loginValid.value) return

    try {
        if (loginMode.value === 'local') {
            await login({
                username: username.value,
                password: password.value
            })
        } else {
            await externalLogin({
                username: username.value,
                password: password.value
            })
        }

        if (rememberMe.value) {
            localStorage.setItem('remember_me', 'true')
            localStorage.setItem('remember_username', username.value)
        } else {
            localStorage.removeItem('remember_me')
            localStorage.removeItem('remember_username')
        }
        localStorage.setItem('login_mode', loginMode.value)
    } catch (err) {
        console.error('Login failed:', err)
    }
}
</script>

<style scoped>
.login-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.login-main {
    flex: 1 1 auto;
    padding: 48px 16px;
    overflow-y: auto;
    background-color: rgb(var(--v-theme-background));
}

.login-footer {
    flex: 0 0 auto;
    justify-content: center;
    gap: 8px;
    font-size: 0.875rem;
    text-align: center;
    padding-inline: 24px;
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity, 0.12));
}
</style>
