// pinball.types.ts

// 마블 하나의 상태
export interface Marble {
  id: number
  name: string
  body: any        // box2d b2Body (box2d-wasm 타입이 any-heavy라서)
  color: string
  isWinner: boolean
}

// 게임 전체 상태
export type GameStatus = 'idle' | 'running' | 'finished'

// usePinball 훅의 반환값
export interface PinballState {
  status: GameStatus
  winner: string | null
  marbles: Marble[]
}

// PinballGame 컴포넌트 props
export interface PinballGameProps {
  names: string[]
  mapIndex?: number
  winningRank?: number
  speed?: number
  useSkills?: boolean
  onWinner?: (name: string) => void
}

// 월드 설정
export interface WorldConfig {
  width: number
  height: number
  gravity: number
  pinRows: number
  pinSpacing: number
}