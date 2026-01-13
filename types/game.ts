export type Vector2D = {
  x: number
  y: number
}

export type Sword = {
  position: Vector2D
  velocity: Vector2D
  angle: number
  length: number
  isCharging: boolean
  chargeLevel: number
}

export type InkTrail = {
  x: number
  y: number
  opacity: number
  width: number
}

export type GameState = {
  swords: Sword[]
  mousePosition: Vector2D
  isCharging: boolean
  chargeLevel: number
  isGathering: boolean
  energy: number
  score: number
}

export type ControlMode = 'mouse' | 'gesture' | 'keyboard'

export type GameConfig = {
  controlMode: ControlMode
  swordCount: number
  trailLength: number
  inkColor: string
  paperColor: string
}
