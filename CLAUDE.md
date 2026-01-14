# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**指尖剑仙 (FingerSword)** 是一款基于手势识别的仙侠风格互动游戏，用户可以通过鼠标或摄像头手势控制仙剑完成各种挑战任务。项目采用 Nuxt 3 + Vue 3 + TypeScript 开发，使用 MediaPipe Hands 实现手势识别，Canvas 2D 渲染游戏画面。

## 常用命令

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:3000）
npm run dev

# 构建生产版本（静态站点生成）
npm run build

# 预览生产版本
npm run preview

# Nuxt 准备（自动在 postinstall 执行）
npm run postinstall
```

## 核心架构

### 1. 控制系统架构

项目支持**双控制模式**（鼠标/手势），通过 composables 实现控制逻辑的解耦：

- **`useGesture.ts`**: MediaPipe Hands 手势识别核心
  - 检测手势类型：`pointing`（食指指向）、`fist`（握拳）、`palm`（张开手掌）、`twoFingers`（双指并拢）等
  - 返回手势状态：位置、方向、置信度、速度
  - 处理摄像头权限和初始化

- **`useGestureActions.ts`**: 手势到游戏动作的映射层
  - 将手势状态转换为游戏操作（移动剑、蓄力、释放技能等）
  - 实现手势持续时间检测（如双指并拢3秒触发聚剑）

- **`useTouch.ts`**: 鼠标/触摸控制
  - 处理鼠标移动、点击、长按、双击事件
  - 与手势控制共享相同的输出接口

### 2. 游戏逻辑架构

- **`useSword.ts`**: 剑的核心逻辑
  - 剑的物理运动（位置、速度、角度）
  - 攻击系统：`slash`（斩击）、`charge`（蓄力斩）、`thrust`（突刺）、`wave`（剑气波）、`swordRain`（万剑齐发）等
  - 连击系统和特效管理
  - 墨迹拖尾效果

- **`useLevel.ts`**: 关卡系统
  - 关卡配置：`tutorial`（御剑入门）、`slayMonster`（御剑斩妖）等
  - 敌人生成和管理
  - 分数、连击、时间计算
  - 关卡状态持久化（localStorage）

- **`useTutorial.ts`**: 教学系统
  - 分步骤引导（移动、斩击、蓄力等）
  - 进度跟踪和提示显示

### 3. 渲染系统

- **`useCanvasRenderer.ts`**: Canvas 渲染管线
  - 统一的渲染循环
  - 水墨风格绘制（剑、拖尾、特效、敌人）
  - 性能优化（requestAnimationFrame）

- **`useParticles.ts`**: 粒子系统
  - 攻击特效粒子
  - 碰撞爆炸效果

- **`useSound.ts`**: 音效系统
  - Web Audio API 生成音效
  - 攻击、碰撞、蓄力等音效

### 4. 类型系统

所有核心类型定义在 `types/game.ts`：
- `Vector2D`: 二维向量
- `Sword`: 剑的状态
- `InkTrail`: 墨迹拖尾
- `GameState`: 游戏状态
- `ControlMode`: 控制模式（mouse/gesture/keyboard）

关卡相关类型在 `composables/useLevel.ts`：
- `LevelId`: 关卡标识
- `Enemy`: 敌人实体
- `LevelConfig`: 关卡配置
- `LevelState`: 关卡运行状态

### 5. 页面路由

- `/` (index.vue): 首页欢迎界面
- `/game` (game.vue): 自由模式游戏页面
- `/tutorial` (tutorial.vue): 御剑入门教学关卡
- `/levels` (levels.vue): 关卡选择页面

## 开发规范

### 代码风格
- **必须使用中文**进行所有交流和注释
- 严格遵守 Vue 3 Composition API 规范
- 组件拆分遵循单一职责原则
- 每个页面代码不超过 500 行

### Git 提交规范
- **提交信息必须使用中文**
- 提交前必须确保代码编译通过
- 提交方法（避免编码问题）：
  1. 使用 `Write` 工具创建 `commit-msg.txt` 文件（UTF-8 编码）
  2. 执行 `git commit -F commit-msg.txt`
  3. 清理临时文件
- 提交确认规则：
  - **无 To-dos 任务列表**：小修改需询问用户确认
  - **有 To-dos 任务列表**：完成任务后直接提交

### 任务跟踪
- 使用 TodoWrite 工具跟踪复杂任务
- 每完成一个 To-do 项必须立即标记为完成

## 技术要点

### 手势识别集成
- MediaPipe Hands 需要摄像头权限
- 手势检测基于 21 个手部关键点
- 手势置信度阈值调优在 `useGesture.ts` 中

### Canvas 渲染优化
- 使用离屏 Canvas 缓存静态元素
- 拖尾效果通过透明度衰减实现
- 特效使用对象池减少 GC

### 静态站点生成
- `nuxt.config.ts` 中 `ssr: false` 配置
- 适配阿里云 ESA Pages 部署
- 所有游戏逻辑在客户端运行

## 项目背景

本项目参加**阿里云 ESA Pages 边缘开发大赛**，评选方向包括创意创新、实用价值、技术探索。项目需部署到阿里云 ESA Pages 平台，并提供公开的 GitHub 源码仓库。
