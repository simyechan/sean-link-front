export interface Marble {
  id: number
  name: string
  body: any
  color: string
  isWinner: boolean
}

export type GamePhase = 'idle' | 'preview' | 'running' | 'finished'

export interface PinballState {
  phase: GamePhase
  winner: string | null
}

export interface PinballGameProps {
  names: string[]
  mapIndex?: number
  winningRank?: number
  speed?: number
  useSkills?: boolean
  onWinner?: (name: string) => void
  onPhaseChange?: (phase: GamePhase) => void
}

export interface PinballGameHandle {
  shuffle: () => void
  startGame: () => void
  reset: () => void
  changeMap: (map: number) => void
}

export interface WorldConfig {
  width: number
  height: number
  gravity: number
  pinRows: number
  pinSpacing: number
}