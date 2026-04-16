import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

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
  '#a0a0a0', '#c4845a', '#8fa8c8', '#e8c84a',
  '#6dba9a', '#a07ed4', '#58b8d8', '#4a8ac0',
  '#7898f0', '#e05878'
];

// ── 실제 티어 분포 데이터 (서버 공식 통계 기반) ───────────────────────────────
const TIER_DISTRIBUTION = [
  { tier: '아이언',       pct: 12.46, color: '#a0a0a0' },
  { tier: '브론즈',       pct: 9.39,  color: '#c4845a' },
  { tier: '실버',         pct: 13.78, color: '#8fa8c8' },
  { tier: '골드',         pct: 20.83, color: '#e8c84a' },
  { tier: '플래티넘',     pct: 17.30, color: '#6dba9a' },
  { tier: '다이아몬드',   pct: 15.98, color: '#a07ed4' },
  { tier: '메테오라이트', pct: 5.59,  color: '#58b8d8' },
  { tier: '미스릴',       pct: 4.17,  color: '#4a8ac0' },
  { tier: '데미갓',       pct: 0.35,  color: '#7898f0' },
  { tier: '이터니티',     pct: 0.15,  color: '#e05878' },
];

// ── 재보정된 벤치마크 ─────────────────────────────────────────────────────────
// 근거: 이터니티 상위 16명 평균 — 승률 약 20%, TOP3 약 48%, 평균순위 #3.8, 킬 4.8
// 전체 분포: 골드(47%) · 플래티넘(29%) 구간이 중심 → 중간 티어 문턱을 대폭 완화
const BENCHMARKS: Record<StatKey, number[]> = {
  //         아이언 브론즈 실버  골드  플레  다이아 메테  미스  데미  이터
  rank:   [  7.6,  7.0,  6.2,  5.4,  4.5,  3.6,  2.8,  2.0,  1.6,  1.3 ],
  win:    [  3,    5,    8,    11,   14,   18,   22,   26,   32,   40  ],
  top3:   [  15,   20,   26,   32,   38,   44,   50,   57,   65,   75  ],
  kill:   [  0.2,  0.4,  0.7,  1.0,  1.4,  1.9,  2.5,  3.2,  4.0,  4.8 ],
  assist: [  0.3,  0.7,  1.2,  1.8,  2.5,  3.3,  4.2,  5.5,  7.0,  8.5 ],
  dmg:    [  800, 1400, 2200, 3200, 4400, 5800, 7400, 9200,11500,14000 ],
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
  { key: 'rank',   label: '평균 순위',      min: 1, max: 8,     step: 0.1,  defaultValue: 5, note: '스쿼드는 7~8팀 경쟁 — 중간값은 약 #4~5', format: v => `#${v.toFixed(1)}` },
  { key: 'win',    label: '승률 (1위%)',    min: 0, max: 70,    step: 0.5,  defaultValue: 11, note: '8팀 기준 랜덤이면 약 12.5%', format: v => `${v.toFixed(1)}%` },
  { key: 'top3',   label: 'TOP 3 %',       min: 0, max: 100,   step: 0.5,  defaultValue: 32, note: '8팀 기준 랜덤이면 약 37.5%', format: v => `${v.toFixed(1)}%` },
  { key: 'kill',   label: '평균 킬',        min: 0, max: 10,    step: 0.05, defaultValue: 1.0, note: '팀원 포함 총 킬 중 본인 몫', format: v => v.toFixed(2) },
  { key: 'assist', label: '평균 어시스트',  min: 0, max: 15,    step: 0.05, defaultValue: 1.8, note: '', format: v => v.toFixed(2) },
  { key: 'dmg',    label: '평균 딜량',      min: 0, max: 20000, step: 50,   defaultValue: 3200, note: '', format: v => Math.round(v).toLocaleString() },
];

const STORAGE_KEY = 'season_tier_distribution';

const getInitialTierDist = () => {
  if (typeof window === 'undefined') return TIER_DISTRIBUTION;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return TIER_DISTRIBUTION;
    return JSON.parse(saved) as typeof TIER_DISTRIBUTION;
  } catch {
    return TIER_DISTRIBUTION;
  }
};

// ── 계산 로직 ─────────────────────────────────────────────────────────────────

function scoreStat(key: StatKey, val: number): number {
  const bench = BENCHMARKS[key];
  const invert = key === 'rank';
  for (let i = bench.length - 1; i >= 0; i--) {
    if (invert ? val <= bench[i] : val >= bench[i]) return i;
  }
  return 0;
}

function calcResult(
  values: Record<StatKey, number>,
  tierDist: typeof TIER_DISTRIBUTION
) {
  const scores = {} as StatScores;
  let total = 0;

  for (const key of Object.keys(WEIGHTS) as StatKey[]) {
    scores[key] = scoreStat(key, values[key]);
    total += scores[key] * WEIGHTS[key];
  }

  const maxTier = TIERS.length - 1;
  const tierIdx = Math.min(Math.floor(total), maxTier);
  const mmr = Math.round(800 + total * 400);

  const maxKey = (Object.keys(scores) as StatKey[])
    .reduce((a, b) => (scores[a] > scores[b] ? a : b));

  const minKey = (Object.keys(scores) as StatKey[])
    .reduce((a, b) => (scores[a] < scores[b] ? a : b));

  // ✅ 핵심 수정: 하위 티어 누적 제거
  const lowerSum = tierDist
    .slice(0, tierIdx)
    .reduce((sum, t) => sum + t.pct, 0);

  const topPct = 100 - lowerSum;

  return { scores, total, tierIdx, mmr, maxKey, minKey, topPct };
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

const StatSlider: React.FC<{
  config: typeof STAT_CONFIG[number];
  value: number;
  onChange: (key: StatKey, val: number) => void;
  score: number;
}> = ({ config, value, onChange, score }) => {
  const [inputText, setInputText] = useState('');
  const [focused, setFocused] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      const clamped = Math.min(Math.max(parsed, config.min), config.max);
      onChange(config.key, clamped);
    }
  };

  const handleFocus = () => { setFocused(true); setInputText(String(value)); };
  const handleBlur = () => { setFocused(false); setInputText(''); };

  const scoreColor = score >= 7 ? '#e05878' : score >= 5 ? '#7898f0' : score >= 3 ? '#6dba9a' : 'var(--accent)';

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{config.label}</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ backgroundColor: 'var(--bg-input)', color: scoreColor, fontWeight: 700 }}
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
        style={{ accentColor: scoreColor }}
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

// ── 티어 분포도 컴포넌트 ──────────────────────────────────────────────────────

const TierDistributionChart: React.FC<{
  currentTierIdx: number;
  data: typeof TIER_DISTRIBUTION;
  onEdit: () => void;
  isAdmin: boolean;
}> = ({ currentTierIdx, data, onEdit, isAdmin }) => {
  const maxPct = Math.max(...data.map(t => t.pct));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)' }}>
          서버 티어 분포
        </p>

        {isAdmin && (
          <button
            onClick={onEdit}
            className="text-xs px-2 py-1 rounded"
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
          >
            ✏️ 시즌 수정
          </button>
        )}
      </div>

      <div className="space-y-2">
        {data.map((item, i) => {
          const isCurrent = i === currentTierIdx;
          const barWidth = (item.pct / maxPct) * 100;

          return (
            <div key={item.tier} className="flex items-center gap-2">
              <span className="text-xs w-16 text-right"
                style={{
                  color: isCurrent ? item.color : 'var(--text-secondary)',
                  fontWeight: isCurrent ? 700 : 400,
                }}>
                {item.tier}
              </span>

              <div className="flex-1 h-2 rounded-full relative"
                style={{ backgroundColor: 'var(--bg-input)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: isCurrent ? item.color : 'var(--border)',
                  }}
                />
              </div>

              <span className="text-xs w-10 text-right"
                style={{
                  color: isCurrent ? item.color : 'var(--text-secondary)',
                }}>
                {item.pct}%
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
        * 총 198,586명 기준 · 시즌마다 수정 가능
      </p>
    </div>
  );
};

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

const defaultValues: Record<StatKey, number> = Object.fromEntries(
  STAT_CONFIG.map(c => [c.key, c.defaultValue])
) as Record<StatKey, number>;

export const MmrPage: React.FC = () => {
  const [values, setValues] = useState<Record<StatKey, number>>(defaultValues);

  const [tierDist, setTierDist] = useState(getInitialTierDist);
  const [editOpen, setEditOpen] = useState(false);

  const { isLoggedIn } = useAuth();

  const handleChange = useCallback((key: StatKey, val: number) => {
    setValues(prev => ({ ...prev, [key]: val }));
  }, []);

  const { scores, total, tierIdx, mmr, maxKey, minKey, topPct } = calcResult(values, tierDist);
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
              <div className="flex items-end gap-6 mb-6">
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
                <div className="mb-1 ml-auto">
                  <p className="text-xs mb-1 text-right" style={{ color: 'var(--text-secondary)' }}>상위</p>
                  <p className="text-2xl font-bold text-right" style={{ color: tierColor }}>
                    {topPct.toFixed(2)}%
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

            {/* 서버 티어 분포 */}
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <TierDistributionChart
                currentTierIdx={tierIdx}
                data={tierDist}
                onEdit={() => setEditOpen(true)}
                isAdmin={isLoggedIn}
              />
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
          MMR은 공식 수치가 아닌 추정값이며, 실제 매칭 MMR과 다를 수 있습니다. 벤치마크는 이터니티 상위 플레이어 기록 및 공식 티어 분포 데이터를 기반으로 보정되었습니다.
        </p>

        <SeasonEditModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          data={tierDist}
          onSave={setTierDist}
        />
      </div>
    </div>
  );
};

const SeasonEditModal: React.FC<{
  open: boolean;
  onClose: () => void;
  data: typeof TIER_DISTRIBUTION;
  onSave: (d: typeof TIER_DISTRIBUTION) => void;
}> = ({ open, onClose, data, onSave }) => {
  const [temp, setTemp] = useState<typeof data>(() => data);

  useEffect(() => {
    if (open) setTemp(structuredClone(data));
  }, [open, data]);

  if (!open) return null;

  const sum = temp.reduce((a, b) => a + b.pct, 0);
  const valid = Math.abs(sum - 100) < 0.01;

  const update = (i: number, pct: number) => {
    if (isNaN(pct)) return;
    const copy = [...temp];
    copy[i] = { ...copy[i], pct };
    setTemp(copy);
  };

  const save = () => {
    if (!valid) return;

    const cloned = structuredClone(temp);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(cloned));
    onSave(cloned);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
      <div className="bg-[var(--bg-card)] p-6 rounded-2xl w-[420px]">
        <h2 className="text-sm font-bold mb-4">시즌 티어 분포 수정</h2>

        <div className="space-y-2">
          {temp.map((t, i) => (
            <div key={t.tier} className="flex items-center gap-2">
              <span className="text-xs w-20">{t.tier}</span>
              <input
                type="number"
                value={t.pct}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  update(i, isNaN(v) ? 0 : v);
                }}
                className="flex-1 px-2 py-1 text-sm rounded"
              />
            </div>
          ))}
        </div>

        <p className="text-xs mt-3">
          합계: {sum.toFixed(2)}%
        </p>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="text-xs px-3 py-1">
            취소
          </button>

          <button
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              onSave(TIER_DISTRIBUTION);
              onClose();
            }}
            className="text-xs px-3 py-1"
          >
            기본값
          </button>

          <button
            disabled={!valid}
            onClick={save}
            className="text-xs px-3 py-1"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};