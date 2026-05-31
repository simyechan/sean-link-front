import { useState } from 'react'
import { PinballGame } from './PinballGame'

const MAPS = [
  { index: 0, label: '운명의 수레바퀴' },
  { index: 1, label: '버블팝' },
  { index: 2, label: '욕망의 항아리' },
  { index: 3, label: '밤을 달리다 (by item4)' },
]

export default function Pinball() {
  const [nameInput, setNameInput] = useState('')
  const [names, setNames] = useState<string[]>([])
  const [started, setStarted] = useState(false)
  const [winningRank, setWinningRank] = useState(1)
  const [useSkills, setUseSkills] = useState(true)
  const [mapIndex, setMapIndex] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [search, setSearch] = useState('')

  const filteredNames = names
    .map((name, i) => ({ name, i }))
    .filter(({ name }) => name.includes(search))

  const addName = () => {
    const parsed = nameInput.split(',').map(s => s.trim()).filter(Boolean)
    if (parsed.length === 0) return
    setNames(prev => [...prev, ...parsed])
    setNameInput('')
  }

  const removeName = (i: number) => setNames(prev => prev.filter((_, idx) => idx !== i))

  const handleStart = () => {
    if (names.length === 0) return
    setStarted(true)
  }

  const handleReset = () => setStarted(false)

  return (
    <div className="flex h-screen pt-14 overflow-hidden">

      {/* 사이드 패널 */}
      <aside
        className="w-72 flex-shrink-0 flex flex-col border-r"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}
      >
        {/* 스크롤 영역 */}
        <div className="flex flex-col gap-4 p-4 overflow-y-auto flex-1">
            <h2 className="text-lg font-bold" style={{ color: 'var(--accent)' }}>핀볼 설정</h2>

            {/* 이름 입력 */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    참가자 {names.length > 0 && <span style={{ color: 'var(--text-primary)' }}>({names.length}명)</span>}
                </label>
                <div className="flex gap-2">
                    <input
                    className="flex-1 rounded-lg px-3 py-2 text-sm border"
                    style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    placeholder="이름 (쉼표로 여러 명)"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addName()}
                    />
                    <button
                    onClick={addName}
                    className="px-3 py-2 rounded-lg text-sm font-semibold transition"
                    style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                    >
                    추가
                    </button>
                </div>

                {/* 검색 필터 */}
                {names.length > 0 && (
                    <input
                    className="rounded-lg px-3 py-2 text-sm border"
                    style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    placeholder="🔍 검색해서 삭제"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    />
                )}

                {/* 이름 목록 */}
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    {names.length === 0 && (
                    <p className="text-xs py-2 text-center" style={{ color: 'var(--text-muted)' }}>
                        참가자를 추가해주세요
                    </p>
                    )}
                    {filteredNames.length === 0 && search && (
                    <p className="text-xs py-2 text-center" style={{ color: 'var(--text-muted)' }}>
                        검색 결과 없음
                    </p>
                    )}
                    {filteredNames.map(({ name, i }) => (
                    <div
                        key={i}
                        className="flex items-center justify-between px-3 py-1.5 rounded-lg text-sm"
                        style={{ backgroundColor: 'var(--bg-nav)' }}
                    >
                        <span style={{ color: 'var(--text-primary)' }}>{name}</span>
                        <button
                        onClick={() => removeName(i)}
                        className="text-xs opacity-50 hover:opacity-100 transition ml-2"
                        style={{ color: 'var(--text-muted)' }}
                        >
                        ✕
                        </button>
                    </div>
                    ))}
                </div>

                {names.length > 0 && (
                    <button
                    onClick={() => { setNames([]); setSearch(''); }}
                    className="text-xs opacity-50 hover:opacity-100 transition text-left"
                    style={{ color: 'var(--text-muted)' }}
                    >
                    전체 삭제
                    </button>
                )}
            </div>

            <div className="border-t" style={{ borderColor: 'var(--border)' }} />

            {/* 맵 선택 */}
            <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                맵
            </label>
            <div className="flex flex-col gap-1">
                {MAPS.map(map => (
                <button
                    key={map.index}
                    onClick={() => setMapIndex(map.index)}
                    className="px-3 py-2 rounded-lg text-sm text-left transition"
                    style={{
                    backgroundColor: mapIndex === map.index ? 'var(--accent)' : 'var(--bg-nav)',
                    color: mapIndex === map.index ? 'white' : 'var(--text-secondary)',
                    }}
                >
                    {map.label}
                </button>
                ))}
            </div>
            </div>

            <div className="border-t" style={{ borderColor: 'var(--border)' }} />

            {/* 당첨 순위 */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    당첨 순위
                </label>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setWinningRank(r => Math.max(1, r - 1))}
                        className="w-8 h-8 rounded-lg text-sm font-bold transition flex-shrink-0"
                        style={{ backgroundColor: 'var(--bg-nav)', color: 'var(--text-primary)' }}
                    >−</button>
                    <input
                        type="number"
                        min={1}
                        max={names.length || 1}
                        value={winningRank}
                        onChange={e => {
                            const v = Number(e.target.value)
                            if (v >= 1) setWinningRank(v)
                        }}
                        className="flex-1 text-center font-bold rounded-lg py-1 border"
                        style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                    <span className="text-sm flex-shrink-0" style={{ color: 'var(--text-muted)' }}>등</span>
                    <button
                        onClick={() => setWinningRank(r => Math.min(names.length || 1, r + 1))}
                        className="w-8 h-8 rounded-lg text-sm font-bold transition flex-shrink-0"
                        style={{ backgroundColor: 'var(--bg-nav)', color: 'var(--text-primary)' }}
                    >+</button>
                </div>
            </div>

            {/* 속도 */}
            <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider flex justify-between" style={{ color: 'var(--text-muted)' }}>
                <span>속도</span>
                <span style={{ color: 'var(--text-primary)' }}>x{speed}</span>
            </label>
            <input
                type="range" min={1} max={5} step={1}
                value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                className="w-full accent-cyan-400"
            />
            </div>

            {/* 스킬 활성화 */}
            <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                스킬 활성화
            </label>
            <button
                onClick={() => setUseSkills(v => !v)}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ backgroundColor: useSkills ? 'var(--accent)' : 'var(--bg-nav)' }}
            >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${useSkills ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            </div>

            <div className="border-t" style={{ borderColor: 'var(--border)' }} />

            {/* 시작/다시하기 버튼 */}
            {!started ? (
            <button
                onClick={handleStart}
                disabled={names.length === 0}
                className="w-full py-3 rounded-lg font-bold text-sm transition disabled:opacity-40"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
                시작 ({names.length}명)
            </button>
            ) : (
            <button
                onClick={handleReset}
                className="w-full py-3 rounded-lg font-bold text-sm transition"
                style={{ backgroundColor: 'var(--bg-nav)', color: 'var(--text-secondary)' }}
            >
                ↩ 처음으로
            </button>
            )}
        </div>
    
        {/* 저작권 — 스크롤 밖에 고정 */}
        <div className="p-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            <a
            href="https://github.com/lazygyu/roulette"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs opacity-40 hover:opacity-80 transition"
                style={{ color: 'var(--text-muted)' }}
                >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                Marble Roulette by lazygyu (MIT)
            </a>
        </div>
      </aside>

      {/* 게임 영역 */}
      <main className="flex-1 flex items-center justify-center overflow-hidden p-4">
        {!started ? (
          <div className="flex flex-col items-center gap-3 opacity-40">
            <div className="text-5xl">🎱</div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              참가자를 추가하고 시작하세요
            </p>
          </div>
        ) : (
          <PinballGame
            names={names}
            mapIndex={mapIndex}
            winningRank={winningRank}
            speed={speed}
            useSkills={useSkills}
            onWinner={(name) => console.log('당첨:', name)}
          />
        )}
      </main>

    </div>
  )
}