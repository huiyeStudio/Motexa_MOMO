<script setup lang="ts">
import ThemeSettings from './ThemeSettings.vue'
import { useDashboard } from './useDashboard'

const { context, snapshot, config, draft, saving, notice, isSettings, hasCapability, orientation,
  speed, speedState, power, stateClass, themeStyle, value, display, request, save, lastActionError } = useDashboard()

// 仪表显示的核心指标
const dashboardMetricKeys = ['soc', 'voltage', 'controllerRpm', 'efficiency'] as const

// 车辆状态显示（挡位和驻车状态）
const driveStatus = (key: 'vehicleGear' | 'vehicleParking') => {
  const metric = value(key)
  if (metric?.freshness !== 'fresh' || metric.value == null) return '--'
  return key === 'vehicleGear' ? ['', '低挡', '中挡', '高挡'][metric.value] ?? '--'
    : metric.value === 1 ? 'P' : '已解除P'
}

// 获取速度百分比用于进度条
const speedPercent = () => {
  const maxSpeed = 120 // 最大显示速度 km/h
  const currentSpeed = parseFloat(speed.value) || 0
  return Math.min((currentSpeed / maxSpeed) * 100, 100)
}

// 获取电量颜色
const socColor = () => {
  const socValue = value('soc')
  if (!socValue || socValue.value == null) return 'var(--accent)'
  if (socValue.value < 20) return '#ff4444'
  if (socValue.value < 50) return '#ffaa00'
  return 'var(--accent)'
}
</script>

<template>
  <main v-if="snapshot" class="momo-theme" :class="stateClass" :style="themeStyle" :data-animation="config.animationStyle">
    <ThemeSettings v-if="isSettings" v-model="draft" :locale="context?.locale ?? 'zh-CN'"
      :saving="saving" :can-save="hasCapability('theme.config-patch')" :can-back="hasCapability('theme.open-picker')"
      :notice="notice" @save="save" @back="request('theme.open-picker')" />
    
    <template v-else>
      <!-- 顶部状态栏 -->
      <header class="momo-header">
        <div class="momo-brand">
          <div class="momo-logo">MOMO</div>
          <span class="momo-status">{{ snapshot.scene.status.isRecording ? '● 记录中' : '就绪' }}</span>
        </div>
        
        <div class="momo-connection">
          <span v-for="item in snapshot.scene.status.items" :key="item.key" 
            :class="['connection-item', `state-${item.state}`]">
            {{ item.label }}
          </span>
        </div>
        
        <div class="momo-actions">
          <button v-if="hasCapability('theme.open-settings')" 
            type="button" class="action-btn" 
            aria-label="打开主题设置" 
            title="设置" 
            @click="request('theme.open-settings')">
            ⚙
          </button>
          <button v-if="hasCapability('display.set-orientation')" 
            type="button" class="action-btn" 
            aria-label="切换方向" 
            title="旋转" 
            @click="request('display.set-orientation', { mode: orientation === 'landscape' ? 'portrait' : 'landscape' })">
            ⟲
          </button>
          <button v-if="hasCapability('ride.request-exit')" 
            type="button" class="action-btn" 
            aria-label="退出" 
            title="退出" 
            @click="request('ride.request-exit')">
            ✕
          </button>
        </div>
      </header>

      <!-- 主速度显示区域 -->
      <section class="momo-speed-hero" :data-speed-state="speedState">
        <div class="speed-container">
          <div class="speed-label">速度</div>
          <div class="speed-value">
            <span class="speed-number">{{ speed }}</span>
            <span class="speed-unit">km/h</span>
          </div>
          
          <!-- 速度进度条 -->
          <div class="speed-progress-bar">
            <div class="speed-progress-fill" :style="{ width: speedPercent() + '%' }"></div>
          </div>
          
          <!-- 功率显示 -->
          <div v-if="config.showPower" class="speed-power">
            <span class="power-icon">⚡</span>
            <span class="power-value">{{ power }}</span>
            <span class="power-unit">W</span>
          </div>
        </div>

        <!-- 圆形速度指示器（装饰） -->
        <div class="speed-ring">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" class="ring-bg" />
            <circle cx="100" cy="100" r="90" class="ring-progress" 
              :style="{ strokeDashoffset: 565 - (565 * speedPercent() / 100) }" />
          </svg>
        </div>
      </section>

      <!-- 车辆状态（挡位和驻车） -->
      <section class="momo-drive-status">
        <div class="status-item" :data-freshness="value('vehicleGear')?.freshness ?? 'unavailable'">
          <div class="status-icon">⚙</div>
          <div class="status-content">
            <span class="status-label">挡位</span>
            <strong class="status-value">{{ driveStatus('vehicleGear') }}</strong>
          </div>
        </div>
        <div class="status-item" :data-freshness="value('vehicleParking')?.freshness ?? 'unavailable'">
          <div class="status-icon">🅿</div>
          <div class="status-content">
            <span class="status-label">驻车</span>
            <strong class="status-value">{{ driveStatus('vehicleParking') }}</strong>
          </div>
        </div>
      </section>

      <!-- 核心指标网格 -->
      <section class="momo-metrics-grid">
        <article v-for="metric in dashboardMetricKeys" :key="metric" 
          class="metric-card" 
          :data-freshness="value(metric)?.freshness ?? 'unavailable'">
          <div class="metric-header">
            <span class="metric-icon">
              {{ metric === 'soc' ? '🔋' : metric === 'voltage' ? '⚡' : metric === 'controllerRpm' ? '🔄' : '📊' }}
            </span>
            <span class="metric-label">{{ 
              metric === 'soc' ? '电量' : 
              metric === 'voltage' ? '电压' : 
              metric === 'controllerRpm' ? '转速' : 
              '效率' 
            }}</span>
          </div>
          <div class="metric-value">{{ display(metric) }}</div>
          
          <!-- 电量特殊显示 -->
          <div v-if="metric === 'soc' && value('soc')?.value != null" class="soc-bar">
            <div class="soc-fill" :style="{ width: value('soc')!.value + '%', backgroundColor: socColor() }"></div>
          </div>
        </article>
      </section>

      <!-- 底部装饰 -->
      <div class="momo-footer">
        <div class="footer-pulse"></div>
      </div>
    </template>
  </main>
</template>

<style scoped>
.momo-theme {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* 动画风格变量 */
.momo-theme[data-animation="smooth"] {
  --transition-speed: 0.3s;
  --animation-intensity: 1;
}
.momo-theme[data-animation="energetic"] {
  --transition-speed: 0.15s;
  --animation-intensity: 1.5;
}
.momo-theme[data-animation="minimal"] {
  --transition-speed: 0.5s;
  --animation-intensity: 0.5;
}

/* 顶部状态栏 */
.momo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
}

.momo-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.momo-logo {
  font-size: 1.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent), #fff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 2px;
}

.momo-status {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

.momo-connection {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.connection-item {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  transition: all var(--transition-speed);
}

.connection-item.state-connected {
  background: rgba(0, 255, 128, 0.2);
  color: #00ff80;
}

.momo-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all var(--transition-speed);
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: var(--accent);
  transform: scale(1.1);
}

/* 主速度显示 */
.momo-speed-hero {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 2rem;
}

.speed-container {
  text-align: center;
  z-index: 2;
}

.speed-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 0.5rem;
}

.speed-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.5rem;
}

.speed-number {
  font-size: 5rem;
  font-weight: 700;
  line-height: 1;
  color: var(--accent);
  text-shadow: 0 0 20px var(--accent);
  transition: all var(--transition-speed);
}

.speed-unit {
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.7);
}

.speed-progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin-top: 1.5rem;
  overflow: hidden;
}

.speed-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #fff);
  transition: width var(--transition-speed);
  border-radius: 3px;
  box-shadow: 0 0 10px var(--accent);
}

.speed-power {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
  font-size: 1.25rem;
}

.power-icon {
  color: #ffaa00;
}

.power-value {
  font-weight: 600;
  color: var(--accent);
}

.power-unit {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

/* 圆形速度指示器 */
.speed-ring {
  position: absolute;
  width: 300px;
  height: 300px;
  opacity: 0.3;
}

.ring-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 8;
}

.ring-progress {
  fill: none;
  stroke: var(--accent);
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 565;
  stroke-dashoffset: 565;
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dashoffset var(--transition-speed);
  filter: drop-shadow(0 0 10px var(--accent));
}

/* 车辆状态 */
.momo-drive-status {
  display: flex;
  gap: 1rem;
  padding: 0 1rem;
  margin-bottom: 1rem;
}

.status-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all var(--transition-speed);
}

.status-item[data-freshness="fresh"] {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
}

.status-icon {
  font-size: 2rem;
}

.status-content {
  display: flex;
  flex-direction: column;
}

.status-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
}

.status-value {
  font-size: 1.125rem;
  color: var(--accent);
}

/* 指标网格 */
.momo-metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  padding: 0 1rem 1rem;
}

.metric-card {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all var(--transition-speed);
  position: relative;
  overflow: hidden;
}

.metric-card[data-freshness="fresh"] {
  border-color: rgba(var(--accent-rgb), 0.5);
}

.metric-card[data-freshness="stale"],
.metric-card[data-freshness="unavailable"] {
  opacity: 0.5;
}

.metric-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.metric-icon {
  font-size: 1.5rem;
}

.metric-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--accent);
}

/* 电量条 */
.soc-bar {
  margin-top: 0.75rem;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.soc-fill {
  height: 100%;
  transition: width var(--transition-speed);
  border-radius: 2px;
}

/* 底部装饰 */
.momo-footer {
  padding: 1rem;
  display: flex;
  justify-content: center;
}

.footer-pulse {
  width: 60px;
  height: 4px;
  background: var(--accent);
  border-radius: 2px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.5;
    transform: scaleX(1);
  }
  50% {
    opacity: 1;
    transform: scaleX(1.5);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .speed-number {
    font-size: 4rem;
  }
  .speed-ring {
    width: 250px;
    height: 250px;
  }
}
</style>
