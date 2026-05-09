import React, { useState, useEffect, useCallback } from 'react';

// ── 타입 ──────────────────────────────────────────────────────
interface ScheduleEntry {
  id: string;
  date: string;   // 'YYYY-MM-DD'
  time: string;   // 'HH:MM' or ''
  content: string;
}

const LS_KEY = 'seanlink_schedule_v3';
const WEEK_DAY_KO = ['월', '화', '수', '목', '금', '토', '일'];
const MONTH_HEADERS = ['월', '화', '수', '목', '금', '토', '일'];

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(date: Date): string {
  return (
    date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0')
  );
}

function normalizeTime(raw: string): string {
  const s = raw.replace(':', '').replace(/\D/g, '');
  if (s.length === 3) return `0${s[0]}:${s.slice(1)}`;
  if (s.length === 4) return `${s.slice(0, 2)}:${s.slice(2)}`;
  return raw;
}

let _uid = 0;
function uid(): string { return `${Date.now()}-${++_uid}`; }

// ── 샘플 데이터 ───────────────────────────────────────────────
const SAMPLE: ScheduleEntry[] = [
  { id: uid(), date: '2026-05-04', time: '19:00', content: '솔레 뉴비 합방 (w. 다정현)' },
  { id: uid(), date: '2026-05-05', time: '15:00', content: '대충 날먹 방송' },
  { id: uid(), date: '2026-05-06', time: '18:00', content: '3퍼 자려 갈래말래 + 솔레 후기' },
  { id: uid(), date: '2026-05-07', time: '15:00', content: '루미아섬 시즌 11 맛보기 ㄱㄱ' },
  { id: uid(), date: '2026-05-08', time: '',      content: '안 쉬면 죽어요' },
  { id: uid(), date: '2026-05-09', time: '18:00', content: '땅조 먹어보기' },
  { id: uid(), date: '2026-05-10', time: '18:00', content: '못 다한 영도데이 (죽어보자 절대 금지)' },
];

// ── 아이콘 ────────────────────────────────────────────────────
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);

// ── CSS ───────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');

.sc-card {
  background: #f5e642;
  border-radius: 16px;
  border: 3px solid #3d2c1e;
  box-shadow: 5px 5px 0 #3d2c1e;
  overflow: hidden;
  font-family: 'Noto Sans KR', sans-serif;
}
.sc-header {
  background: #3d2c1e;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sc-title {
  color: #f5e642;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 3px;
}
.sc-header-badge {
  background: #e05c7a;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
  font-family: 'Noto Sans KR', sans-serif;
  animation: pulse-badge 1.5s ease-in-out infinite;
}
@keyframes pulse-badge {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.sc-day-row {
  display: flex;
  align-items: stretch;
  border-bottom: 2px solid #3d2c1e;
  transition: background 0.12s;
  min-height: 62px;
}
.sc-day-row:last-child { border-bottom: none; }
.sc-day-row.today      { background: rgba(255,255,255,0.35); }
.sc-day-row:not(.edit-mode):hover { background: rgba(255,255,255,0.18); }
.sc-day-row.today:not(.edit-mode):hover { background: rgba(255,255,255,0.42); }
.sc-day-row.edit-mode  { background: rgba(255,255,255,0.22); }
.sc-day-row.edit-mode.today { background: rgba(255,255,255,0.45); }

.sc-day-label {
  width: 72px;
  flex-shrink: 0;
  border-right: 2px solid #3d2c1e;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 6px;
}
.sc-day-name { font-size: 20px; font-weight: 900; line-height: 1; }
.sc-day-num  { font-size: 22px; font-weight: 900; line-height: 1; }
.sc-today-circle {
  background: #e05c7a;
  border-radius: 50%;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
}
.sc-time-badge {
  background: #3d2c1e; color: #f5e642;
  font-size: 11px; font-weight: 700;
  padding: 3px 9px; border-radius: 5px;
  flex-shrink: 0; white-space: nowrap;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.3px;
}
.sc-content { font-size: 14px; font-weight: 700; color: #3d2c1e; line-height: 1.4; }

/* 인라인 편집 인풋 */
.sc-inline-input {
  background: rgba(255,255,255,0.7);
  border: 1.5px solid #3d2c1e;
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 12px;
  font-family: 'Noto Sans KR', sans-serif;
  color: #3d2c1e;
  font-weight: 700;
  outline: none;
  transition: border-color .15s, background .15s;
  box-sizing: border-box;
}
.sc-inline-input:focus {
  border-color: #e05c7a;
  background: rgba(255,255,255,0.95);
}
.sc-inline-input::placeholder { color: #3d2c1e; opacity: 0.35; font-weight: 400; }
.sc-inline-time { width: 68px; flex-shrink: 0; }
.sc-inline-content { flex: 1; min-width: 0; }

.sc-add-day-btn {
  background: rgba(61,44,30,0.07);
  border: 1.5px dashed #3d2c1e;
  color: #3d2c1e; opacity: 0.6;
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 11px; font-weight: 700;
  cursor: pointer; white-space: nowrap;
  font-family: 'Noto Sans KR', sans-serif;
  transition: opacity .15s, background .15s;
  flex-shrink: 0;
}
.sc-add-day-btn:hover { opacity: 1; background: rgba(255,255,255,0.5); }

.sc-del-inline-btn {
  background: transparent;
  border: 1.5px solid rgba(224,92,122,0.5);
  color: #e05c7a;
  border-radius: 6px;
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  transition: background .15s, border-color .15s;
}
.sc-del-inline-btn:hover { background: #e05c7a; color: #fff; border-color: #e05c7a; }

/* 하단 편집 액션 바 */
.sc-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 2px solid #3d2c1e;
  background: rgba(255,255,255,0.15);
}

/* 네비/탭 버튼 */
.sc-nav-btn {
  background: #3d2c1e; color: #f5e642;
  border: none; padding: 7px 16px;
  border-radius: 8px; font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: 'Noto Sans KR', sans-serif;
  transition: opacity .15s;
}
.sc-nav-btn:hover { opacity: .75; }
.sc-today-btn {
  background: #e05c7a; color: #fff;
  border: none; padding: 5px 11px;
  border-radius: 6px; font-size: 11px; font-weight: 700;
  cursor: pointer; font-family: 'Noto Sans KR', sans-serif;
  transition: opacity .15s;
}
.sc-today-btn:hover { opacity: .8; }
.sc-edit-btn {
  background: #3d2c1e; border: none; color: #f5e642;
  padding: 7px 16px; border-radius: 8px;
  font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: 'Noto Sans KR', sans-serif;
  transition: opacity .15s;
}
.sc-edit-btn:hover { opacity: .75; }
.sc-cancel-btn {
  background: transparent; color: #3d2c1e;
  border: 2px solid #3d2c1e;
  padding: 7px 16px; border-radius: 8px;
  font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: 'Noto Sans KR', sans-serif;
  transition: opacity .15s;
}
.sc-cancel-btn:hover { opacity: .6; }
.sc-save-btn {
  background: #e05c7a; color: #fff;
  border: none; padding: 7px 20px;
  border-radius: 8px; font-size: 12px; font-weight: 900;
  cursor: pointer; font-family: 'Noto Sans KR', sans-serif;
  transition: opacity .15s;
}
.sc-save-btn:hover { opacity: .8; }
.sc-tab-btn {
  padding: 7px 20px; border-radius: 8px;
  font-size: 13px; font-weight: 900;
  cursor: pointer; font-family: 'Noto Sans KR', sans-serif;
  transition: all .15s;
}
.sc-tab-active  { background: #3d2c1e; color: #f5e642; border: none; }
.sc-tab-passive { background: transparent; color: #3d2c1e; border: 2px solid #3d2c1e; }

/* 월간 */
.sc-mcell {
  background: rgba(255,255,255,0.15);
  border-radius: 8px; border: 1.5px solid #3d2c1e;
  min-height: 66px; padding: 4px;
  display: flex; flex-direction: column; gap: 2px;
  min-width: 0; /* 그리드 셀이 내용에 따라 늘어나지 않도록 */
  overflow: hidden;
}
.sc-mcell.today { background: rgba(255,255,255,0.42); border: 2px solid #e05c7a; }
.sc-mpill {
  background: #3d2c1e; color: #f5e642;
  font-size: 9px; font-weight: 700;
  padding: 1px 4px; border-radius: 3px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  min-width: 0;
}

/* ── 모바일 반응형 ─────────────────────────────────────────── */
@media (max-width: 520px) {
  /* 카드 헤더 */
  .sc-title { font-size: 12px; letter-spacing: 1px; }

  /* 주간 요일 라벨 - 더 좁게 */
  .sc-day-label { width: 50px; gap: 2px; padding: 8px 2px; }
  .sc-day-name  { font-size: 13px; }
  .sc-day-num   { font-size: 15px; }
  .sc-today-circle { width: 24px; height: 24px; }
  .sc-day-row   { min-height: 48px; }

  /* 내용 영역 */
  .sc-content   { font-size: 12px; }
  .sc-time-badge { font-size: 10px; padding: 2px 5px; border-radius: 4px; }

  /* 편집 인풋 */
  .sc-inline-time    { width: 54px; }
  .sc-inline-input   { font-size: 11px; padding: 4px 5px; }
  .sc-del-inline-btn { width: 26px; height: 26px; }
  .sc-add-day-btn    { font-size: 10px; padding: 2px 6px; }

  /* 월간 셀 - 7열이므로 최대한 압축 */
  .sc-mcell  { min-height: 44px; padding: 2px; gap: 1px; border-radius: 4px; border-width: 1px; }
  .sc-mpill  { font-size: 7px; padding: 1px 2px; border-radius: 2px; }

  /* 버튼 크기 축소 */
  .sc-nav-btn    { padding: 5px 10px; font-size: 11px; }
  .sc-today-btn  { padding: 4px 8px;  font-size: 10px; }
  .sc-edit-btn   { padding: 5px 10px; font-size: 11px; }
  .sc-save-btn   { padding: 5px 12px; font-size: 11px; }
  .sc-cancel-btn { padding: 5px 10px; font-size: 11px; }
  .sc-tab-btn    { padding: 5px 12px; font-size: 12px; }
}
`;

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export const SchedulePage: React.FC = () => {
  const [tab, setTab]               = useState<'week' | 'month'>('week');
  const [weekStart, setWeekStart]   = useState<Date>(() => getMondayOfWeek(new Date()));
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [entries, setEntries] = useState<ScheduleEntry[]>(() => {
    try { const s = localStorage.getItem(LS_KEY); if (s) return JSON.parse(s); } catch {}
    return SAMPLE;
  });

  // 편집 상태
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft]       = useState<ScheduleEntry[]>([]);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(entries));
  }, [entries]);

  const today = toDateKey(new Date());

  const getEntries = useCallback(
    (dateKey: string) =>
      entries.filter(e => e.date === dateKey).sort((a, b) => a.time.localeCompare(b.time)),
    [entries]
  );
  const getDraftEntries = useCallback(
    (dateKey: string) =>
      draft.filter(e => e.date === dateKey).sort((a, b) => a.time.localeCompare(b.time)),
    [draft]
  );

  // ── 편집 시작/취소/저장 ──────────────────────────────────────
  const startEdit = () => {
    setDraft([...entries]);
    setEditMode(true);
  };
  const cancelEdit = () => {
    setDraft([]);
    setEditMode(false);
  };
  const saveEdit = () => {
    const valid = draft
      .filter(e => e.date.trim() && e.content.trim())
      .map(e => ({ ...e, time: e.time.trim() ? normalizeTime(e.time.trim()) : '' }));
    setEntries(valid);
    setDraft([]);
    setEditMode(false);
  };

  const updateDraft = (id: string, field: 'time' | 'content', value: string) =>
    setDraft(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));

  const addEntryForDate = (dateKey: string) =>
    setDraft(prev => [...prev, { id: uid(), date: dateKey, time: '', content: '' }]);

  const removeEntry = (id: string) =>
    setDraft(prev => prev.filter(e => e.id !== id));

  // ── 주간 ────────────────────────────────────────────────────
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const weekEnd = weekDates[6];
  const weekLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일 ~ ${weekEnd.getDate()}일`
      : `${weekStart.getMonth() + 1}/${weekStart.getDate()} ~ ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;

  const prevWeek = () => setWeekStart(p => { const d = new Date(p); d.setDate(d.getDate() - 7); return d; });
  const nextWeek = () => setWeekStart(p => { const d = new Date(p); d.setDate(d.getDate() + 7); return d; });
  const goToday  = () => setWeekStart(getMondayOfWeek(new Date()));

  // ── 월간 ────────────────────────────────────────────────────
  const firstDay    = new Date(currentMonth.year, currentMonth.month, 1);
  const lastDay     = new Date(currentMonth.year, currentMonth.month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const calDays: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) =>
      new Date(currentMonth.year, currentMonth.month, i + 1)
    ),
  ];
  while (calDays.length % 7 !== 0) calDays.push(null);

  const prevMonth = () => setCurrentMonth(({ year, month }) =>
    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
  );
  const nextMonth = () => setCurrentMonth(({ year, month }) =>
    month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
  );

  // ── 요일 행 렌더 ─────────────────────────────────────────────
  const renderDayRow = (date: Date, i: number) => {
    const dateKey  = toDateKey(date);
    const isToday  = dateKey === today;
    const dow      = date.getDay();
    const dayColor = dow === 0 ? '#e05c7a' : dow === 6 ? '#4a90d9' : '#3d2c1e';
    const rowClass = `sc-day-row${isToday ? ' today' : ''}${editMode ? ' edit-mode' : ''}`;

    // 유효한 시간만 뱃지로 표시 (빈 값, '-', '--:--' 등 제외)
    const hasValidTime = (t: string) => /^\d{1,2}:\d{2}$/.test(t.trim());

    return (
      <div key={dateKey} className={rowClass}>
        {/* 요일/날짜 라벨 */}
        <div className="sc-day-label">
          <span className="sc-day-name" style={{ color: dayColor }}>{WEEK_DAY_KO[i]}</span>
          <div className={isToday ? 'sc-today-circle' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="sc-day-num" style={{ color: isToday ? '#fff' : dayColor }}>
              {date.getDate()}
            </span>
          </div>
        </div>

        {/* ── 뷰 모드 ── */}
        {!editMode && (
          <div style={{
            flex: 1,
            padding: '0 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 7,
          }}>
            {getEntries(dateKey).length === 0 ? (
              <span style={{ color: '#3d2c1e', opacity: 0.2, fontSize: 22, fontWeight: 900 }}>—</span>
            ) : (
              getEntries(dateKey).map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {hasValidTime(e.time) && <span className="sc-time-badge">{e.time}</span>}
                  <span className="sc-content">{e.content}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── 편집 모드 ── */}
        {editMode && (
          <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
            {getDraftEntries(dateKey).length === 0 && (
              <span style={{ color: '#3d2c1e', opacity: 0.25, fontSize: 12, fontWeight: 700 }}>
                일정 없음
              </span>
            )}
            {getDraftEntries(dateKey).map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="text"
                  className="sc-inline-input sc-inline-time"
                  value={e.time}
                  onChange={ev => updateDraft(e.id, 'time', ev.target.value)}
                  placeholder="18:00"
                  maxLength={5}
                />
                <input
                  type="text"
                  className="sc-inline-input sc-inline-content"
                  value={e.content}
                  onChange={ev => updateDraft(e.id, 'content', ev.target.value)}
                  placeholder="방송 내용"
                />
                <button
                  type="button"
                  className="sc-del-inline-btn"
                  onClick={() => removeEntry(e.id)}
                  title="삭제"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="sc-add-day-btn"
              onClick={() => addEntryForDate(dateKey)}
            >
              + 추가
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen pt-14" style={{ backgroundColor: 'var(--bg-base)' }}>
      <style>{CSS}</style>

      <div className="max-w-screen-md mx-auto px-4 pt-10 pb-16">

        {/* ── 상단 컨트롤 ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
          <button
            className={`sc-tab-btn ${tab === 'week' ? 'sc-tab-active' : 'sc-tab-passive'}`}
            onClick={() => { cancelEdit(); setTab('week'); }}
          >주간</button>
          <button
            className={`sc-tab-btn ${tab === 'month' ? 'sc-tab-active' : 'sc-tab-passive'}`}
            onClick={() => { cancelEdit(); setTab('month'); }}
          >월간</button>

          {!editMode
            ? <button className="sc-edit-btn" onClick={startEdit}>✏️ 수정</button>
            : <>
                <button className="sc-cancel-btn" type="button" onClick={cancelEdit}>취소</button>
                <button className="sc-save-btn"   type="button" onClick={saveEdit}>저장</button>
              </>
          }
        </div>

        {/* ════ 주간 뷰 ════ */}
        {tab === 'week' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <button className="sc-nav-btn" onClick={prevWeek} disabled={editMode} style={{ opacity: editMode ? 0.35 : 1 }}>← 이전</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 900, fontSize: 'clamp(11px, 3.5vw, 14px)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  {weekLabel}
                </span>
                <button className="sc-today-btn" onClick={goToday} disabled={editMode} style={{ opacity: editMode ? 0.35 : 1 }}>오늘</button>
              </div>
              <button className="sc-nav-btn" onClick={nextWeek} disabled={editMode} style={{ opacity: editMode ? 0.35 : 1 }}>다음 →</button>
            </div>

            <div className="sc-card">
              <div className="sc-header">
                <span className="sc-title">WEEKLY SCHEDULE</span>
                {editMode && <span className="sc-header-badge">수정 중</span>}
              </div>
              {weekDates.map((date, i) => renderDayRow(date, i))}
            </div>
          </>
        )}

        {/* ════ 월간 뷰 ════ */}
        {tab === 'month' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <button className="sc-nav-btn" onClick={prevMonth}>← 이전</button>
              <span style={{ fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 900, fontSize: 14, color: 'var(--text-primary)' }}>
                {currentMonth.year}년 {currentMonth.month + 1}월
              </span>
              <button className="sc-nav-btn" onClick={nextMonth}>다음 →</button>
            </div>

            <div className="sc-card">
              <div className="sc-header">
                <span className="sc-title">MONTHLY SCHEDULE</span>
              </div>
              <div style={{ padding: 12, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 4, marginBottom: 4 }}>
                  {MONTH_HEADERS.map((d, i) => (
                    <div key={d} style={{
                      textAlign: 'center', fontSize: 11, fontWeight: 900,
                      fontFamily: "'Noto Sans KR',sans-serif",
                      color: i === 6 ? '#e05c7a' : i === 5 ? '#4a90d9' : '#3d2c1e',
                      paddingBottom: 4,
                    }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 4 }}>
                  {calDays.map((date, i) => {
                    if (!date) return <div key={`e-${i}`} style={{ minHeight: 66 }} />;
                    const dateKey   = toDateKey(date);
                    const dayEntries = getEntries(dateKey);
                    const isToday   = dateKey === today;
                    const colIdx    = (startOffset + date.getDate() - 1) % 7;
                    const isSat = colIdx === 5, isSun = colIdx === 6;
                    return (
                      <div key={dateKey} className={`sc-mcell${isToday ? ' today' : ''}`}>
                        <span style={{
                          fontSize: 11, fontWeight: 900, fontFamily: "'Noto Sans KR',sans-serif",
                          background: isToday ? '#e05c7a' : 'transparent',
                          color: isToday ? '#fff' : isSun ? '#e05c7a' : isSat ? '#4a90d9' : '#3d2c1e',
                          borderRadius: '50%', width: 19, height: 19,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>{date.getDate()}</span>
                        {dayEntries.map(e => (
                          <div key={e.id} className="sc-mpill" title={`${e.time ? e.time + ' ' : ''}${e.content}`}>
                            {e.time && <span>{e.time} </span>}{e.content}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
