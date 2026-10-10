# Motexa Ride UI SDK 开发知识库

> **版本信息**: SDK 1.5.0 | API 1.11 | Demo 0.2.0  
> **最后更新**: 2026-10-10

---

## 📋 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [核心概念](#核心概念)
- [开发指南](#开发指南)
- [API参考](#api参考)
- [调试与测试](#调试与测试)
- [构建与发布](#构建与发布)
- [常见问题](#常见问题)

---

## 概述

### 什么是Motexa Ride UI SDK

Motexa Ride UI SDK用于开发运行在**Motexa App内**的Web仪表主题。主题订阅App已转换的标准车辆数据，并通过能力受限的消息接口请求展示交互。

**核心特性**：
- ✅ 标准化的车辆数据接口
- ✅ 浏览器内调试，无需真实设备
- ✅ Vue/TypeScript示例代码
- ✅ 完整的类型定义
- ✅ 多语言支持（中文/英文）

### 数据流向

```
车辆 → App连接与协议转换层 → 标准展示数据 → SDK → 主题
主题 → SDK动作请求 → App策略校验与执行 → 动作结果
```

**重要说明**：
- SDK不携带车辆协议实现
- 开发者无需了解设备原始帧
- 真实数据由App主题宿主提供
- 独立第三方App无法使用此SDK

### 能力与限制

**支持的功能**：
- 📊 展示数据订阅（速度、电量、功率等）
- 🎨 主题配置与设置
- 🔄 刷新、方向切换等受控动作
- 📱 横竖屏适配
- 🌓 深色/浅色主题

**不支持的功能**：
- ❌ 独立第三方Android App接口
- ❌ 任意原生插件调用
- ❌ 设备驱动或车辆参数写入
- ❌ 跨App数据服务

---

## 快速开始

### 环境要求

```bash
Node.js: >= 22.12.0 (推荐22 LTS)
pnpm: 10.33.2
浏览器: 现代浏览器（Chrome、Edge、Firefox等）
```

**Windows注意事项**: 使用`pnpm.cmd`可避免PowerShell脚本执行策略影响

### 安装与启动

```bash
# 1. 安装依赖
pnpm install --frozen-lockfile

# 2. 启动开发服务器
pnpm dev

# 3. 浏览器打开显示的地址，访问 /mock-host.html
```

**预期结果**：
- 显示 `Theme connected`
- 右侧出现仪表界面
- 可以看到模拟的车辆数据

### 最小示例代码

```typescript
import { createRideUiClient } from '@motexa/ride-ui-sdk/client'
import manifest from '../ride-ui.json'

const client = createRideUiClient(manifest.id)

client.subscribeSnapshot(snapshot => {
  const soc = snapshot.telemetry.soc
  const label = soc.value == null ? '--' : soc.displayValue
  console.log(label)
})

client.ready()

// 组件卸载时
// client.dispose()
```

---

## 项目结构

### 目录说明

```
.
├── theme/                      # 主题源码目录
│   ├── src/                    # Vue组件源码
│   │   ├── PartnerTheme.vue   # 仪表布局与展示
│   │   ├── useDashboard.ts    # 客户端订阅逻辑
│   │   ├── ThemeSettings.vue  # 主题设置界面
│   │   └── style.css          # 主题样式
│   ├── ride-ui.json           # 主题清单（重要！）
│   ├── submission.json        # 源码提交信息
│   └── config.schema.json     # 设置字段schema
│
├── vendor/ride-ui-sdk/        # SDK本体
│   ├── dist/                  # 编译后的SDK
│   │   ├── client.d.ts       # 客户端类型定义
│   │   ├── contract.d.ts     # 数据契约类型
│   │   └── replay.d.ts       # 回放工具类型
│   └── tools/                # SDK工具
│
├── docs/                      # 文档目录
│   ├── zh-CN/                # 中文文档
│   └── en-US/                # 英文文档
│
├── tools/                     # 开发工具
│   ├── theme-check.mjs       # 主题校验
│   ├── theme-pack-runtime.mjs # 运行包打包
│   └── build-docs.mjs        # 文档构建
│
├── reference/                 # 参考文件
│   └── ride-ui-manifest-v1.json
│
├── mock-host.ts              # 浏览器模拟宿主
├── mock-config.ts            # 调试器配置存储
└── package.json              # 项目配置
```

### 关键文件说明

| 文件 | 用途 | 修改频率 |
|------|------|---------|
| `theme/src/PartnerTheme.vue` | 仪表UI布局 | 高 |
| `theme/src/useDashboard.ts` | 数据订阅逻辑 | 高 |
| `theme/ride-ui.json` | 主题身份与配置 | 创建时必改 |
| `theme/config.schema.json` | 设置项定义 | 中 |
| `mock-host.ts` | 调试器（不打包） | 低 |

---

## 核心概念

### 1. 主题清单 (ride-ui.json)

主题清单描述主题的身份、API要求、能力声明和运行环境。

**关键字段**：

```json
{
  "manifestVersion": 1,
  "id": "partner.example-dashboard",      // 唯一标识
  "name": "Partner Dashboard",             // 显示名称
  "version": "0.2.0",                      // 版本号
  "entry": "src/main.ts",                  // 入口文件
  "api": {
    "major": 1,                            // API主版本
    "minMinor": 11                         // 最低次版本
  },
  "orientations": ["portrait", "landscape"], // 支持方向
  "requiredCapabilities": [],              // 必需能力
  "optionalCapabilities": [                // 可选能力
    "ride.refresh",
    "display.set-orientation",
    "theme.config-patch"
  ]
}
```

**修改要点**：
- 发布自己的主题时必须修改`id`为唯一值
- `version`遵循语义化版本
- 能力声明要与实际使用匹配

### 2. 客户端生命周期

```typescript
// 1. 创建客户端
const client = createRideUiClient('your-theme-id')

// 2. 订阅数据（在ready()之前）
client.subscribeContext(context => { /* 宿主环境 */ })
client.subscribeSnapshot(snapshot => { /* 完整快照 */ })
client.subscribeDisplayFrame(frame => { /* 显示帧 */ })

// 3. 通知就绪
client.ready()

// 4. 请求动作
const result = await client.requestAction('ride.refresh')

// 5. 清理资源
client.dispose()
```

**执行顺序**：
1. 先注册所有监听器
2. 再调用`ready()`
3. SDK自动处理握手

### 3. 数据结构

#### 遥测值 (RideUiMetricValueV1)

```typescript
interface RideUiMetricValueV1 {
  value: number | null              // 数值，null表示不可用
  canonicalUnit: string             // 计算单位
  displayValue: string              // 格式化文本
  displayUnit: string               // 展示单位
  source: 'gps' | 'bms' | 'controller' | 'vehicle' | 'fused' | 'none'
  quality: 'measured' | 'fused' | 'held' | 'estimated' | 'missing'
  freshness: 'fresh' | 'stale' | 'unavailable'
  sampledAtEpochMs: number | null   // 采样时间
}
```

**使用原则**：
- ✅ `null`不能补成0
- ✅ 普通文本优先用`displayValue`
- ✅ 图形计算用`value`和`canonicalUnit`
- ✅ 检查`freshness`判断数据新鲜度

#### 常用遥测键

```typescript
// 从RIDE_UI_TELEMETRY_KEYS_V1导出
const keys = [
  'speed',              // 速度
  'soc',                // 电量百分比
  'power',              // 功率
  'busCurrent',         // 总线电流
  'busVoltage',         // 总线电压
  'temperature',        // 温度
  'range',              // 续航
  'odometer',           // 里程
  'tripDistance',       // 本次行程距离
  'vehicleGear',        // 挡位 (API 1.11)
  'vehicleParking'      // P状态 (API 1.11)
]
```

---

## 开发指南

### 开发流程

```bash
# 1. 检查清单与源码规则
pnpm theme:check

# 2. TypeScript类型检查
pnpm typecheck

# 3. 验证合成回放场景
pnpm theme:replay-check

# 4. 构建开发版本
pnpm theme:build

# 5. 构建运行包
pnpm theme:pack-runtime

# 6. 验证运行包
pnpm theme:runtime-check
```

### 主题设置实现

```typescript
// 1. 从context获取配置
let context: RideUiInitContextV1 | null = null
client.subscribeContext(next => { context = next })

// 2. 编辑草稿
const draft = { ...context.config.data }
draft.accent = 'cyan'

// 3. 保存配置
const result = await client.requestAction('theme.config-patch', {
  schemaVersion: context.config.schemaVersion,
  baseRevision: context.config.revision,
  patch: draft
})

// 4. 处理结果
if (result.ok) {
  const returned = result.result?.config
  if (returned) {
    // 采用宿主返回的最新配置
  }
} else {
  // 处理错误（conflict/denied等）
}
```

**配置schema示例**：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "accent": {
      "type": "string",
      "enum": ["lime", "cyan", "amber"],
      "default": "lime"
    },
    "hideSpeedDecimal": {
      "type": "boolean",
      "default": false
    },
    "showPower": {
      "type": "boolean",
      "default": true
    }
  }
}
```

### 显示帧处理 (API 1.11)

```typescript
client.subscribeDisplayFrame(frame => {
  // 使用frame.speedKmh，包括null
  const text = frame.speedKmh == null ? '--' : frame.speedKmh.toFixed(0)
  
  // 状态：live / held / missing
  console.log(text, frame.state)
  
  // 不要回退到telemetry.speed
})
```

**注意事项**：
- 收到显示帧后，速度必须使用`frame.speedKmh`
- `telemetry.speed`保持测量语义
- 不要在主题中叠加第二次平滑

### 挡位与P状态 (API 1.11)

```typescript
client.subscribeSnapshot(snapshot => {
  const gear = snapshot.telemetry.vehicleGear
  const parking = snapshot.telemetry.vehicleParking
  
  // 挡位：1=低挡，2=中挡，3=高挡
  const gearText = gear?.freshness === 'fresh' && gear.value != null
    ? { 1: '低挡', 2: '中挡', 3: '高挡' }[gear.value] ?? '--'
    : '--'
  
  // P状态：1=处于P，0=解除P
  const parkingText = parking?.freshness === 'fresh' && parking.value != null
    ? parking.value === 1 ? 'P' : '已解除P'
    : '--'
})
```

**重要**：不要用真值判断过滤`0`（解除P的值为0）

---

## API参考

### 客户端方法

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `ready()` | 通知宿主主题已准备好 | `void` |
| `subscribeContext(listener)` | 订阅宿主环境与配置 | `() => void` |
| `subscribeSnapshot(listener)` | 订阅完整数据快照 | `() => void` |
| `subscribeFrame(listener)` | 订阅高频快帧 | `() => void` |
| `subscribeDisplayFrame(listener)` | 订阅速度显示帧 | `() => void` |
| `requestAction(action, payload?)` | 请求动作 | `Promise<Result>` |
| `reportError(error)` | 报告错误 | `void` |
| `dispose()` | 释放资源 | `void` |

### 可用动作

| 动作名称 | 说明 | Payload |
|---------|------|---------|
| `ride.refresh` | 请求刷新 | 无 |
| `ride.request-exit` | 请求退出 | 无 |
| `display.set-orientation` | 切换方向 | `{ mode: 'portrait'\|'landscape' }` |
| `theme.open-picker` | 打开主题选择器 | 无 |
| `theme.open-settings` | 打开主题设置 | 无 |
| `theme.config-patch` | 提交配置 | `{ schemaVersion, baseRevision, patch }` |
| `vehicle.open-settings` | 打开车辆设置（仅请求界面） | 无 |

**动作结果**：

```typescript
interface ActionResult {
  requestId: string
  ok: boolean
  result?: any
  error?: {
    code: 'denied' | 'unavailable' | 'invalid' | 'conflict' | 'timeout' | 'failed'
    message?: string
  }
}
```

### 环境上下文 (Context)

```typescript
interface RideUiInitContextV1 {
  mode: 'live-dashboard' | 'theme-settings' | 'read-only-preview'
  locale: string                    // zh-CN / en-US
  colorScheme: 'light' | 'dark'
  orientation: 'portrait' | 'landscape'
  safeArea: { top, right, bottom, left }
  capabilities: string[]            // 当前可用能力
  speedDecimalEnabled: boolean
  config: {
    schemaVersion: number
    revision: string
    data: object
  }
  environment?: {
    host: 'phone' | 'agent'
    renderTarget: 'phone' | 'vehicle-cast'
    dataCapabilities: string[]
  }
}
```

---

## 调试与测试

### 浏览器调试器

**启动调试器**：

```bash
# 开发模式
pnpm dev
# 访问 http://localhost:5173/mock-host.html

# 预览构建产物
pnpm theme:build
pnpm exec vite preview --outDir dist/development --port 5187
# 访问 http://127.0.0.1:5187/mock-host.html
```

**调试器控件**：

| 控件 | 功能 |
|------|------|
| Replay scenario | 选择7种预设场景 |
| Speed / Power | 手动设置速度和功率 |
| Width / Height | 调整视口尺寸 |
| Orientation | 横屏/竖屏 |
| Mode | 实时仪表/设置/预览 |
| Color scheme | 深色/浅色 |
| Telemetry quality | fresh/stale/missing |
| Vehicle gear/Parking | 手动选择挡位和P状态 |
| Action response | 模拟动作成功/拒绝 |

### 七种回放场景

| 场景ID | 测试目的 |
|--------|---------|
| `normal` | 正常加减速与功率展示 |
| `vehicle-status` | 六种挡位/P组合，陈旧与不可用状态 |
| `missing-gps` | GPS缺失时的降级展示 |
| `stale` | 过期数据的held/stale状态 |
| `regeneration` | 负功率（回收能量）显示 |
| `source-switch` | 数据来源切换 |
| `clock-shift` | 时钟回退处理 |

### 测试检查清单

- [ ] 横屏和竖屏布局正常
- [ ] 320px最小宽度显示正常
- [ ] 深色/浅色主题适配
- [ ] 缺失数据显示`--`而非0
- [ ] 过期数据有视觉提示
- [ ] 低功耗模式减少动画
- [ ] 设置保存和冲突处理
- [ ] 动作拒绝的错误提示
- [ ] 所有回放场景通过

---

## 构建与发布

### 构建命令

```bash
# 完整发布构建
pnpm release:build

# 输出目录：dist/release/
# - Motexa-Ride-UI-SDK-1.5.0-GitHub.zip (源码)
# - Motexa-Ride-UI-SDK-1.5.0-GitHub-Release.zip (完整包)
# - Motexa-Ride-UI-SDK-1.5.0-Docs-Site.zip (文档站)
# - partner.example-dashboard-0.2.0-web-default.ride-ui-runtime.zip (运行包)
# - *.sha256 (摘要文件)
```

### App安装流程

**方式1：本地导入**

1. 构建运行包：`pnpm theme:pack-runtime`
2. 将`*.ride-ui-runtime.zip`传输到手机
3. 在Motexa App中选择"导入主题"
4. 按App提示完成验证和安装

**方式2：局域网导入**

```bash
# 启动局域网服务
pnpm theme:serve-runtime -- --bind 0.0.0.0 --port 5189

# 电脑浏览器打开 http://127.0.0.1:5189/
# 选择与手机同网段的IPv4或扫描二维码
# 手机App选择"从内网获取"
```

**注意事项**：
- 运行包不是Android APK
- 首次导入需要App联网验证
- 不要修改App以绕过验证
- SHA-256用于完整性校验，不代表授权

### 版本管理

```json
// theme/ride-ui.json
{
  "id": "your.unique.theme-id",
  "version": "1.0.0",
  "runtime": {
    "releaseId": "your.unique.theme-id@1.0.0-web-default"
  }
}
```

**版本规则**：
- 使用语义化版本 (SemVer)
- `releaseId`应与`version`保持一致
- 每次发布更新版本号

---

## 常见问题

### 开发相关

**Q: Theme ID mismatch错误？**  
A: 检查`createRideUiClient()`的参数是否与`theme/ride-ui.json`中的`id`一致。

**Q: Waiting for theme handshake一直等待？**  
A: 确认：
1. 通过`mock-host.html`打开（不要直接打开`index.html`）
2. 已调用`client.ready()`
3. 浏览器控制台无加载错误

**Q: 如何调试真实设备数据？**  
A: 调试器使用合成数据。真实数据调试需要：
1. 构建运行包并导入App
2. 使用App的日志功能
3. 通过Chrome DevTools远程调试WebView

**Q: 可以使用第三方UI库吗？**  
A: 可以，但注意：
- 运行包大小限制
- 不要使用需要网络请求的库
- 避免使用原生插件
- 确保与WebView 120+兼容

### 数据处理

**Q: 为什么value是null？**  
A: 可能原因：
- 设备不支持该数据
- 数据源暂时不可用
- 调试器设置为missing
- 不要将null当作0处理

**Q: 如何区分数据新鲜度？**  
A: 检查`freshness`字段：
- `fresh`: 最新数据
- `stale`: 过期但保持
- `unavailable`: 不可用

**Q: 速度数据不稳定？**  
A: API 1.11使用显示帧：
```typescript
client.subscribeDisplayFrame(frame => {
  // 使用frame.speedKmh（已平滑）
  // 不要用telemetry.speed
})
```

### 构建与安装

**Q: 运行包校验失败？**  
A: 按顺序检查：
1. `pnpm theme:check`通过
2. `pnpm typecheck`无错误
3. `pnpm theme:replay-check`通过
4. 资源路径正确
5. 无网络请求代码

**Q: App导入失败？**  
A: 可能原因：
- 网络验证失败
- 版本不兼容
- 清单格式错误
- 设备不满足要求

**Q: 如何更新已安装的主题？**  
A: 增加版本号后重新构建和导入，App会识别为更新。

### API使用

**Q: 动作请求返回denied？**  
A: 检查：
1. `context.capabilities`是否包含该动作
2. 当前`mode`是否允许
3. 调试器的Action response设置

**Q: 配置保存conflict错误？**  
A: 并发冲突，正确处理：
```typescript
if (result.error?.code === 'conflict') {
  // 使用返回的最新配置重置草稿
  const latest = result.result?.config
}
```

**Q: 如何获取当前语言？**  
A: 从context获取：
```typescript
client.subscribeContext(context => {
  const lang = context.locale // 'zh-CN' 或 'en-US'
})
```

### 性能优化

**Q: 如何优化渲染性能？**  
A: 建议：
- 使用`subscribeDisplayFrame`而非`subscribeFrame`
- 避免频繁的DOM操作
- 低功耗模式减少动画
- 使用CSS transform而非position
- 防抖高频更新

**Q: 如何减小包体积？**  
A: 建议：
- Tree-shaking未使用的代码
- 压缩图片资源
- 使用SVG而非位图
- 移除开发依赖
- 检查`dist/runtime-web`大小

---

## 参考资源

### 官方文档

- 官网文档: https://motexa.top/docs/developers/overview
- 在线调试器: https://motexa.top/developers/debugger/mock-host.html
- SDK下载: https://motexa.top/developers/downloads/

### 本地文档

- 中文文档: `docs/zh-CN/`
- 英文文档: `docs/en-US/`
- 主题清单参考: `reference/ride-ui-manifest-v1.json`
- SDK开发说明: `SDK-DEVELOPMENT.md`

### 类型定义

```typescript
// 导入路径
import { createRideUiClient } from '@motexa/ride-ui-sdk/client'
import type { 
  RideUiInitContextV1,
  RideUiSnapshotV1,
  RideUiMetricValueV1,
  RideUiDisplayFrameV1
} from '@motexa/ride-ui-sdk/contract'

// 常量
import { 
  RIDE_UI_TELEMETRY_KEYS_V1,
  RIDE_UI_IMPLEMENTED_CAPABILITIES 
} from '@motexa/ride-ui-sdk/contract'
```

### 技术栈

- **前端框架**: Vue 3.5.32
- **语言**: TypeScript 6.0.2
- **构建工具**: Vite 8.0.10
- **包管理**: pnpm 10.33.2
- **Node版本**: >= 22.12.0

### 许可证

- 示例代码: MIT (见LICENSE.md指定范围)
- SDK本体: 不在MIT范围内
- 第三方依赖: 见THIRD-PARTY-NOTICES.md

---

## 更新日志

### SDK 1.5.0 / API 1.11 / Demo 0.2.0 (当前版本)

**新增功能**：
- ✨ 新增`vehicleGear`挡位字段 (1低/2中/3高)
- ✨ 新增`vehicleParking` P状态字段 (1 P/0 解除P)
- ✨ 新增`subscribeDisplayFrame`速度显示帧订阅
- ✨ 新增`environment`宿主环境描述

**改进**：
- 🔧 优化速度平滑处理
- 🔧 改进旧宿主兼容性（自动补齐缺失字段）
- 📚 完善中英文文档

**注意事项**：
- 九号MMAX90挡位/P状态尚未验证
- 旧API 1.x宿主缺少新字段会自动补为不可用

---

## 附录

### 常用命令速查

```bash
# 开发
pnpm install --frozen-lockfile    # 安装依赖
pnpm dev                           # 启动开发服务器

# 检查
pnpm theme:check                   # 校验清单
pnpm typecheck                     # 类型检查
pnpm theme:replay-check            # 回放检查

# 构建
pnpm theme:build                   # 构建开发版
pnpm theme:pack-runtime            # 构建运行包
pnpm theme:runtime-check           # 验证运行包

# 服务
pnpm theme:serve-runtime           # 局域网服务

# 文档
pnpm docs:build                    # 构建文档站
pnpm docs:preview                  # 预览文档站

# 发布
pnpm release:build                 # 完整发布构建
```

### 文件命名规范

- 主题包: `{publisherId}.{themeId}-{version}-{renderer}-{variantId}.ride-ui-runtime.zip`
- 完整性: `*.ride-ui-runtime.integrity.json`
- 摘要: `*.sha256`

### 支持的设备

**极核/ZEEHO**:
- ✅ 完整支持所有遥测数据
- ✅ 支持挡位和P状态

**九号MMAX90**:
- ⚠️ 挡位和P状态返回null（未验证）
- ✅ 其他遥测数据正常

---

**知识库生成时间**: 2026-10-10  
**基于项目路径**: `d:\code\html\Motexa-Ride-UI-SDK-1.5.0-GitHub-Release\Motexa-Ride-UI-SDK-1.5.0-GitHub-Release`
