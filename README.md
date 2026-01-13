# 指尖剑仙 (FingerSword)

> 以指御剑，斩妖除魔

一款基于手势识别的仙侠风格互动游戏，用户可以通过鼠标或摄像头手势控制仙剑完成各种挑战任务。

## 特色功能

- 🎮 **双控制模式** - 鼠标精准控制 + 摄像头手势识别
- 🎨 **水墨国风** - 独特的中国水墨画视觉风格
- ⚔️ **多种技能** - 剑气斩击、蓄力斩、瞬移突刺
- 📚 **教学关卡** - 御剑入门引导系统

## 技术栈

- **框架**: Nuxt 3 + Vue 3
- **语言**: TypeScript
- **样式**: 自定义 CSS（水墨风格）
- **渲染**: Canvas 2D
- **手势识别**: MediaPipe Hands
- **音效**: Web Audio API

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 操作说明

### 鼠标模式
| 操作 | 动作 |
|------|------|
| 移动鼠标 | 控制剑的位置 |
| 左键单击 | 剑气斩击 |
| 左键长按 | 蓄力斩 |
| 双击 | 瞬移突刺 |

### 手势模式
| 手势 | 动作 |
|------|------|
| 食指指向 | 控制剑移动 |
| 握拳 | 聚剑 |
| 张开五指 | 剑气冲击波 |

## 项目结构

```
FingerSword/
├── assets/css/        # 样式文件
├── components/game/   # 游戏组件
├── composables/       # 组合式函数
│   ├── useGesture.ts  # 手势识别
│   ├── useSword.ts    # 剑控制逻辑
│   ├── useParticles.ts # 粒子系统
│   ├── useSound.ts    # 音效系统
│   └── useTutorial.ts # 教学系统
├── pages/             # 页面
├── public/images/     # 图片资源
├── types/             # TypeScript 类型
└── docs/              # 项目文档
```

## 页面路由

- `/` - 首页（欢迎界面）
- `/game` - 游戏页面
- `/tutorial` - 御剑入门教学

## 开发计划

- [x] 项目基础框架
- [x] 核心功能（剑控制、拖尾、攻击）
- [x] 手势识别集成
- [x] 御剑入门关卡
- [x] 视觉特效和音效
- [ ] 更多关卡开发
- [ ] 移动端适配

## 许可证

MIT License

## 作者

FingerSword Team
