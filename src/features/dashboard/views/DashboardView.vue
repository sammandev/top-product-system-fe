<template>
  <DefaultLayout>
    <section class="dashboard-page">
      <header class="dashboard-hero">
        <div class="dashboard-hero__content">
          <div class="dashboard-hero__copy">
            <p class="dashboard-eyebrow">Operational overview</p>
            <h1 class="dashboard-title">Welcome back, {{ userName }}.</h1>
            <p class="dashboard-lead">
              Review platform health, jump into key workflows, and spot recent
              activity at a glance.
            </p>

            <div v-if="error" class="dashboard-alert" role="status">
              <Icon icon="mdi:alert-circle-outline" />
              <span>{{ error }}</span>
            </div>
          </div>

          <div class="dashboard-hero__actions">
            <p class="dashboard-hero__meta">{{ loading ? 'Refreshing snapshot...' : 'Auto-cached · refreshes in background' }}</p>

            <Button :disabled="loading" :loading="loading" severity="secondary" @click="refreshStats">
              <span class="dashboard-button__content">
                <Icon icon="mdi:refresh" />
                <span>Refresh snapshot</span>
              </span>
            </Button>
          </div>
        </div>
      </header>

      <section class="dashboard-stats-grid" aria-label="Dashboard statistics">
        <article v-for="stat in decoratedStats" :key="stat.title" class="dashboard-stat-card" :style="stat.cardVars">
          <div class="dashboard-stat-card__top">
            <div>
              <p class="dashboard-section-label">{{ stat.title }}</p>
              <p class="dashboard-stat-card__value">{{ formatMetricValue(stat.value) }}</p>
            </div>

            <span class="dashboard-icon-badge">
              <Icon :icon="stat.iconName" />
            </span>
          </div>

          <div class="dashboard-stat-card__bottom">
            <span class="dashboard-trend" :class="stat.trend >= 0 ? 'is-positive' : 'is-negative'">
              <Icon :icon="stat.trend >= 0 ? 'mdi:trending-up' : 'mdi:trending-down'" />
              {{ Math.abs(stat.trend).toFixed(1) }}%
            </span>
            <span class="dashboard-stat-card__caption">activity rate</span>
          </div>
        </article>
      </section>

      <section class="dashboard-main-grid">
        <div class="dashboard-main-grid__primary">
          <article class="dashboard-panel dashboard-panel--actions">
            <div class="dashboard-panel__header">
              <div>
                <p class="dashboard-section-label">Quick Actions</p>
                <h2 class="dashboard-panel__title">Fast paths into the core workflows</h2>
              </div>
            </div>

            <div class="dashboard-actions-grid">
              <RouterLink v-for="action in decoratedQuickActions" :key="action.title" :to="action.path"
                class="dashboard-action-card" :style="action.cardVars">
                <span class="dashboard-icon-badge dashboard-icon-badge--sm">
                  <Icon :icon="action.iconName" />
                </span>

                <div class="dashboard-action-card__copy">
                  <h3>{{ action.title }}</h3>
                  <p>{{ action.subtitle }}</p>
                </div>
              </RouterLink>
            </div>
          </article>

          <article class="dashboard-panel">
            <div class="dashboard-panel__header dashboard-panel__header--split">
              <div>
                <p class="dashboard-section-label">Recent Activity</p>
                <h2 class="dashboard-panel__title">Latest analysis and workflow signals</h2>
              </div>

              <RouterLink class="dashboard-inline-link" to="/activity">View all activity</RouterLink>
            </div>

            <ol class="dashboard-activity-list">
              <li v-for="(activity, index) in decoratedActivities" :key="`${activity.title}-${index}`"
                class="dashboard-activity-item" :style="activity.cardVars">
                <span class="dashboard-activity-item__marker">
                  <Icon :icon="activity.iconName" />
                </span>

                <div class="dashboard-activity-item__copy">
                  <div class="dashboard-activity-item__row">
                    <p class="dashboard-activity-item__title">{{ activity.title }}</p>
                    <span class="dashboard-activity-item__time">{{ activity.time }}</span>
                  </div>
                  <p class="dashboard-activity-item__description">{{ activity.description }}</p>
                </div>
              </li>
            </ol>
          </article>
        </div>

        <div class="dashboard-main-grid__secondary">
          <article class="dashboard-panel">
            <div class="dashboard-panel__header">
              <div>
                <p class="dashboard-section-label">System Status</p>
                <h2 class="dashboard-panel__title">Service and capacity snapshot</h2>
              </div>
            </div>

            <ul class="dashboard-status-list">
              <li v-for="status in decoratedSystemStatus" :key="status.label" class="dashboard-status-item"
                :style="status.cardVars">
                <div class="dashboard-status-item__copy">
                  <span class="dashboard-icon-badge dashboard-icon-badge--sm">
                    <Icon :icon="status.iconName" />
                  </span>
                  <span>{{ status.label }}</span>
                </div>

                <span class="dashboard-status-pill">{{ status.value }}</span>
              </li>
            </ul>
          </article>

          <article class="dashboard-panel dashboard-panel--storage" :style="storageCardVars">
            <div class="dashboard-panel__header">
              <div>
                <p class="dashboard-section-label">Storage</p>
                <h2 class="dashboard-panel__title">Upload volume footprint</h2>
              </div>

              <span class="dashboard-icon-badge">
                <Icon icon="mdi:harddisk" />
              </span>
            </div>

            <div class="dashboard-storage__metric-row">
              <div>
                <p class="dashboard-storage__value">{{ formatStorageAmount(storageUsed) }}</p>
                <p class="dashboard-storage__caption">of {{ formatStorageAmount(storageTotal) }} reserved</p>
              </div>

              <span class="dashboard-storage__percent">{{ storageProgress }}%</span>
            </div>

            <div class="dashboard-progress" aria-hidden="true">
              <span class="dashboard-progress__bar" :style="{ width: `${storageProgress}%` }" />
            </div>

            <p class="dashboard-storage__caption">
              This snapshot uses upload statistics cached with the rest of the dashboard payload for fast
              route transitions.
            </p>
          </article>
        </div>
      </section>
    </section>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import Button from 'primevue/button'
import { computed } from 'vue'
import { useDashboard } from '../composables'

const {
  loading,
  error,
  stats,
  quickActions,
  recentActivities,
  systemStatus,
  storageUsed,
  storageTotal,
  storagePercentage,
  userName,
  refreshStats,
} = useDashboard()

type AccentKey = 'primary' | 'success' | 'warning' | 'info' | 'error'

const accentPalettes: Record<AccentKey, { solid: string; strong: string; soft: string; line: string }> = {
  primary: {
    solid: 'var(--app-accent)',
    strong: 'var(--app-accent-strong)',
    soft: 'var(--app-accent-soft)',
    line: 'var(--app-ring)',
  },
  success: {
    solid: 'var(--app-success)',
    strong: 'var(--app-success-strong)',
    soft: 'var(--app-success-soft)',
    line: 'var(--app-success-line)',
  },
  warning: {
    solid: 'var(--app-warning)',
    strong: 'var(--app-warning-strong)',
    soft: 'var(--app-warning-soft)',
    line: 'var(--app-warning-line)',
  },
  info: {
    solid: 'var(--app-info)',
    strong: 'var(--app-info-strong)',
    soft: 'var(--app-info-soft)',
    line: 'var(--app-info-line)',
  },
  error: {
    solid: 'var(--app-danger)',
    strong: 'var(--app-danger)',
    soft: 'var(--app-danger-soft)',
    line: 'var(--app-danger-line)',
  },
}

const storageProgress = computed(() => Math.min(100, Math.max(0, storagePercentage.value)))
const storageCardVars = computed(() => buildCardVars(storageProgress.value > 80 ? 'error' : 'primary'))

const decoratedStats = computed(() =>
  stats.value.map((item) => ({
    ...item,
    iconName: normalizeIcon(item.icon),
    cardVars: buildCardVars(normalizeColor(item.color)),
  })),
)

const decoratedQuickActions = computed(() =>
  quickActions.map((item) => ({
    ...item,
    iconName: normalizeIcon(item.icon),
    cardVars: buildCardVars(normalizeColor(item.color)),
  })),
)

const decoratedActivities = computed(() =>
  recentActivities.value.map((item) => ({
    ...item,
    iconName: normalizeIcon(item.icon),
    cardVars: buildCardVars(normalizeColor(item.color)),
  })),
)

const decoratedSystemStatus = computed(() =>
  systemStatus.value.map((item) => ({
    ...item,
    iconName: normalizeIcon(item.icon),
    cardVars: buildCardVars(normalizeColor(item.color)),
  })),
)

function normalizeColor(color: string): AccentKey {
  if (color in accentPalettes) {
    return color as AccentKey
  }

  return 'primary'
}

function normalizeIcon(icon: string) {
  return icon.startsWith('mdi-') ? `mdi:${icon.slice(4)}` : icon
}

function buildCardVars(color: AccentKey) {
  const palette = accentPalettes[color]

  return {
    '--dashboard-accent': palette.solid,
    '--dashboard-accent-strong': palette.strong,
    '--dashboard-accent-soft': palette.soft,
    '--dashboard-accent-line': palette.line,
  }
}

function formatMetricValue(value: number) {
  if (Math.abs(value) >= 10000) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }

  return value.toLocaleString()
}

function formatStorageAmount(amount: number) {
  if (amount >= 1024) {
    return `${(amount / 1024).toFixed(1)} GB`
  }

  return `${amount.toFixed(amount >= 100 ? 0 : 1)} MB`
}
</script>

<style scoped>
.dashboard-page {
  display: grid;
  gap: 1.5rem;
  padding-bottom: 1rem;
  --dashboard-surface: linear-gradient(180deg, var(--app-panel-strong), var(--app-panel));
}

.dashboard-hero,
.dashboard-panel,
.dashboard-stat-card,
.dashboard-action-card,
.dashboard-activity-item,
.dashboard-status-item {
  border: 1px solid var(--dashboard-accent-line, var(--app-border));
  background: var(--dashboard-surface);
  box-shadow: var(--app-shadow-soft);
}

.dashboard-hero {
  position: relative;
  overflow: hidden;
  border-color: var(--app-ring);
  border-radius: 0.75rem;
  padding: 1.75rem;
  background:
    radial-gradient(circle at top right, var(--app-accent-soft), transparent 34%),
    radial-gradient(circle at bottom left, var(--app-warning-soft), transparent 28%),
    linear-gradient(135deg, var(--app-panel-strong), var(--app-canvas));
}

.dashboard-hero__content {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
}

.dashboard-hero__copy {
  max-width: 48rem;
}

.dashboard-eyebrow,
.dashboard-section-label,
.dashboard-hero__meta,
.dashboard-panel__eyebrow {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--app-muted);
}

.dashboard-title,
.dashboard-panel__title,
.dashboard-action-card__copy h3,
.dashboard-storage__value,
.dashboard-stat-card__value {
  margin: 0;
  color: var(--app-ink);
}

.dashboard-title,
.dashboard-panel__title,
.dashboard-storage__value {
  font-family: var(--app-display);
}

.dashboard-title {
  margin-top: 0.35rem;
  font-size: clamp(2rem, 4vw, 3.3rem);
  line-height: 1.02;
}

.dashboard-lead,
.dashboard-action-card__copy p,
.dashboard-storage__caption,
.dashboard-activity-item__description,
.dashboard-stat-card__caption,
.dashboard-inline-link,
.dashboard-activity-item__time {
  margin: 0;
  color: var(--app-muted);
}

.dashboard-lead {
  margin-top: 0.75rem;
  max-width: 42rem;
  font-size: 1rem;
  line-height: 1.65;
}

.dashboard-alert {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 1rem;
  padding: 0.7rem 0.95rem;
  border: 1px solid var(--app-danger-line);
  border-radius: 999px;
  background: var(--app-danger-soft);
  color: var(--app-danger);
  font-size: 0.92rem;
}

.dashboard-hero__actions {
  display: grid;
  gap: 0.75rem;
  justify-items: flex-end;
}

.dashboard-button__content,
.dashboard-panel__eyebrow,
.dashboard-inline-link,
.dashboard-trend,
.dashboard-activity-item__row,
.dashboard-status-item__copy,
.dashboard-storage__metric-row {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.dashboard-button__content {
  font-weight: 600;
}

.dashboard-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.dashboard-stat-card,
.dashboard-panel,
.dashboard-action-card,
.dashboard-activity-item,
.dashboard-status-item {
  border-radius: 0.75rem;
}

.dashboard-stat-card {
  display: grid;
  gap: 1.4rem;
  padding: 1.25rem;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.dashboard-stat-card:hover,
.dashboard-action-card:hover,
.dashboard-activity-item:hover,
.dashboard-status-item:hover {
  transform: translateY(-2px);
}

.dashboard-stat-card__top,
.dashboard-stat-card__bottom,
.dashboard-panel__header,
.dashboard-action-card,
.dashboard-activity-item,
.dashboard-status-item,
.dashboard-progress {
  display: flex;
}

.dashboard-stat-card__top,
.dashboard-stat-card__bottom,
.dashboard-panel__header,
.dashboard-action-card,
.dashboard-activity-item,
.dashboard-status-item {
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.dashboard-stat-card__value {
  margin-top: 0.8rem;
  font-size: clamp(1.75rem, 2.7vw, 2.35rem);
  font-weight: 700;
}

.dashboard-trend {
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: var(--dashboard-accent-soft);
  font-size: 0.84rem;
  font-weight: 700;
}

.dashboard-trend.is-positive {
  color: var(--dashboard-accent);
}

.dashboard-trend.is-negative {
  color: var(--app-danger);
}

.dashboard-icon-badge {
  display: inline-grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border-radius: 0.5rem;
  background: var(--dashboard-accent-soft, rgba(15, 118, 110, 0.1));
  color: var(--dashboard-accent, var(--app-accent));
  font-size: 1.2rem;
  flex-shrink: 0;
}

.dashboard-icon-badge--sm {
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  font-size: 1rem;
}

.dashboard-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 0.85fr);
  gap: 1.25rem;
}

.dashboard-main-grid__primary,
.dashboard-main-grid__secondary,
.dashboard-panel {
  display: grid;
  gap: 1rem;
}

.dashboard-panel {
  padding: 1.3rem;
}

.dashboard-panel__title {
  margin-top: 0.25rem;
  font-size: 1.125rem;
}

.dashboard-panel__header--split {
  align-items: flex-start;
}

.dashboard-panel__eyebrow {
  gap: 0.35rem;
  color: var(--dashboard-accent, var(--app-accent));
}

.dashboard-actions-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}

.dashboard-action-card {
  min-height: 100%;
  padding: 1rem;
  text-decoration: none;
}

.dashboard-action-card__copy {
  flex: 1;
}

.dashboard-action-card__copy h3 {
  font-size: 1.05rem;
  font-weight: 700;
}

.dashboard-action-card__copy p {
  margin-top: 0.35rem;
  line-height: 1.5;
  font-size: 0.92rem;
}

.dashboard-action-card__arrow {
  color: var(--dashboard-accent, var(--app-accent));
  font-size: 1.1rem;
}

.dashboard-inline-link {
  font-size: 0.94rem;
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: var(--app-ring);
  text-underline-offset: 0.18rem;
}

.dashboard-activity-list,
.dashboard-status-list {
  display: grid;
  gap: 0.85rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dashboard-activity-item,
.dashboard-status-item {
  padding: 0.95rem 1rem;
}

.dashboard-activity-item__marker {
  display: inline-grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border-radius: 999px;
  background: var(--dashboard-accent-soft);
  color: var(--dashboard-accent);
  flex-shrink: 0;
}

.dashboard-activity-item__copy {
  flex: 1;
  min-width: 0;
}

.dashboard-activity-item__row {
  justify-content: space-between;
}

.dashboard-activity-item__title,
.dashboard-storage__percent,
.dashboard-status-pill {
  margin: 0;
  color: var(--app-ink);
  font-weight: 700;
}

.dashboard-activity-item__title {
  font-size: 0.98rem;
}

.dashboard-activity-item__description {
  margin-top: 0.35rem;
  font-size: 0.92rem;
  line-height: 1.55;
}

.dashboard-activity-item__time {
  font-size: 0.82rem;
  white-space: nowrap;
}

.dashboard-status-item__copy {
  font-weight: 600;
}

.dashboard-status-pill {
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: var(--dashboard-accent-soft);
  color: var(--dashboard-accent);
  font-size: 0.84rem;
  text-align: right;
}

.dashboard-panel--storage {
  --dashboard-accent: var(--app-accent);
  --dashboard-accent-strong: var(--app-accent-strong);
  --dashboard-accent-soft: var(--app-accent-soft);
  --dashboard-accent-line: var(--app-ring);
}

.dashboard-storage__metric-row {
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
}

.dashboard-storage__value {
  font-size: clamp(1.85rem, 4vw, 2.75rem);
  line-height: 1;
}

.dashboard-storage__caption {
  margin-top: 0.35rem;
  line-height: 1.55;
}

.dashboard-storage__percent {
  font-size: 1.1rem;
  color: var(--dashboard-accent);
}

.dashboard-progress {
  width: 100%;
  height: 0.7rem;
  border-radius: 999px;
  background: var(--dashboard-accent-soft);
  overflow: hidden;
}

.dashboard-progress__bar {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--dashboard-accent), var(--dashboard-accent-strong));
}

@media (max-width: 1200px) {

  .dashboard-stats-grid,
  .dashboard-actions-grid,
  .dashboard-main-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-main-grid__secondary {
    grid-column: 1 / -1;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {

  .dashboard-hero,
  .dashboard-panel,
  .dashboard-stat-card {
    padding: 1.1rem;
  }

  .dashboard-hero__actions {
    justify-items: flex-start;
  }

  .dashboard-stats-grid,
  .dashboard-actions-grid,
  .dashboard-main-grid,
  .dashboard-main-grid__secondary {
    grid-template-columns: minmax(0, 1fr);
  }

  .dashboard-action-card,
  .dashboard-activity-item,
  .dashboard-status-item,
  .dashboard-storage__metric-row,
  .dashboard-panel__header {
    align-items: flex-start;
  }

  .dashboard-action-card,
  .dashboard-activity-item,
  .dashboard-status-item,
  .dashboard-storage__metric-row {
    flex-direction: column;
  }

  .dashboard-activity-item__row {
    display: grid;
    gap: 0.35rem;
  }

  .dashboard-status-pill {
    text-align: left;
  }
}
</style>
