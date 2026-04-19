import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

// ── 스타일 상수 ───────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
};
const btnPrimary: React.CSSProperties = { backgroundColor: 'var(--accent)', color: '#1a1a1a' };
const btnOutline: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: '2px solid var(--accent)',
  color: 'var(--accent)',
};
const btnDanger: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: '1px solid #ff8a8a',
  color: '#ff8a8a',
};

// ── 타입 ─────────────────────────────────────────────────────────────────
interface RouletteItem {
  id: string;
  name: string;
  weight: number;
  color: string;
}

type SpeedOption = 'slow' | 'normal' | 'fast';

type DonationRule = {
  unit: number;
  votes: number;
};

const SPEED_DURATION: Record<SpeedOption, number> = {
  slow: 7000,
  normal: 4500,
  fast: 2200,
};

const DEFAULT_COLORS = [
  '#2dd4a0', '#3b82f6', '#8b5cf6', '#22c0e8',
  '#f59e0b', '#ef4444', '#10b981', '#6366f1',
];

// ── 팔레트 색상 18개 ───────────────────────────────────────────────────────
const PALETTE_COLORS = [
  '#2dd4a0', '#22c0e8', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#10b981',
  '#14b8a6', '#06b6d4', '#a78bfa', '#fb923c', '#f43f5e', '#64748b',
];

const LS_KEY = 'roulette_items_v1';

const makeItem = (idx: number): RouletteItem => ({
  id: Date.now().toString() + Math.random(),
  name: '',
  weight: 1,
  color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
});

// ── 팔레트 컬러 피커 컴포넌트 ─────────────────────────────────────────────
const ColorPicker: React.FC<{
  value: string;
  onChange: (color: string) => void;
}> = ({ value, onChange }) => {
  const [custom, setCustom] = useState(value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, width: 152 }}>
        {PALETTE_COLORS.map(c => (
          <button
            key={c}
            onClick={() => onChange(c)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 5,
              background: c,
              border: c === value ? '2px solid #fff' : '2px solid transparent',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="color"
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            onChange(e.target.value);
          }}
          style={{
            width: 32,
            height: 32,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
        />
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>custom</span>
      </div>
    </div>
  );
};

// ── 캔버스 그리기 ─────────────────────────────────────────────────────────
function drawWheel(canvas: HTMLCanvasElement, items: RouletteItem[], rotation: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = canvas.width;
  const cx = size / 2, cy = size / 2, r = cx - 8;
  ctx.clearRect(0, 0, size, size);

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  if (!totalWeight || !items.length) return;

  let startAngle = rotation;
  items.forEach(item => {
    const slice = (item.weight / totalWeight) * 2 * Math.PI;
    const endAngle = startAngle + slice;
    const midAngle = startAngle + slice / 2;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const fontSize = Math.min(20, Math.max(12, r * 0.12));
    const maxChars = Math.max(4, Math.floor(slice * r * 0.6 / fontSize));
    const label = item.name.length > maxChars ? item.name.slice(0, maxChars) + '…' : item.name;
    const textR = r * 0.62;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(midAngle);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px 'Pretendard', 'Apple SD Gothic Neo', sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 6;
    ctx.fillText(label, textR, 0);
    ctx.restore();

    startAngle = endAngle;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, 2 * Math.PI);
  ctx.fillStyle = '#1a1a1a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ── 타이머 컴포넌트 ───────────────────────────────────────────────────────
const TIMER_PRESETS = [
  { label: '30초', m: 0, s: 30 },
  { label: '1분', m: 1, s: 0 },
  { label: '3분', m: 3, s: 0 },
  { label: '5분', m: 5, s: 0 },
];

const TimerDisplay: React.FC<{
  totalSeconds: number;
  remaining: number;
  running: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSetTime: (m: number, s: number) => void;
}> = ({ totalSeconds, remaining, running, onStart, onPause, onReset, onSetTime }) => {
  const [pickM, setPickM] = useState(1);
  const [pickS, setPickS] = useState(0);
  const [showPicker, setShowPicker] = useState(totalSeconds === 0);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const isWarning = remaining <= 10 && remaining > 0;
  const isDone = remaining === 0 && totalSeconds > 0;
  const isIdle = totalSeconds === 0;

  const size = 120;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const ringColor = isDone ? '#ef4444' : isWarning ? '#f59e0b' : 'var(--accent)';

  const handleSet = () => {
    onSetTime(pickM, pickS);
    setShowPicker(false);
  };

  return (
    <div
      className="flex flex-col items-center gap-3 p-4 rounded-2xl"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between w-full">
        <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>⏱ 타이머</p>
        {!running && (
          <button
            onClick={() => setShowPicker(p => !p)}
            className="text-xs px-2 py-0.5 rounded hover:opacity-70 transition-opacity"
            style={{ color: 'var(--accent)', border: '1px solid var(--accent)' }}
          >
            {showPicker ? '닫기' : '설정'}
          </button>
        )}
      </div>

      {/* 시간 설정 피커 */}
      {showPicker && (
        <div className="w-full flex flex-col gap-2">
          {/* 프리셋 */}
          <div className="flex gap-1.5 flex-wrap">
            {TIMER_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => { setPickM(p.m); setPickS(p.s); }}
                style={{
                  padding: '3px 8px',
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: pickM === p.m && pickS === p.s ? 'var(--accent)' : 'var(--bg-input)',
                  color: pickM === p.m && pickS === p.s ? '#1a1a1a' : 'var(--text-primary)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* 분:초 직접 입력 */}
          <div className="flex items-center gap-2">
            <input
              type="number" min={0} max={99} value={pickM}
              onChange={e => setPickM(Math.max(0, Math.min(99, parseInt(e.target.value) || 0)))}
              style={{ ...inputStyle, width: 44, textAlign: 'center', padding: '4px', borderRadius: 8, fontSize: 16, fontWeight: 900 }}
              className="focus:outline-none"
            />
            <span style={{ fontWeight: 900, color: 'var(--text-secondary)' }}>:</span>
            <input
              type="number" min={0} max={59} value={pickS}
              onChange={e => setPickS(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
              style={{ ...inputStyle, width: 44, textAlign: 'center', padding: '4px', borderRadius: 8, fontSize: 16, fontWeight: 900 }}
              className="focus:outline-none"
            />
            <button
              onClick={handleSet}
              disabled={pickM === 0 && pickS === 0}
              style={pickM === 0 && pickS === 0 ? { ...btnPrimary, opacity: 0.4, cursor: 'not-allowed', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 } : { ...btnPrimary, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}
            >
              적용
            </button>
          </div>
        </div>
      )}

      {/* 원형 프로그레스 */}
      {!isIdle && (
        <>
          <div className="relative flex items-center justify-center">
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
              <circle
                cx={size/2} cy={size/2} r={radius}
                fill="none" stroke={ringColor} strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s ease' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              {isDone ? (
                <span style={{ fontSize: 28, fontWeight: 900, color: '#ef4444' }}>⏰</span>
              ) : (
                <span style={{
                  fontSize: 26, fontWeight: 900,
                  fontVariantNumeric: 'tabular-nums',
                  color: isWarning ? '#f59e0b' : 'var(--text-primary)',
                  transition: 'color 0.3s ease',
                  letterSpacing: '-0.5px',
                }}>
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
              )}
            </div>
          </div>

          {isDone && (
            <p className="text-xs font-bold" style={{ color: '#ef4444' }}>시간 종료!</p>
          )}

          {/* 컨트롤 버튼 */}
          <div className="flex gap-2">
            {running ? (
              <button onClick={onPause} style={btnOutline} className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity">
                ⏸ 일시정지
              </button>
            ) : (
              <button
                onClick={onStart}
                disabled={remaining === 0}
                style={remaining === 0 ? { ...btnPrimary, opacity: 0.4, cursor: 'not-allowed', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 } : { ...btnPrimary, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}
              >
                ▶ 시작
              </button>
            )}
            <button onClick={onReset} style={btnDanger} className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity">
              ↺ 리셋
            </button>
          </div>
        </>
      )}

      {isIdle && !showPicker && (
        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          위 <span style={{ color: 'var(--accent)' }}>설정</span> 버튼으로 시간을 지정하세요
        </p>
      )}
    </div>
  );
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export const RoulettePage: React.FC = () => {
  const [view, setView] = useState<'setup' | 'spin'>('setup');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [items, setItems] = useState<RouletteItem[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [makeItem(0), makeItem(1)];
  });
  const [spinItems, setSpinItems] = useState<RouletteItem[]>([]);
  const [speed, setSpeed] = useState<SpeedOption>('normal');
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [showWinner, setShowWinner] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  // ── 타이머 상태 ──────────────────────────────────────────────────────────
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(1);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerTotalRef = useRef(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const timerTotal = timerMinutes * 60 + timerSeconds;

  const startTimer = useCallback(() => {
    if (timerRemaining <= 0) return;
    setTimerRunning(true);
  }, [timerRemaining]);

  const pauseTimer = useCallback(() => {
    setTimerRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setTimerRunning(false);
    setTimerRemaining(timerTotalRef.current);
  }, []);

  // 타이머 tick
  useEffect(() => {
    if (!timerRunning) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }
    timerIntervalRef.current = setInterval(() => {
      setTimerRemaining(prev => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning]);

  // 스핀 뷰 진입 시 타이머 초기화
  const initTimer = useCallback((total: number) => {
    timerTotalRef.current = total;
    setTimerRemaining(total);
    setTimerRunning(false);
  }, []);

  const [donationEnabled, setDonationEnabled] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('donation_enabled') || 'false');
    } catch {
      return false;
    }
  });
  const [donationRules, setDonationRules] = useState<DonationRule[]>(() => {
    try {
      const saved = localStorage.getItem('donation_rules');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [{ unit: 1000, votes: 1 }];
  });

  useEffect(() => {
    localStorage.setItem('donation_rules', JSON.stringify(donationRules));
  }, [donationRules]);

  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const rafRef = useRef<number>(0);
  const spinItemsRef = useRef<RouletteItem[]>([]);

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const getPercent = (w: number) =>
    totalWeight === 0 ? '0%' : `${((w / totalWeight) * 100).toFixed(2)}%`;

  const socketRef = useRef<any>(null);

  const handleUpdate = useCallback((data: any) => {
    const updated = data.item;
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === updated.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updated };
        return next;
      }
      return [...prev, updated];
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('donation_enabled', JSON.stringify(donationEnabled));
  }, [donationEnabled]);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    const params = new URLSearchParams(window.location.search);
    const rouletteId = params.get('channelId');

    if (!rouletteId) {
      socket.disconnect();
      return;
    }

    socket.emit('join', { rouletteId });
    socket.on('roulette:item_update', handleUpdate);

    return () => {
      socket.off('roulette:item_update', handleUpdate);
      socket.disconnect();
    };
  }, [handleUpdate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const donation = params.get('donation');

    if (donation === 'true') {
      setDonationEnabled(true);
      params.delete('donation');
      const newUrl =
        window.location.pathname +
        (params.toString() ? `?${params.toString()}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  useEffect(() => {
    if (!socketRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const rouletteId = params.get('channelId') ?? '';
    socketRef.current.emit('settings:update', {
      rouletteId,
      donationEnabled,
      donationRules,
    });
  }, [donationEnabled, donationRules]);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawWheel(canvas, view === 'spin' ? spinItems : items, rotationRef.current);
  }, [items, spinItems, view]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (focusId?.startsWith('color-')) setFocusId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [focusId]);

  // ── 설정 핸들러 ──────────────────────────────────────────────────────────
  const handleAdd = () => setItems(prev => [...prev, makeItem(prev.length)]);

  const handleClearAll = () => {
    if (!window.confirm('모든 항목을 지우시겠어요?')) return;
    setItems([makeItem(0), makeItem(1)]);
  };

  const handleDelete = (id: string) =>
    setItems(prev => prev.filter(i => i.id !== id));

  const handleNameChange = (id: string, name: string) =>
    setItems(prev => prev.map(i => (i.id === id ? { ...i, name } : i)));

  const handleWeightChange = (id: string, val: string) => {
    const w = Math.max(1, parseInt(val, 10) || 1);
    setItems(prev => prev.map(i => (i.id === id ? { ...i, weight: w } : i)));
  };

  const handleColorChange = (id: string, color: string) =>
    setItems(prev => prev.map(i => (i.id === id ? { ...i, color } : i)));

  // ── 드래그 앤 드롭 ────────────────────────────────────────────────────────
  const handleDragStart = (idx: number) => { dragIdx.current = idx; };
  const handleDragEnter = (idx: number) => { dragOverIdx.current = idx; };
  const handleDragEnd = () => {
    const from = dragIdx.current;
    const to = dragOverIdx.current;
    if (from !== null && to !== null && from !== to) {
      setItems(prev => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    }
    dragIdx.current = null;
    dragOverIdx.current = null;
  };

  // ── 룰렛 시작 ─────────────────────────────────────────────────────────────
  const handleStart = () => {
    const valid = items
      .map(i => ({ ...i, name: i.name.trim() }))
      .filter(i => i.name.length > 0);
    if (valid.length < 2) return;
    setSpinItems(valid);
    spinItemsRef.current = valid;
    setView('spin');
    setWinner(null);
    setShowWinner(false);

    // 타이머 초기화
    if (timerEnabled) {
      initTimer(timerTotal);
    }
  };

  // ── 룰렛 돌리기 ───────────────────────────────────────────────────────────
  const handleSpin = useCallback(() => {
    if (spinning) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const spinItemsLocal = spinItemsRef.current;
    if (spinItemsLocal.length < 2) return;

    setSpinning(true);
    setShowWinner(false);
    setWinner(null);

    const totalW = spinItemsLocal.reduce((s, i) => s + i.weight, 0);
    const extraSpins = (5 + Math.floor(Math.random() * 5)) * 2 * Math.PI;
    const targetAngle = Math.random() * 2 * Math.PI;
    const totalRotation = extraSpins + targetAngle;
    const duration = SPEED_DURATION[speed] + Math.random() * 500;
    const startTime = performance.now();
    const startRotation = rotationRef.current;

    const findWinner = (finalRot: number) => {
      let pointer =
        ((-Math.PI / 2 - finalRot) % (2 * Math.PI) + 2 * Math.PI) %
        (2 * Math.PI);
      let cumulative = 0;
      for (const item of spinItemsLocal) {
        cumulative += (item.weight / totalW) * 2 * Math.PI;
        if (pointer < cumulative) return item.name;
      }
      return spinItemsLocal[spinItemsLocal.length - 1].name;
    };

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      rotationRef.current = startRotation + totalRotation * easeOut(progress);
      drawWheel(canvas, spinItemsLocal, rotationRef.current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        const w = findWinner(rotationRef.current);
        setWinner(w);
        setHistory(prev => [w, ...prev]);
        setTimeout(() => setShowWinner(true), 100);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [spinning, speed]);

  const getSuggestions = (query: string, excludeId: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter(i => i.id !== excludeId && i.name.toLowerCase().includes(q))
      .slice(0, 5);
  };

  // ── 당첨 항목 제외하고 계속 ────────────────────────────────────────────────
  const handleExcludeAndContinue = () => {
    if (!winner) return;
    const next = spinItems.filter(i => i.name !== winner);
    if (next.length < 2) {
      alert('남은 항목이 2개 미만이라 계속할 수 없어요.');
      return;
    }
    setSpinItems(next);
    spinItemsRef.current = next;
    setWinner(null);
    setShowWinner(false);
  };

  const handleToggleDonation = () => {
    if (!donationEnabled) {
      window.location.replace(`/api/auth/login?scope=donation`);
      return;
    }
    setDonationEnabled(false);
  };

  // ── Setup View ─────────────────────────────────────────────────────────────
  if (view === 'setup') {
    return (
      <div className="min-h-screen pt-14" style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="max-w-2xl mx-auto px-4 pt-12 pb-10">

          {/* 상단 액션 */}
          <div className="flex justify-end mb-4">
            <button
              onClick={handleClearAll}
              style={btnDanger}
              className="px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
            >
              모두 지우기
            </button>
          </div>

          {/* 항목 목록 */}
          <div className="space-y-2 mb-4">
            {items.map((item, idx) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={e => e.preventDefault()}
                className="flex items-center gap-2 rounded-xl px-3 py-2 transition-colors"
                style={{ backgroundColor: 'var(--bg-card)', cursor: 'grab' }}
              >
                <span className="flex-shrink-0 select-none text-lg" style={{ color: 'var(--text-muted)' }}>
                  ⠿
                </span>
                <span className="text-sm font-bold flex-shrink-0 w-12 text-right" style={{ color: 'var(--text-primary)' }}>
                  항목 {idx + 1}
                </span>
                {/* 색상 선택 */}
                <div
                  className="relative flex-shrink-0"
                  onMouseDown={e => e.stopPropagation()}
                >
                  <button
                    onClick={() =>
                      setFocusId(focusId === `color-${item.id}` ? null : `color-${item.id}`)
                    }
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      background: item.color,
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    title="색상 선택"
                  />
                  {focusId === `color-${item.id}` && (
                    <div
                      className="absolute z-30 mt-1 p-2 rounded-xl shadow-lg"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        left: 0,
                      }}
                    >
                      <ColorPicker
                        value={item.color}
                        onChange={c => {
                          handleColorChange(item.id, c);
                          setFocusId(null);
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* 이름 입력 */}
                <div className="flex-1 min-w-0 relative">
                  <input
                    type="text"
                    value={item.name}
                    onChange={e => handleNameChange(item.id, e.target.value)}
                    onFocus={() => setFocusId(item.id)}
                    onBlur={() => setTimeout(() => setFocusId(null), 150)}
                    placeholder={`항목 ${idx + 1}`}
                    style={inputStyle}
                    className="w-full px-3 py-2 rounded-lg text-sm placeholder-gray-500 focus:outline-none"
                  />
                  {focusId === item.id && item.name.trim() && (
                    <div
                      className="absolute z-20 mt-1 w-full rounded-lg overflow-hidden shadow-lg"
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                      {getSuggestions(item.name, item.id).length === 0 ? (
                        <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                          추천 없음
                        </div>
                      ) : (
                        getSuggestions(item.name, item.id).map(s => (
                          <div
                            key={s.id}
                            onMouseDown={() => handleNameChange(item.id, s.name)}
                            className="px-3 py-2 text-sm cursor-pointer hover:opacity-80"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {s.name}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <input
                  value={item.weight}
                  onChange={e => handleWeightChange(item.id, e.target.value)}
                  style={inputStyle}
                  className="w-14 px-2 py-2 rounded-lg text-sm text-center focus:outline-none flex-shrink-0"
                />
                <span className="text-xs flex-shrink-0 w-14 text-right" style={{ color: 'var(--text-secondary)' }}>
                  {getPercent(item.weight)}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:opacity-70 transition-opacity text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* 항목 추가 */}
          <button
            onClick={handleAdd}
            style={btnOutline}
            className="w-full py-3 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity mb-6"
          >
            항목 추가
          </button>

          {/* ── 타이머 설정 ─────────────────────────────────────────────────── */}
          <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                ⏱ 타이머
              </span>
              <button
                onClick={() => setTimerEnabled(prev => !prev)}
                style={timerEnabled ? btnPrimary : btnOutline}
                className="px-4 py-1.5 rounded-lg text-sm font-bold hover:opacity-80 transition-opacity"
              >
                {timerEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {timerEnabled && (
              <div className="flex items-center gap-3 mt-2">
                {/* 분 */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => setTimerMinutes(m => Math.min(99, m + 1))}
                    className="w-8 h-7 rounded-lg text-sm font-bold hover:opacity-70 transition-opacity"
                    style={{ ...btnOutline, padding: 0 }}
                  >
                    ▲
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={timerMinutes}
                    onChange={e => setTimerMinutes(Math.max(0, Math.min(99, parseInt(e.target.value) || 0)))}
                    style={{ ...inputStyle, width: 52, textAlign: 'center', padding: '6px 4px', borderRadius: 8, fontSize: 20, fontWeight: 900 }}
                    className="focus:outline-none"
                  />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>분</span>
                  <button
                    onClick={() => setTimerMinutes(m => Math.max(0, m - 1))}
                    className="w-8 h-7 rounded-lg text-sm font-bold hover:opacity-70 transition-opacity"
                    style={{ ...btnOutline, padding: 0 }}
                  >
                    ▼
                  </button>
                </div>

                <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-secondary)', marginBottom: 18 }}>:</span>

                {/* 초 */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => setTimerSeconds(s => s >= 55 ? 0 : s + 5)}
                    className="w-8 h-7 rounded-lg text-sm font-bold hover:opacity-70 transition-opacity"
                    style={{ ...btnOutline, padding: 0 }}
                  >
                    ▲
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={timerSeconds}
                    onChange={e => setTimerSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    style={{ ...inputStyle, width: 52, textAlign: 'center', padding: '6px 4px', borderRadius: 8, fontSize: 20, fontWeight: 900 }}
                    className="focus:outline-none"
                  />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>초</span>
                  <button
                    onClick={() => setTimerSeconds(s => s <= 4 ? 55 : s - 5)}
                    className="w-8 h-7 rounded-lg text-sm font-bold hover:opacity-70 transition-opacity"
                    style={{ ...btnOutline, padding: 0 }}
                  >
                    ▼
                  </button>
                </div>

                {/* 프리셋 버튼 */}
                <div className="flex flex-col gap-1.5 ml-2">
                  {[
                    { label: '30초', m: 0, s: 30 },
                    { label: '1분', m: 1, s: 0 },
                    { label: '3분', m: 3, s: 0 },
                    { label: '5분', m: 5, s: 0 },
                  ].map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => { setTimerMinutes(preset.m); setTimerSeconds(preset.s); }}
                      style={{
                        ...inputStyle,
                        padding: '3px 10px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        background:
                          timerMinutes === preset.m && timerSeconds === preset.s
                            ? 'var(--accent)'
                            : 'var(--bg-input)',
                        color:
                          timerMinutes === preset.m && timerSeconds === preset.s
                            ? '#1a1a1a'
                            : 'var(--text-primary)',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {timerEnabled && timerTotal === 0 && (
              <p className="mt-2 text-xs" style={{ color: '#f59e0b' }}>
                ⚠ 시간을 1초 이상 설정해주세요
              </p>
            )}
          </div>

          {/* 후원 설정 */}
          <div className="mb-8 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                후원 반영
              </span>
              <button
                onClick={handleToggleDonation}
                style={donationEnabled ? btnPrimary : btnOutline}
                className="px-4 py-1.5 rounded-lg text-sm font-bold"
              >
                {donationEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="space-y-2 mb-3">
              {donationRules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={rule.unit}
                    onChange={(e) => {
                      const next = [...donationRules];
                      next[idx].unit = Number(e.target.value);
                      setDonationRules(next);
                    }}
                    className="w-20 px-2 py-1 rounded-lg text-sm"
                    style={inputStyle}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>치즈당</span>
                  <input
                    type="number"
                    min={1}
                    value={rule.votes}
                    onChange={(e) => {
                      const next = [...donationRules];
                      next[idx].votes = Number(e.target.value);
                      setDonationRules(next);
                    }}
                    className="w-16 px-2 py-1 rounded-lg text-sm"
                    style={inputStyle}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>표</span>
                  <button
                    onClick={() => setDonationRules(donationRules.filter((_, i) => i !== idx))}
                    className="text-xs px-2"
                    style={{ color: '#ff8a8a' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => setDonationRules([...donationRules, { unit: 1000, votes: 1 }])}
                className="text-xs px-2 py-1 rounded"
                style={btnOutline}
              >
                + 규칙 추가
              </button>
            </div>
            <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-base)' }}>
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>
                💬 후원 메시지 예시
              </p>
              <div className="space-y-1">
                {items.filter(i => i.name.trim()).slice(0, 3).map(item => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ backgroundColor: 'var(--bg-card)', color: 'var(--accent)' }}
                    >
                      룰렛 {item.name}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      → {item.name} 표 +{donationRules.map(r => `${r.votes}/${r.unit}`).join(', ')}
                    </span>
                  </div>
                ))}
                {items.filter(i => i.name.trim()).length === 0 && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>항목을 추가하면 예시가 표시돼요</p>
                )}
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                치지직 후원 메시지를 <span style={{ color: 'var(--accent)' }}>"룰렛 [항목명]"</span> 형식으로 보내주세요
              </p>
            </div>
          </div>

          {/* 속도 선택 */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>속도</span>
            {(['slow', 'normal', 'fast'] as SpeedOption[]).map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                style={speed === s ? btnPrimary : { ...inputStyle, border: '1px solid var(--border)' }}
                className="px-4 py-1.5 rounded-lg text-sm font-bold hover:opacity-80 transition-opacity"
              >
                {s === 'slow' ? '느리게' : s === 'normal' ? '보통' : '빠르게'}
              </button>
            ))}
          </div>

          {/* 룰렛 시작 */}
          <div className="flex justify-center">
            <button
              onClick={handleStart}
              disabled={items.filter(i => i.name.trim()).length < 2 || (timerEnabled && timerTotal === 0)}
              style={
                items.filter(i => i.name.trim()).length < 2 || (timerEnabled && timerTotal === 0)
                  ? { ...btnPrimary, opacity: 0.4, cursor: 'not-allowed' }
                  : btnPrimary
              }
              className="px-16 py-4 rounded-xl text-lg font-bold hover:opacity-80 transition-opacity"
            >
              룰렛 시작
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Spin View ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-14" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">

          {/* 룰렛 */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="relative mb-6">
              {/* 포인터 */}
              <div className="absolute z-10" style={{ top: '-12px', left: '50%', transform: 'translateX(-50%)' }}>
                <svg width="28" height="36" viewBox="0 0 28 36">
                  <ellipse cx="14" cy="14" rx="14" ry="14" fill="#ef4444" />
                  <polygon points="7,20 21,20 14,36" fill="#ef4444" />
                </svg>
              </div>

              <canvas
                ref={canvasRef}
                width={380}
                height={380}
                className="rounded-full"
                style={{ maxWidth: '90vw', maxHeight: '90vw' }}
              />

              {/* 당첨 오버레이 */}
              {showWinner && winner && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(0,0,0,0.72)' }}
                >
                  <p className="text-sm font-bold mb-3" style={{ color: 'var(--accent)' }}>당첨!</p>
                  <p
                    className="font-black text-center px-6 break-words leading-tight"
                    style={{ color: '#ffffff', fontSize: 'clamp(2rem, 8vw, 3.5rem)' }}
                  >
                    {winner}
                  </p>
                </div>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 w-full max-w-sm">
              <button
                onClick={() => {
                  setView('setup');
                  setWinner(null);
                  setShowWinner(false);
                  setHistory([]);
                  setTimerRunning(false);
                }}
                style={btnOutline}
                className="flex-1 py-3 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
              >
                돌아가기
              </button>
              <button
                onClick={handleSpin}
                disabled={spinning}
                style={spinning ? { ...btnPrimary, opacity: 0.5, cursor: 'not-allowed' } : btnPrimary}
                className="flex-1 py-3 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
              >
                {spinning ? '돌리는 중…' : '돌려!'}
              </button>
            </div>

            {/* 제외하고 계속 */}
            {showWinner && winner && (
              <button
                onClick={handleExcludeAndContinue}
                style={btnDanger}
                className="mt-3 w-full max-w-sm py-2.5 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
              >
                "{winner}" 제외하고 계속
              </button>
            )}
          </div>

          {/* 오른쪽 사이드 패널 */}
          <div className="flex flex-col gap-4 w-full lg:w-56 flex-shrink-0">

            {/* 타이머 — spin 화면 (항상 표시) */}
            <TimerDisplay
              totalSeconds={timerTotalRef.current}
              remaining={timerRemaining}
              running={timerRunning}
              onStart={startTimer}
              onPause={pauseTimer}
              onReset={resetTimer}
              onSetTime={(m, s) => {
                const total = m * 60 + s;
                timerTotalRef.current = total;
                setTimerRemaining(total);
                setTimerRunning(false);
              }}
            />

            {/* 히스토리 */}
            {history.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>당첨 기록</h3>
                  <button
                    onClick={() => setHistory([])}
                    className="text-xs hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    초기화
                  </button>
                </div>
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {history.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ backgroundColor: 'var(--bg-card)' }}
                    >
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {h}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
