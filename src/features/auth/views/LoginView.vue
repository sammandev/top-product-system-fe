<template>
    <div class="grid place-items-center min-h-screen p-6 bg-app-canvas">
        <div class="w-full max-w-sm">
            <div class="text-center mb-8">
                <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-app-accent text-white text-2xl mb-4">
                    <Icon icon="solar:atom-bold-duotone" />
                </div>
                <h1 class="m-0 text-2xl font-semibold text-app-ink">{{ appName }}</h1>
                <p class="mt-1 text-sm text-app-muted">Sign in to continue</p>
            </div>

            <form class="flex flex-col gap-5 bg-app-panel-strong border border-app-border rounded-xl p-6" @submit.prevent="handleLogin">
                <div class="login-field flex flex-col gap-1.5">
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
                    <p v-if="usernameError" class="m-0 text-[0.8125rem] text-app-danger">{{ usernameError }}</p>
                </div>

                <div class="login-field flex flex-col gap-1.5">
                    <div class="flex items-center justify-between">
                        <label for="password">Password</label>
                        <button class="border-0 bg-transparent text-xs font-medium text-app-accent cursor-pointer p-0" type="button" @click="showPassword = !showPassword">
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
                    <p v-if="passwordError" class="m-0 text-[0.8125rem] text-app-danger">{{ passwordError }}</p>
                </div>

                <label class="flex items-center gap-2 text-[0.8125rem] text-app-muted cursor-pointer">
                    <input v-model="rememberMe" class="w-4 h-4 accent-app-accent" type="checkbox" />
                    <span>Remember me</span>
                </label>

                <div v-if="error" class="login-alert">{{ error }}</div>

                <Button
                    class="login-submit w-full"
                    :disabled="!canSubmit"
                    :loading="loading"
                    type="submit"
                >
                    Sign in
                </Button>

                <div class="login-divider flex items-center gap-3 text-app-muted text-xs">
                    <span>or</span>
                </div>

                <Button
                    class="w-full border border-app-border rounded-lg bg-transparent text-app-ink py-[0.625rem] px-4 text-sm font-medium cursor-pointer"
                    :loading="guestLoading"
                    severity="secondary"
                    type="button"
                    @click="handleGuestLogin"
                >
                    Continue as Guest
                </Button>
            </form>

            <p class="text-center mt-6 text-xs text-app-muted">{{ currentYear }} {{ appName }}</p>
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

.login-divider::before,
.login-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--app-border);
}
</style>
