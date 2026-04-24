<template>
    <div class="login-page">
        <div class="login-card">
            <div class="login-header">
                <div class="login-logo">
                    <Icon icon="solar:atom-bold-duotone" />
                </div>
                <h1 class="login-title">{{ appName }}</h1>
                <p class="login-subtitle">Sign in to continue</p>
            </div>

            <form class="login-form" @submit.prevent="handleLogin">
                <div class="login-field">
                    <label for="username">Username</label>
                    <input
                        id="username"
                        v-model="username"
                        autocomplete="username"
                        :aria-invalid="Boolean(usernameError)"
                        name="username"
                        placeholder="Enter your username"
                        type="text"
                        @input="clearError"
                    />
                    <p v-if="usernameError" class="login-error">{{ usernameError }}</p>
                </div>

                <div class="login-field">
                    <div class="login-field__row">
                        <label for="password">Password</label>
                        <button class="login-toggle" type="button" @click="showPassword = !showPassword">
                            {{ showPassword ? 'Hide' : 'Show' }}
                        </button>
                    </div>
                    <input
                        id="password"
                        v-model="password"
                        autocomplete="current-password"
                        :aria-invalid="Boolean(passwordError)"
                        name="password"
                        placeholder="Enter your password"
                        :type="showPassword ? 'text' : 'password'"
                        @input="clearError"
                    />
                    <p v-if="passwordError" class="login-error">{{ passwordError }}</p>
                </div>

                <label class="login-remember">
                    <input v-model="rememberMe" type="checkbox" />
                    <span>Remember me</span>
                </label>

                <div v-if="error" class="login-alert">{{ error }}</div>

                <Button
                    class="login-submit"
                    :disabled="!canSubmit"
                    :loading="loading"
                    type="submit"
                >
                    Sign in
                </Button>

                <div class="login-divider">
                    <span>or</span>
                </div>

                <Button
                    class="login-guest"
                    :loading="guestLoading"
                    severity="secondary"
                    type="button"
                    @click="handleGuestLogin"
                >
                    Continue as Guest
                </Button>
            </form>

            <p class="login-footer">{{ currentYear }} {{ appName }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import Button from 'primevue/button'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useAppConfigStore } from '@/core/stores/appConfig.store'
import { useAuth } from '../composables'
import { useAuthStore } from '../stores'

const { externalLogin, guestLogin, loading, error } = useAuth()
const authStore = useAuthStore()
const appConfigStore = useAppConfigStore()
const { appName } = storeToRefs(appConfigStore)

const currentYear = new Date().getFullYear()
const guestLoading = ref(false)
const submitAttempted = ref(false)
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberMe = ref(localStorage.getItem('remember_me') === 'true')

const canSubmit = computed(() => username.value.trim().length > 0 && password.value.length > 0)
const usernameError = computed(() =>
    submitAttempted.value && username.value.trim().length === 0 ? 'Username is required.' : '',
)
const passwordError = computed(() =>
    submitAttempted.value && password.value.length === 0 ? 'Password is required.' : '',
)

if (rememberMe.value) {
    const rememberedUsername = localStorage.getItem('remember_username')
    if (rememberedUsername) {
        username.value = rememberedUsername
    }
}

function clearError() {
    authStore.error = null
}

async function handleLogin() {
    submitAttempted.value = true
    if (!canSubmit.value) return
    clearError()
    try {
        await externalLogin({ username: username.value, password: password.value })
        if (rememberMe.value) {
            localStorage.setItem('remember_me', 'true')
            localStorage.setItem('remember_username', username.value)
        } else {
            localStorage.removeItem('remember_me')
            localStorage.removeItem('remember_username')
        }
    } catch (loginError) {
        console.error('Login failed:', loginError)
    }
}

async function handleGuestLogin() {
    clearError()
    guestLoading.value = true
    try {
        await guestLogin()
    } catch (guestError) {
        console.error('Guest login failed:', guestError)
    } finally {
        guestLoading.value = false
    }
}
</script>

<style scoped>
.login-page {
    display: grid;
    place-items: center;
    min-height: 100vh;
    padding: 1.5rem;
    background: var(--app-canvas);
}

.login-card {
    width: 100%;
    max-width: 24rem;
}

.login-header {
    text-align: center;
    margin-bottom: 2rem;
}

.login-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 0.75rem;
    background: var(--app-accent);
    color: #fff;
    font-size: 1.5rem;
    margin-bottom: 1rem;
}

.login-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--app-ink);
}

.login-subtitle {
    margin: 0.25rem 0 0;
    color: var(--app-muted);
    font-size: 0.875rem;
}

.login-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    background: var(--app-panel-strong);
    border: 1px solid var(--app-border);
    border-radius: 0.75rem;
    padding: 1.5rem;
}

.login-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.login-field label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--app-ink);
}

.login-field input {
    width: 100%;
    border: 1px solid var(--app-border);
    border-radius: 0.5rem;
    padding: 0.625rem 0.75rem;
    font-size: 0.875rem;
    color: var(--app-ink);
    background: var(--app-canvas);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.login-field input:focus {
    border-color: var(--app-accent);
    box-shadow: 0 0 0 3px var(--app-ring);
}

.login-field__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.login-toggle {
    border: 0;
    background: none;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--app-accent);
    cursor: pointer;
    padding: 0;
}

.login-remember {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: var(--app-muted);
    cursor: pointer;
}

.login-remember input {
    width: 1rem;
    height: 1rem;
    accent-color: var(--app-accent);
}

.login-error {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--app-danger);
}

.login-alert {
    border: 1px solid rgba(220, 38, 38, 0.2);
    background: var(--app-danger-soft);
    border-radius: 0.5rem;
    padding: 0.625rem 0.75rem;
    font-size: 0.8125rem;
    color: var(--app-danger);
}

.login-submit :deep(.p-button) {
    width: 100%;
}

.login-submit {
    width: 100%;
    border: 0;
    border-radius: 0.5rem;
    background: var(--app-accent);
    color: #fff;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
}

.login-divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--app-muted);
    font-size: 0.75rem;
}

.login-divider::before,
.login-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--app-border);
}

.login-guest {
    width: 100%;
    border: 1px solid var(--app-border);
    border-radius: 0.5rem;
    background: transparent;
    color: var(--app-ink);
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
}

.login-footer {
    text-align: center;
    margin-top: 1.5rem;
    font-size: 0.75rem;
    color: var(--app-muted);
}
</style>
