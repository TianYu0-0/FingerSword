export type SoundType = 
  | 'slash'      // 斩击
  | 'charge'     // 蓄力
  | 'release'    // 释放
  | 'thrust'     // 突刺
  | 'hit'        // 命中
  | 'success'    // 成功
  | 'whoosh'     // 剑气

export function useSound() {
  const audioContext = ref<AudioContext | null>(null)
  const isEnabled = ref(true)
  const volume = ref(0.5)

  // 初始化音频上下文
  const init = () => {
    if (!audioContext.value) {
      audioContext.value = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContext.value
  }

  // 生成简单的合成音效
  const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!isEnabled.value) return
    
    const ctx = init()
    if (!ctx) return

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
    
    gainNode.gain.setValueAtTime(volume.value * 0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  }

  // 生成噪音（用于剑气音效）
  const playNoise = (duration: number, filterFreq = 1000) => {
    if (!isEnabled.value) return
    
    const ctx = init()
    if (!ctx) return

    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(filterFreq, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration)

    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(volume.value * 0.2, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    noise.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(ctx.destination)

    noise.start(ctx.currentTime)
    noise.stop(ctx.currentTime + duration)
  }

  // 播放特定音效
  const play = (type: SoundType) => {
    if (!isEnabled.value) return

    switch (type) {
      case 'slash':
        // 快速剑气音
        playNoise(0.15, 2000)
        playTone(800, 0.1, 'sawtooth')
        break

      case 'charge':
        // 蓄力音 - 上升音调
        const ctx = init()
        if (!ctx) return
        
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        
        osc.type = 'sine'
        osc.frequency.setValueAtTime(200, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 1.5)
        
        gain.gain.setValueAtTime(volume.value * 0.1, ctx.currentTime)
        gain.gain.setValueAtTime(volume.value * 0.2, ctx.currentTime + 1)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5)
        
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 1.5)
        break

      case 'release':
        // 释放音 - 爆发
        playNoise(0.3, 3000)
        playTone(400, 0.2, 'square')
        playTone(600, 0.15, 'sawtooth')
        break

      case 'thrust':
        // 突刺音 - 快速穿刺
        playNoise(0.1, 4000)
        playTone(1000, 0.08, 'sawtooth')
        setTimeout(() => playTone(500, 0.1, 'sine'), 50)
        break

      case 'hit':
        // 命中音
        playTone(300, 0.1, 'square')
        playNoise(0.1, 1500)
        break

      case 'success':
        // 成功音 - 和弦
        playTone(523, 0.3, 'sine') // C5
        setTimeout(() => playTone(659, 0.3, 'sine'), 100) // E5
        setTimeout(() => playTone(784, 0.4, 'sine'), 200) // G5
        break

      case 'whoosh':
        // 剑气划过
        playNoise(0.2, 1500)
        break
    }
  }

  // 设置音量
  const setVolume = (v: number) => {
    volume.value = Math.max(0, Math.min(1, v))
  }

  // 切换开关
  const toggle = () => {
    isEnabled.value = !isEnabled.value
  }

  return {
    isEnabled: readonly(isEnabled),
    volume: readonly(volume),
    play,
    setVolume,
    toggle
  }
}
