<template>
    <PublicScaffold
        :app-name="appName"
        eyebrow="Batch 1"
        title="Operational sign in"
        description="This route runs on the scaffold-first shell while preserving the existing authentication flow and backend contracts."
        panel-eyebrow="Access"
        panel-description="Use your external account for full access, or continue as guest for a limited read-only session."
    >
        <template #hero>
            <ul role="list" class="grid gap-3 sm:grid-cols-2">
                <li class="rounded-[1.5rem] border border-[var(--app-border)] bg-white/70 p-4 shadow-[var(--app-shadow-soft)]">
                    <div class="flex items-center gap-3">
                        <div class="rounded-2xl bg-[var(--app-accent-soft)] p-3 text-2xl text-[var(--app-accent)]">
                            <Icon icon="solar:shield-user-bold-duotone" />
                        </div>
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--app-muted)]">Mode</p>
                            <p class="mt-1 text-sm text-[var(--app-ink)]">External or guest access</p>
                        </div>
                    </div>
                </li>
                <li class="rounded-[1.5rem] border border-[var(--app-border)] bg-white/70 p-4 shadow-[var(--app-shadow-soft)]">
                    <div class="flex items-center gap-3">
                        <div class="rounded-2xl bg-[rgba(165,101,71,0.14)] p-3 text-2xl text-[rgb(141,87,62)]">
                            <Icon icon="solar:server-path-bold-duotone" />
                        </div>
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--app-muted)]">Boundary</p>
                            <p class="mt-1 text-sm text-[var(--app-ink)]">Backend contracts stay unchanged</p>
                        </div>
                    </div>
                </li>
            </ul>
        </template>

        <form class="space-y-5" @submit.prevent="handleLogin">
            <div class="space-y-2">
                <label class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--app-muted)]" for="username">
                    Username
                </label>
                <input
                    id="username"
                    v-model="username"
                    autocomplete="username"
                    class="w-full rounded-[1.2rem] border border-[var(--app-border)] bg-white px-4 py-3 text-base text-[var(--app-ink)] shadow-[var(--app-shadow-soft)] outline-none transition focus:border-[var(--app-accent)] focus:ring-4 focus:ring-[var(--app-ring)]"
                    :aria-invalid="Boolean(usernameError)"
                    name="username"
                    placeholder="Enter your username"
                    type="text"
                    @input="clearError"
                />
                <p v-if="usernameError" class="text-sm text-[var(--app-danger)]">{{ usernameError }}</p>
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between gap-4">
                    <label class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--app-muted)]" for="password">
                        Password
                    </label>
                    <button
                        class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--app-accent)]"
                        type="button"
                        @click="showPassword = !showPassword"
                    >
                        {{ showPassword ? 'Hide' : 'Show' }}
                    </button>
                </div>
                <input
                    id="password"
                    v-model="password"
                    autocomplete="current-password"
                    class="w-full rounded-[1.2rem] border border-[var(--app-border)] bg-white px-4 py-3 text-base text-[var(--app-ink)] shadow-[var(--app-shadow-soft)] outline-none transition focus:border-[var(--app-accent)] focus:ring-4 focus:ring-[var(--app-ring)]"
                    :aria-invalid="Boolean(passwordError)"
                    name="password"
                    placeholder="Enter your password"
                    :type="showPassword ? 'text' : 'password'"
                    @input="clearError"
                />
                <p v-if="passwordError" class="text-sm text-[var(--app-danger)]">{{ passwordError }}</p>
            </div>

            <label class="flex items-center gap-3 rounded-[1.2rem] border border-[var(--app-border)] bg-white/70 px-4 py-3 text-sm text-[var(--app-muted)] shadow-[var(--app-shadow-soft)]">
                <input
                    v-model="rememberMe"
                    class="h-4 w-4 rounded border-[var(--app-border)] text-[var(--app-accent)] focus:ring-[var(--app-ring)]"
                    type="checkbox"
                />
                <span>Remember this username on this device</span>
            </label>

            <div v-if="error" class="rounded-[1.2rem] border border-[rgba(163,61,45,0.24)] bg-[var(--app-danger-soft)] px-4 py-3 text-sm text-[var(--app-danger)]">
                {{ error }}
            </div>

            <Button
                class="!w-full !rounded-full !border-0 !bg-[var(--app-accent)] !px-5 !py-3 !text-sm !font-semibold !uppercase !tracking-[0.22em]"
                :disabled="!canSubmit"
                :loading="loading"
                type="submit"
            >
                Login
            </Button>

            <div class="relative py-2 text-center">
                <div class="absolute inset-x-0 top-1/2 border-t border-[var(--app-border)]" />
                <span class="relative inline-block bg-[color:var(--app-panel-strong)] px-3 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[var(--app-muted)]">
                    or continue in limited mode
                </span>
            </div>

            <Button
                class="!w-full !rounded-full !border !border-[var(--app-border)] !bg-transparent !px-5 !py-3 !text-sm !font-semibold !uppercase !tracking-[0.22em] !text-[var(--app-ink)]"
                :loading="guestLoading"
                severity="secondary"
                type="button"
                @click="handleGuestLogin"
            >
                Continue as Guest
            </Button>

            <p class="text-center text-sm leading-6 text-[var(--app-muted)]">
                Guest access keeps the app explorable while blocking write-sensitive workflows.
            </p>
        </form>
    </PublicScaffold>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import Button from 'primevue/button'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import PublicScaffold from '@/shared/ui/public-shell/PublicScaffold.vue'
import { useAppConfigStore } from '@/core/stores/appConfig.store'
import { useAuth } from '../composables'
import { useAuthStore } from '../stores'

const { externalLogin, guestLogin, loading, error } = useAuth()
const authStore = useAuthStore()
const appConfigStore = useAppConfigStore()
const { appName } = storeToRefs(appConfigStore)

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

    if (!canSubmit.value) {
        return
    }

    clearError()

    try {
        await externalLogin({
            username: username.value,
            password: password.value,
        })

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
