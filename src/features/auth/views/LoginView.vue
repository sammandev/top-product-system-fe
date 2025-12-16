<template>
    <div class="login-layout">
        <v-main class="login-main d-flex flex-column">
            <v-container fluid class="flex-grow-1 d-flex align-center justify-center py-8">
                <v-row align="center" justify="center">
                    <v-col cols="12" sm="8" md="5" lg="4">
                        <v-card elevation="12" rounded="lg">
                            <v-card-title class="text-h4 text-center pa-6">
                                <v-icon size="large" color="primary" class="mr-2">mdi-test-tube</v-icon>
                                AST Tools Login
                            </v-card-title>

                            <v-card-text>
                                <!-- Login Type Tabs -->
                                <v-tabs v-model="loginTab" bg-color="transparent" color="primary" grow class="mb-4">
                                    <v-tab value="local">
                                        <v-icon start>mdi-account</v-icon>
                                        Local Login
                                    </v-tab>
                                    <v-tab value="external">
                                        <v-icon start>mdi-cloud-sync</v-icon>
                                        External Login
                                    </v-tab>
                                </v-tabs>

                                <v-window v-model="loginTab">
                                    <!-- Local Login Form -->
                                    <v-window-item value="local">
                                        <v-form ref="localFormRef" v-model="localValid"
                                            @submit.prevent="handleLocalLogin">
                                            <v-alert type="info" density="compact" class="mb-3">
                                                <small>Local login only provides access to file parsing and comparison
                                                    features.</small>
                                            </v-alert>

                                            <v-text-field v-model="username" :rules="[rules.required]" label="Username"
                                                prepend-inner-icon="mdi-account" variant="outlined" class="mb-3" />

                                            <v-text-field v-model="password" :rules="[rules.required]"
                                                :type="showPassword ? 'text' : 'password'" label="Password"
                                                prepend-inner-icon="mdi-lock"
                                                :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                                                variant="outlined" class="mb-3"
                                                @click:append-inner="showPassword = !showPassword" />

                                            <v-alert v-if="error" type="error" class="mb-3" closable
                                                @click:close="authStore.error = null">
                                                {{ error }}
                                            </v-alert>

                                            <v-btn :loading="loading" :disabled="!localValid" block color="primary"
                                                size="large" type="submit">
                                                <v-icon start>mdi-login</v-icon>
                                                Login
                                            </v-btn>
                                        </v-form>
                                    </v-window-item>

                                    <!-- External Login Form -->
                                    <v-window-item value="external">
                                        <v-form ref="externalFormRef" v-model="externalValid"
                                            @submit.prevent="handleExternalLogin">
                                            <v-alert type="info" density="compact" class="mb-4">
                                                <small><strong>External login</strong> provides full access including
                                                    DUT Management API
                                                    features.</small>
                                            </v-alert>

                                            <v-text-field v-model="username" :rules="[rules.required]" label="Username"
                                                prepend-inner-icon="mdi-account" variant="outlined" class="mb-3" />

                                            <v-text-field v-model="password" :rules="[rules.required]"
                                                :type="showPassword ? 'text' : 'password'" label="Password"
                                                prepend-inner-icon="mdi-lock"
                                                :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                                                variant="outlined" class="mb-3"
                                                @click:append-inner="showPassword = !showPassword" />

                                            <v-alert v-if="error" type="error" class="mb-3" closable
                                                @click:close="authStore.error = null">
                                                {{ error }}
                                            </v-alert>

                                            <v-btn :loading="loading" :disabled="!externalValid" block color="primary"
                                                size="large" type="submit">
                                                <v-icon start>mdi-cloud-sync</v-icon>
                                                Login with External Access
                                            </v-btn>
                                        </v-form>
                                    </v-window-item>
                                </v-window>
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
import { useAuth } from '../composables'
import { useAuthStore } from '../store'

// Use auth composable with router integration
const { login, externalLogin, loading, error } = useAuth()
const authStore = useAuthStore()

// Form refs
const localFormRef = ref()
const externalFormRef = ref()

// Form validity
const localValid = ref(false)
const externalValid = ref(false)

// Tab state
const loginTab = ref('local')

// Shared credentials
const username = ref('')
const password = ref('')
const showPassword = ref(false)

const rules = {
    required: (value: string) => !!value || 'Required field'
}

// Clear error when switching tabs
watch(loginTab, () => {
    authStore.error = null
})

async function handleLocalLogin() {
    if (!localValid.value) return

    try {
        await login({
            username: username.value,
            password: password.value
        })
        // Navigation handled by useAuth composable
        // On success, credentials will be cleared by redirect
    } catch (err) {
        console.error('Local login failed:', err)
        // Error displayed via computed error from store
        // Credentials preserved so user can verify input
    }
}

async function handleExternalLogin() {
    if (!externalValid.value) return

    try {
        await externalLogin({
            username: username.value,
            password: password.value
        })
        // Navigation handled by useAuth composable
        // On success, credentials will be cleared by redirect
    } catch (err) {
        console.error('External login failed:', err)
        // Error displayed via computed error from store
        // Credentials preserved so user can verify input
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
