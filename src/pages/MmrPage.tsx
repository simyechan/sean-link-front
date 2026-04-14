import React, { useState, useCallback } from 'react';

// ── 타입 ──────────────────────────────────────────────────────────────────────

type StatKey = 'rank' | 'win' | 'top3' | 'kill' | 'assist' | 'dmg';

interface StatScores {
  rank: number;
  win: number;
  top3: number;
  kill: number;
  assist: number;
  dmg: number;
}

// ── 상수 ──────────────────────────────────────────────────────────────────────

const TIERS = [
  '아이언', '브론즈', '실버', '골드',
  '플래티넘', '다이아몬드',
  '메테오라이트', '미스릴',
  '데미갓', '이터니티'
] as const;

const TIER_COLORS = [
  '#cccccc', '#b98665', '#97a7c3', '#e3c56f',
  '#7abb9b', '#9d7dc6', '#64b9d3', '#4c7aa3',
  '#7ba0e8', '#b95f81'
];

// 스쿼드 8팀 기준 — 랜덤 1위 확률 12.5%, TOP3 37.5%
const BENCHMARKS: Record<StatKey, number[]> = {
  rank:   [7.0, 6.2, 5.5, 4.8, 4.0, 3.2, 2.5, 1.8, 1.5, 1.2],
  win:    [8, 11, 14, 17, 21, 26, 33, 43, 55, 70],
  top3:   [28, 33, 38, 43, 50, 57, 65, 76, 85, 95],
  kill:   [0.5, 0.8, 1.1, 1.5, 1.9, 2.4, 3.0, 3.8, 4.5, 5.5],
  assist: [1.0, 1.5, 2.0, 2.8, 3.5, 4.5, 5.5, 7.0, 8.5, 10.0],
  dmg:    [2000,3000,4200,5500,6800,8200,10000,12500,15000,18000],
};

// rank 30%, win 27%, top3 22%, kill 8%, assist 3%, dmg 10%
const WEIGHTS: Record<StatKey, number> = {
  rank: 0.30, win: 0.27, top3: 0.22, kill: 0.08, assist: 0.03, dmg: 0.10,
};

const STAT_LABELS: Record<StatKey, string> = {
  rank: '순위 관리', win: '승률', top3: 'TOP3 생존', kill: '킬', assist: '어시스트', dmg: '딜량',
};

const STAT_CONFIG: {
  key: StatKey;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  note: string;
  format: (v: number) => string;
}[] = [
  { key: 'rank',   label: '평균 순위',      min: 1, max: 8,     step: 0.1,  defaultValue: 1, note: '스쿼드는 7~8팀 경쟁 — 중간값은 약 #4', format: v => `#${v.toFixed(1)}` },
  { key: 'win',    label: '승률 (1위%)',    min: 0, max: 70,    step: 0.5,  defaultValue: 0, note: '8팀 기준 랜덤이면 약 12.5%', format: v => `${v.toFixed(1)}%` },
  { key: 'top3',   label: 'TOP 3 %',       min: 0, max: 100,   step: 0.5,  defaultValue: 0, note: '8팀 기준 랜덤이면 약 37.5%', format: v => `${v.toFixed(1)}%` },
  { key: 'kill',   label: '평균 킬',        min: 0, max: 10,    step: 0.05, defaultValue: 0, note: '팀원 포함 총 킬 중 본인 몫', format: v => v.toFixed(2) },
  { key: 'assist', label: '평균 어시스트',  min: 0, max: 15,    step: 0.05, defaultValue: 0, note: '', format: v => v.toFixed(2) },
  { key: 'dmg',    label: '평균 딜량',      min: 0, max: 20000, step: 50,   defaultValue: 0, note: '', format: v => Math.round(v).toLocaleString() },
];

// ── 계산 로직 ─────────────────────────────────────────────────────────────────

function scoreStat(key: StatKey, val: number): number {
  const bench = BENCHMARKS[key];
  const invert = key === 'rank';
  for (let i = bench.length - 1; i >= 0; i--) {
    if (invert ? val <= bench[i] : val >= bench[i]) return i;
  }
  return 0;
}

function calcResult(values: Record<StatKey, number>) {
  const scores = {} as StatScores;
  let total = 0;
  for (const key of Object.keys(WEIGHTS) as StatKey[]) {
    scores[key] = scoreStat(key, values[key]);
    total += scores[key] * WEIGHTS[key];
  }
  const maxTier = TIERS.length - 1;
  const tierIdx = Math.min(Math.floor(total), maxTier);
  const mmr = Math.round(800 + total * 400);
  const maxKey = (Object.keys(scores) as StatKey[]).reduce((a, b) => scores[a] > scores[b] ? a : b);
  const minKey = (Object.keys(scores) as StatKey[]).reduce((a, b) => scores[a] < scores[b] ? a : b);
  return { scores, total, tierIdx, mmr, maxKey, minKey };
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

const StatSlider: React.FC<{
  config: typeof STAT_CONFIG[number];
  value: number;
  onChange: (key: StatKey, val: number) => void;
  score: number;
}> = ({ config, value, onChange, score }) => {
  const [inputText, setInputText] = React.useState('');
  const [focused, setFocused] = React.useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      const clamped = Math.min(Math.max(parsed, config.min), config.max);
      onChange(config.key, clamped);
    }
  };

  const handleFocus = () => {
    setFocused(true);
    setInputText(String(value));
  };

  const handleBlur = () => {
    setFocused(false);
    setInputText('');
  };

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{config.label}</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--accent)', fontWeight: 700 }}
          >
            Lv.{score}
          </span>
        </div>
        <input
          type="number"
          min={config.min}
          max={config.max}
          step={config.step}
          value={focused ? inputText : value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="text-sm font-bold text-right rounded px-2 py-0.5 w-24"
          style={{
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
      </div>
      <input
        type="range"
        min={config.min}
        max={config.max}
        step={config.step}
        value={value}
        onChange={e => onChange(config.key, parseFloat(e.target.value))}
        className="w-full"
        style={{ accentColor: 'var(--accent)' }}
      />
      {config.note && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted, var(--text-secondary))' }}>
          {config.note}
        </p>
      )}
    </div>
  );
};

const RadarChart: React.FC<{ scores: StatScores }> = ({ scores }) => {
  const labels: { key: StatKey; label: string }[] = [
    { key: 'rank',   label: '순위' },
    { key: 'win',    label: '승률' },
    { key: 'top3',   label: 'TOP3' },
    { key: 'kill',   label: '킬' },
    { key: 'assist', label: '어시' },
    { key: 'dmg',    label: '딜량' },
  ];
  const cx = 120, cy = 120, r = 90, n = labels.length;
  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const toXY = (i: number, val: number, max = 9) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const ratio = val / max;
    return { x: cx + r * ratio * Math.cos(angle), y: cy + r * ratio * Math.sin(angle) };
  };

  const gridPoints = (level: number) =>
    labels.map((_, i) => toXY(i, level)).map(p => `${p.x},${p.y}`).join(' ');

  const dataPoints = labels.map((l, i) => toXY(i, scores[l.key]));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';

  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-[240px] mx-auto">
      {levels.map(lv => (
        <polygon key={lv} points={gridPoints(lv)} fill="none" stroke="var(--border)" strokeWidth="0.5" />
      ))}
      {labels.map((_, i) => {
        const p = toXY(i, 9);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth="0.5" />;
      })}
      <path d={dataPath} fill="var(--accent)" fillOpacity="0.2" stroke="var(--accent)" strokeWidth="2" />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--accent)" />
      ))}
      {labels.map((l, i) => {
        const p = toXY(i, 10.5);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="10" fill="var(--text-secondary)">
            {l.label}
          </text>
        );
      })}
    </svg>
  );
};

const TierBar: React.FC<{ tierIdx: number; total: number }> = ({ tierIdx, total }) => {
  const pct = Math.min((total / (TIERS.length - 1)) * 100, 100);
  const color = TIER_COLORS[tierIdx];
  return (
    <div>
      <div className="flex justify-between mb-1">
        {TIERS.map((t, i) => (
          <span key={t} className="text-xs" style={{ color: i === tierIdx ? color : 'var(--text-secondary)', fontWeight: i === tierIdx ? 700 : 400 }}>
            {t.slice(0, 2)}
          </span>
        ))}
      </div>
      <div className="relative h-2 rounded-full overflow-visible" style={{ backgroundColor: 'var(--bg-input)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct.toFixed(1)}%`, backgroundColor: color }}
        />
        <div
          className="absolute top-1/2 w-4 h-4 rounded-full border-2 transition-all duration-500"
          style={{
            left: `${pct.toFixed(1)}%`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: color,
            borderColor: 'var(--bg-base)',
          }}
        />
      </div>
    </div>
  );
};

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

const defaultValues: Record<StatKey, number> = Object.fromEntries(
  STAT_CONFIG.map(c => [c.key, c.defaultValue])
) as Record<StatKey, number>;

export const MmrPage: React.FC = () => {
  const [values, setValues] = useState<Record<StatKey, number>>(defaultValues);

  const handleChange = useCallback((key: StatKey, val: number) => {
    setValues(prev => ({ ...prev, [key]: val }));
  }, []);

  const { scores, total, tierIdx, mmr, maxKey, minKey } = calcResult(values);
  const tierColor = TIER_COLORS[tierIdx];

  return (
    <div className="min-h-screen pt-14" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="max-w-screen-2xl mx-auto px-4 pt-12 pb-12">

        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            MMR 추정기
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            스쿼드 모드 · 3인 1팀 · 최대 8팀 기준
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 왼쪽: 슬라이더 */}
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'var(--text-secondary)' }}>
              지표 입력
            </p>
            {STAT_CONFIG.map(cfg => (
              <StatSlider
                key={cfg.key}
                config={cfg}
                value={values[cfg.key]}
                onChange={handleChange}
                score={scores[cfg.key]}
              />
            ))}
          </div>

          {/* 오른쪽: 결과 */}
          <div className="flex flex-col gap-4">

            {/* MMR + 티어 */}
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-secondary)' }}>
                추정 결과
              </p>
              <div className="flex items-end gap-4 mb-6">
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>추정 MMR</p>
                  <p className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {mmr.toLocaleString()}
                  </p>
                </div>
                <div className="mb-1">
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>추정 티어</p>
                  <p className="text-2xl font-bold" style={{ color: tierColor }}>
                    {TIERS[tierIdx]}
                  </p>
                </div>
              </div>
              <TierBar tierIdx={tierIdx} total={total} />
            </div>

            {/* 강점 / 약점 */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-2xl p-4"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>강점</p>
                <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                  {STAT_LABELS[maxKey]}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Lv.{scores[maxKey]} / 9
                </p>
              </div>
              <div
                className="rounded-2xl p-4"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>개선 필요</p>
                <p className="text-sm font-bold" style={{ color: '#ff8a8a' }}>
                  {STAT_LABELS[minKey]}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Lv.{scores[minKey]} / 9
                </p>
              </div>
            </div>

            {/* 레이더 차트 */}
            <div
              className="rounded-2xl p-6 flex flex-col items-center"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-4 self-start" style={{ color: 'var(--text-secondary)' }}>
                지표별 점수
              </p>
              <RadarChart scores={scores} />
            </div>

            {/* 티어별 기준 승률 */}
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
                티어별 기준 승률
              </p>
              <div className="space-y-1.5">
                {TIERS.map((tier, i) => (
                  <div key={tier} className="flex items-center gap-3">
                    <span
                      className="text-xs w-16 shrink-0"
                      style={{ color: i === tierIdx ? TIER_COLORS[i] : 'var(--text-secondary)', fontWeight: i === tierIdx ? 700 : 400 }}
                    >
                      {tier}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-input)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(BENCHMARKS.win[i] / Math.max(...BENCHMARKS.win)) * 100}%`,
                          backgroundColor: i === tierIdx ? TIER_COLORS[i] : 'var(--border)',
                        }}
                      />
                    </div>
                    <span className="text-xs w-10 text-right shrink-0" style={{ color: 'var(--text-secondary)' }}>
                      {BENCHMARKS.win[i]}%+
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
                * 현재 내 승률:{' '}
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                  {values.win.toFixed(1)}%
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* 하단 안내 */}
        <p className="text-xs text-center mt-8" style={{ color: 'var(--text-secondary)' }}>
          MMR은 공식 수치가 아닌 추정값이며, 실제 매칭 MMR과 다를 수 있습니다.
        </p>
      </div>
    </div>
  );
};
