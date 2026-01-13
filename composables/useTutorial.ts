export type TutorialStep = {
  id: string
  title: string
  description: string
  instruction: string
  targetArea?: { x: number; y: number; radius: number }
  requiredAction: 'move' | 'slash' | 'charge' | 'thrust' | 'complete'
  successMessage: string
  isCompleted: boolean
}

export type TutorialState = {
  currentStep: number
  steps: TutorialStep[]
  isActive: boolean
  showOverlay: boolean
  completedSteps: string[]
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'move',
    title: '御剑初成',
    description: '以意念引导仙剑',
    instruction: '移动鼠标，将剑移至目标光圈处',
    requiredAction: 'move',
    successMessage: '御剑初成！',
    isCompleted: false
  },
  {
    id: 'slash',
    title: '剑气凌厉',
    description: '释放剑气斩击',
    instruction: '单击鼠标左键，释放剑气',
    requiredAction: 'slash',
    successMessage: '剑气凌厉！',
    isCompleted: false
  },
  {
    id: 'charge',
    title: '气贯长虹',
    description: '蓄力释放强力斩击',
    instruction: '长按鼠标左键蓄力，松开释放',
    requiredAction: 'charge',
    successMessage: '气贯长虹！',
    isCompleted: false
  },
  {
    id: 'thrust',
    title: '瞬影突刺',
    description: '瞬移突刺敌人',
    instruction: '双击鼠标，剑将瞬移至点击位置',
    requiredAction: 'thrust',
    successMessage: '瞬影突刺！',
    isCompleted: false
  }
]

export function useTutorial() {
  const state = ref<TutorialState>({
    currentStep: 0,
    steps: JSON.parse(JSON.stringify(TUTORIAL_STEPS)),
    isActive: false,
    showOverlay: true,
    completedSteps: []
  })

  const currentStepData = computed(() => {
    return state.value.steps[state.value.currentStep] || null
  })

  const progress = computed(() => {
    return state.value.currentStep / state.value.steps.length
  })

  const isComplete = computed(() => {
    return state.value.currentStep >= state.value.steps.length
  })

  // 目标位置（用于移动教学）
  const targetPosition = ref({ x: 0, y: 0 })
  const targetRadius = ref(50)
  const showTarget = ref(false)

  // 生成随机目标位置
  const generateTarget = (canvasWidth: number, canvasHeight: number) => {
    const padding = 100
    targetPosition.value = {
      x: padding + Math.random() * (canvasWidth - padding * 2),
      y: padding + Math.random() * (canvasHeight - padding * 2)
    }
    showTarget.value = true
  }

  // 检查是否到达目标
  const checkTargetReached = (swordX: number, swordY: number): boolean => {
    if (!showTarget.value) return false
    const dx = swordX - targetPosition.value.x
    const dy = swordY - targetPosition.value.y
    return Math.hypot(dx, dy) < targetRadius.value
  }

  // 开始教学
  const startTutorial = () => {
    state.value = {
      currentStep: 0,
      steps: JSON.parse(JSON.stringify(TUTORIAL_STEPS)),
      isActive: true,
      showOverlay: true,
      completedSteps: []
    }
  }

  // 完成当前步骤
  const completeStep = () => {
    if (state.value.currentStep < state.value.steps.length) {
      const step = state.value.steps[state.value.currentStep]
      step.isCompleted = true
      state.value.completedSteps.push(step.id)
      state.value.currentStep++
      showTarget.value = false
    }
  }

  // 跳过教学
  const skipTutorial = () => {
    state.value.isActive = false
    state.value.showOverlay = false
  }

  // 处理动作
  const handleAction = (action: string, payload?: any) => {
    console.log('[useTutorial] handleAction:', action, 'payload:', payload, 'isActive:', state.value.isActive)
    if (!state.value.isActive || isComplete.value) {
      console.log('[useTutorial] 跳过：教程未激活或已完成')
      return
    }

    const step = currentStepData.value
    if (!step) {
      console.log('[useTutorial] 跳过：没有当前步骤')
      return
    }
    
    console.log('[useTutorial] 当前步骤:', step.id, '需要动作:', step.requiredAction)

    switch (step.requiredAction) {
      case 'move':
        if (action === 'move' && payload) {
          if (checkTargetReached(payload.x, payload.y)) {
            completeStep()
          }
        }
        break
      case 'slash':
        if (action === 'slash') {
          completeStep()
        }
        break
      case 'charge':
        if (action === 'charge' && payload?.chargeLevel > 0.5) {
          completeStep()
        }
        break
      case 'thrust':
        if (action === 'thrust') {
          completeStep()
        }
        break
    }
  }

  return {
    state: readonly(state),
    currentStepData,
    progress,
    isComplete,
    targetPosition: readonly(targetPosition),
    targetRadius: readonly(targetRadius),
    showTarget: readonly(showTarget),
    startTutorial,
    completeStep,
    skipTutorial,
    handleAction,
    generateTarget
  }
}
