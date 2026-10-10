import { computed, onBeforeUnmount, ref } from 'vue'
import { createRideUiClient } from '@motexa/ride-ui-sdk/client'
import { resolveRideUiSpeedPrecision } from '@motexa/ride-ui-sdk/contract'
import type {
  RideUiActionNameV1, RideUiDisplayFrameV1, RideUiFastFrameV1,
  RideUiInitContextV1, RideUiTelemetryKeyV1,
} from '@motexa/ride-ui-sdk/contract'
import manifest from '../ride-ui.json'

export interface DashboardConfig {
  accent: 'lime' | 'cyan' | 'amber' | 'purple' | 'orange'
  hideSpeedDecimal: boolean
  showPower: boolean
  animationStyle: 'smooth' | 'energetic' | 'minimal'
}

const normalizeConfig = (data: unknown): DashboardConfig => {
  const value = data as Partial<DashboardConfig> | null
  const validAccent = ['cyan', 'amber', 'purple', 'orange', 'lime'].includes(value?.accent as string) ? value!.accent! : 'cyan'
  const validAnimation = ['energetic', 'minimal', 'smooth'].includes(value?.animationStyle as string) ? value!.animationStyle! : 'smooth'
  return {
    accent: validAccent as DashboardConfig['accent'],
    hideSpeedDecimal: value?.hideSpeedDecimal === true,
    showPower: value?.showPower !== false,
    animationStyle: validAnimation as DashboardConfig['animationStyle'],
  }
}

export const useDashboard = () => {
  const client = createRideUiClient(manifest.id)
  const context = ref<RideUiInitContextV1 | null>(null)
  const snapshot = ref<RideUiInitContextV1['snapshot'] | null>(null)
  const fastFrame = ref<RideUiFastFrameV1 | null>(null)
  const displayFrame = ref<RideUiDisplayFrameV1 | null>(null)
  const config = ref(normalizeConfig(manifest.config.default))
  const draft = ref({ ...config.value })
  const configRevision = ref(0)
  const saving = ref(false)
  const notice = ref('')
  const lastActionError = ref('')
  const isSettings = computed(() => context.value?.mode === 'theme-settings')
  const hasCapability = (action: RideUiActionNameV1) => context.value?.capabilities.includes(action) === true
  const orientation = computed(() => snapshot.value?.scene.layout.orientation ?? 'landscape')
  const speed = computed(() => {
    // A missing display frame is authoritative; never restore measured speed.
    const value = displayFrame.value ? displayFrame.value.speedKmh
      : fastFrame.value ? fastFrame.value.speedNumericValue : snapshot.value?.scene.hero.speedNumericValue
    return value == null ? '--' : value.toFixed(resolveRideUiSpeedPrecision(context.value?.speedDecimalEnabled === true, config.value.hideSpeedDecimal))
  })
  const speedState = computed(() => displayFrame.value?.state ?? fastFrame.value?.speedDisplayState ?? snapshot.value?.scene.hero.speedDisplayState)
  const power = computed(() => fastFrame.value?.powerDisplay ?? snapshot.value?.scene.hero.powerDisplay ?? '--')
  const stateClass = computed(() => ({
    'is-light': context.value?.colorScheme === 'light',
    'is-portrait': orientation.value === 'portrait',
    'is-low-power': snapshot.value?.scene.layout.lowPower === true,
    'is-settings': isSettings.value,
  }))
  const themeStyle = computed(() => {
    const accentColors = { 
      lime: '#b7f36b', 
      cyan: '#60d7ff', 
      amber: '#ffc36a',
      purple: '#c084fc',
      orange: '#fb923c'
    }
    const accentRgb = {
      lime: '183, 243, 107',
      cyan: '96, 215, 255',
      amber: '255, 195, 106',
      purple: '192, 132, 252',
      orange: '251, 146, 60'
    }
    return {
      '--accent': accentColors[config.value.accent],
      '--accent-rgb': accentRgb[config.value.accent],
      '--safe-top': `${context.value?.safeArea.top ?? 0}px`,
      '--safe-right': `${context.value?.safeArea.right ?? 0}px`,
      '--safe-bottom': `${context.value?.safeArea.bottom ?? 0}px`,
      '--safe-left': `${context.value?.safeArea.left ?? 0}px`,
    }
  })
  const value = (key: RideUiTelemetryKeyV1) => snapshot.value?.telemetry[key] ?? null
  const display = (key: RideUiTelemetryKeyV1) => {
    const metric = value(key)
    return metric?.value == null ? '--' : `${metric.displayValue}${metric.displayUnit ? ` ${metric.displayUnit}` : ''}`
  }
  const request = async (action: RideUiActionNameV1, payload?: unknown) => {
    if (!hasCapability(action)) return
    const result = await client.requestAction(action, payload)
    lastActionError.value = result.ok ? '' : result.error?.message ?? 'Action failed.'
  }
  const save = async () => {
    if (saving.value || !hasCapability('theme.config-patch')) return
    saving.value = true
    notice.value = ''
    const result = await client.requestAction('theme.config-patch', {
      schemaVersion: manifest.config.schemaVersion, baseRevision: configRevision.value, patch: { ...draft.value },
    })
    saving.value = false
    const returned = (result.result as { config?: RideUiInitContextV1['config'] } | null)?.config
    if (returned) {
      configRevision.value = returned.revision
      config.value = normalizeConfig(returned.data)
    }
    if (result.ok || result.error?.code === 'conflict') draft.value = { ...config.value }
    notice.value = result.ok ? (context.value?.locale.startsWith('zh') ? '已保存' : 'Saved')
      : result.error?.code === 'conflict' ? (context.value?.locale.startsWith('zh') ? '设置已更新，请重新选择后保存' : 'Settings changed. Review and save again.')
      : result.error?.message ?? 'Save failed.'
  }

  const unsubscribers = [
    client.subscribeContext(next => {
      const enteringSettings = next.mode === 'theme-settings' && !isSettings.value
      if (enteringSettings) notice.value = ''
      context.value = next
      configRevision.value = next.config.revision
      config.value = normalizeConfig(next.config.data)
      if (enteringSettings || next.mode !== 'theme-settings') draft.value = { ...config.value }
      document.documentElement.lang = next.locale
      document.documentElement.dataset.theme = next.colorScheme
    }),
    client.subscribeSnapshot(next => { snapshot.value = next }),
    client.subscribeFrame(next => { fastFrame.value = next }),
    client.subscribeDisplayFrame(next => { displayFrame.value = next }),
  ]
  const reportError = (event: ErrorEvent) => client.reportError(event.error ?? event.message)
  const reportRejection = (event: PromiseRejectionEvent) => client.reportError(event.reason)
  window.addEventListener('error', reportError)
  window.addEventListener('unhandledrejection', reportRejection)
  client.ready()
  onBeforeUnmount(() => {
    unsubscribers.forEach(unsubscribe => unsubscribe())
    window.removeEventListener('error', reportError)
    window.removeEventListener('unhandledrejection', reportRejection)
    client.dispose()
  })
  return { context, snapshot, config, draft, saving, notice, isSettings, hasCapability, orientation, speed, speedState,
    power, stateClass, themeStyle, value, display, request, save, lastActionError }
}
