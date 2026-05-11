import React, { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_SCHEDULES, SAVE_SCHEDULES } from '../lib/queries';

// ── 타입 ──────────────────────────────────────────────────────
interface ScheduleEntry {
  id: string;
  date: string;
  time?: string | null;
  content: string;
}

interface DraftEntry extends ScheduleEntry {
  _localId: string;
  _deleted?: boolean;
}

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

function isValidTimeFormat(t: string): boolean {
  return /^\d{1,2}:\d{2}$/.test(t.trim());
}

let _uid = 0;
function localId(): string { return `local-${Date.now()}-${++_uid}`; }

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
.sc-title { color: #f5e642; font-size: 16px; font-weight: 900; letter-spacing: 3px; }
.sc-header-badge {
  background: #e05c7a; color: #fff;
  font-size: 11px; font-weight: 700;
  padding: 3px 10px; border-radius: 20px;
  font-family: 'Noto Sans KR', sans-serif;
  animation: pulse-badge 1.5s ease-in-out infinite;
}
@keyframes pulse-badge { 0%,100%{opacity:1} 50%{opacity:.6} }

.sc-day-row {
  display: flex; align-items: stretch;
  border-bottom: 2px solid #3d2c1e;
  transition: background 0.12s;
  min-height: 62px;
}
.sc-day-row:last-child { border-bottom: none; }
.sc-day-row.today { background: rgba(255,255,255,0.35); }
.sc-day-row:not(.edit-mode):hover { background: rgba(255,255,255,0.18); }
.sc-day-row.today:not(.edit-mode):hover { background: rgba(255,255,255,0.42); }
.sc-day-row.edit-mode { background: rgba(255,255,255,0.22); }
.sc-day-row.edit-mode.today { background: rgba(255,255,255,0.45); }

.sc-day-label {
  width: 72px; flex-shrink: 0;
  border-right: 2px solid #3d2c1e;
  display: flex; flex-direction: row;
  align-items: center; justify-content: center;
  gap: 4px; padding: 10px 6px;
}
.sc-day-name { font-size: 20px; font-weight: 900; line-height: 1; }
.sc-day-num  { font-size: 22px; font-weight: 900; line-height: 1; }
.sc-today-circle {
  background: #e05c7a; border-radius: 50%;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
}
.sc-time-badge {
  background: #3d2c1e; color: #f5e642;
  font-size: 11px; font-weight: 700;
  padding: 3px 9px; border-radius: 5px;
  flex-shrink: 0; white-space: nowrap;
  font-variant-numeric: tabular-nums; letter-spacing: 0.3px;
}
.sc-content { font-size: 14px; font-weight: 700; color: #3d2c1e; line-height: 1.4; }

.sc-inline-input {
  background: rgba(255,255,255,0.7);
  border: 1.5px solid #3d2c1e; border-radius: 6px;
  padding: 5px 8px; font-size: 12px;
  font-family: 'Noto Sans KR', sans-serif;
  color: #3d2c1e; font-weight: 700;
  outline: none; box-sizing: border-box;
  transition: border-color .15s, background .15s;
}
.sc-inline-input:focus { border-color: #e05c7a; background: rgba(255,255,255,0.95); }
.sc-inline-input::placeholder { color: #3d2c1e; opacity: 0.35; font-weight: 400; }
.sc-inline-time    { width: 68px; flex-shrink: 0; }
.sc-inline-content { flex: 1; min-width: 0; }

.sc-add-day-btn {
  background: rgba(61,44,30,0.07);
  border: 1.5px dashed #3d2c1e; color: #3d2c1e; opacity: 0.6;
  border-radius: 6px; padding: 3px 10px;
  font-size: 11px; font-weight: 700; cursor: pointer;
  white-space: nowrap; flex-shrink: 0;
  font-family: 'Noto Sans KR', sans-serif;
  transition: opacity .15s, background .15s;
}
.sc-add-day-btn:hover { opacity: 1; background: rgba(255,255,255,0.5); }

.sc-del-inline-btn {
  background: transparent;
  border: 1.5px solid rgba(224,92,122,0.5); color: #e05c7a;
  border-radius: 6px; width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  transition: background .15s, border-color .15s;
}
.sc-del-inline-btn:hover { background: #e05c7a; color: #fff; border-color: #e05c7a; }

.sc-nav-btn {
  background: #3d2c1e; color: #f5e642; border: none;
  padding: 7px 16px; border-radius: 8px;
  font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: 'Noto Sans KR', sans-serif;
  transition: opacity .15s;
}
.sc-nav-btn:hover:not(:disabled) { opacity: .75; }
.sc-nav-btn:disabled { cursor: default; }

.sc-today-btn {
  background: #e05c7a; color: #fff; border: none;
  padding: 5px 11px; border-radius: 6px;
  font-size: 11px; font-weight: 700; cursor: pointer;
  font-family: 'Noto Sans KR', sans-serif; transition: opacity .15s;
}
.sc-today-btn:hover:not(:disabled) { opacity: .8; }

.sc-edit-btn {
  background: #3d2c1e; border: none; color: #f5e642;
  padding: 7px 16px; border-radius: 8px;
  font-size: 12px; font-weight: 700; cursor: pointer;
  font-family: 'Noto Sans KR', sans-serif; transition: opacity .15s;
}
.sc-edit-btn:hover { opacity: .75; }

.sc-cancel-btn {
  background: transparent; color: #3d2c1e;
  border: 2px solid #3d2c1e; padding: 7px 16px; border-radius: 8px;
  font-size: 12px; font-weight: 700; cursor: pointer;
  font-family: 'Noto Sans KR', sans-serif; transition: opacity .15s;
}
.sc-cancel-btn:hover { opacity: .6; }

.sc-save-btn {
  background: #e05c7a; color: #fff; border: none;
  padding: 7px 20px; border-radius: 8px;
  font-size: 12px; font-weight: 900; cursor: pointer;
  font-family: 'Noto Sans KR', sans-serif; transition: opacity .15s;
}
.sc-save-btn:hover:not(:disabled) { opacity: .8; }
.sc-save-btn:disabled { opacity: .5; cursor: default; }

.sc-tab-btn {
  padding: 7px 20px; border-radius: 8px;
  font-size: 13px; font-weight: 900; cursor: pointer;
  font-family: 'Noto Sans KR', sans-serif; transition: all .15s;
}
.sc-tab-active  { background: #3d2c1e; color: #f5e642; border: none; }
.sc-tab-passive { background: transparent; color: #3d2c1e; border: 2px solid #3d2c1e; }

.sc-loading {
  display: flex; align-items: center; justify-content: center;
  padding: 60px 0; font-family: 'Noto Sans KR', sans-serif;
  font-size: 14px; font-weight: 700; color: #3d2c1e; opacity: 0.45;
}

.sc-mcell {
  background: rgba(255,255,255,0.15);
  border-radius: 8px; border: 1.5px solid #3d2c1e;
  min-height: 66px; padding: 4px;
  display: flex; flex-direction: column; gap: 2px;
  min-width: 0; overflow: hidden;
}
.sc-mcell.today { background: rgba(255,255,255,0.42); border: 2px solid #e05c7a; }
.sc-mpill {
  background: #3d2c1e; color: #f5e642;
  font-size: 9px; font-weight: 700;
  padding: 1px 4px; border-radius: 3px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  min-width: 0;
}

@media (max-width: 520px) {
  .sc-title { font-size: 12px; letter-spacing: 1px; }
  .sc-day-label { width: 50px; gap: 2px; padding: 8px 2px; }
  .sc-day-name  { font-size: 13px; }
  .sc-day-num   { font-size: 15px; }
  .sc-today-circle { width: 24px; height: 24px; }
  .sc-day-row   { min-height: 48px; }
  .sc-content   { font-size: 12px; }
  .sc-time-badge { font-size: 10px; padding: 2px 5px; }
  .sc-inline-time  { width: 54px; }
  .sc-inline-input { font-size: 11px; padding: 4px 5px; }
  .sc-del-inline-btn { width: 26px; height: 26px; }
  .sc-add-day-btn { font-size: 10px; padding: 2px 6px; }
  .sc-mcell  { min-height: 44px; padding: 2px; gap: 1px; border-radius: 4px; border-width: 1px; }
  .sc-mpill  { font-size: 7px; padding: 1px 2px; border-radius: 2px; }
  .sc-nav-btn    { padding: 5px 10px; font-size: 11px; }
  .sc-today-btn  { padding: 4px 8px;  font-size: 10px; }
  .sc-edit-btn   { padding: 5px 10px; font-size: 11px; }
  .sc-save-btn   { padding: 5px 12px; font-size: 11px; }
  .sc-cancel-btn { padding: 5px 10px; font-size: 11px; }
  .sc-tab-btn    { padding: 5px 12px; font-size: 12px; }
}
`;

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function SchedulePage() {
  const [tab, setTab]             = useState<'week' | 'month'>('week');
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft]       = useState<DraftEntry[]>([]);
  const [error, setError]       = useState('');

  // ── Apollo ────────────────────────────────────────────────
  const { data, loading, refetch } = useQuery(GET_SCHEDULES);
  const [saveSchedulesMutation, { loading: saving }] = useMutation(SAVE_SCHEDULES);

  const entries: ScheduleEntry[] = data?.getSchedules ?? [];

  const today = toDateKey(new Date());

  const getEntries = useCallback(
    (dateKey: string) =>
      entries
        .filter(e => e.date === dateKey)
        .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
    [entries],
  );

  const getDraftEntries = useCallback(
    (dateKey: string) =>
      draft
        .filter(e => e.date === dateKey && !e._deleted)
        .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
    [draft],
  );

  // ── 편집 핸들러 ───────────────────────────────────────────
  const startEdit = () => {
    setDraft(entries.map(e => ({ ...e, _localId: localId() })));
    setError('');
    setEditMode(true);
  };

  const cancelEdit = () => {
    setDraft([]);
    setError('');
    setEditMode(false);
  };

  const saveEdit = async () => {
    setError('');

    const deleteIds = draft
      .filter(e => e._deleted && e.id)
      .map(e => e.id);

    const valid = draft
      .filter(e => !e._deleted)
      .filter(e => e.date.trim() && e.content.trim())
      .map(e => {
        const rawTime = e.time?.trim() ?? '';

        return {
          id: e.id || undefined,
          date: e.date,
          time:
            rawTime && rawTime !== '-'
              ? normalizeTime(rawTime)
              : null,
          content: e.content.trim(),
        };
      });

    try {
      await saveSchedulesMutation({
        variables: {
          entries: valid,
          deleteIds,
        },
      });

      await refetch();

      setDraft([]);
      setEditMode(false);
    } catch (e: any) {
      setError(e.message || '저장 실패');
    }
  };

  const updateDraft = (lId: string, field: 'time' | 'content', value: string) =>
    setDraft(prev => prev.map(e => e._localId === lId ? { ...e, [field]: value } : e));

  const addEntryForDate = (dateKey: string) =>
    setDraft(prev => [...prev, { id: '', date: dateKey, time: '', content: '', _localId: localId() }]);

  const removeEntry = (lId: string) =>
    setDraft(prev =>
      prev.map(e =>
        e._localId === lId
          ? { ...e, _deleted: true }
          : e
      )
    );

  // ── 주간 ──────────────────────────────────────────────────
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

  // ── 월간 ──────────────────────────────────────────────────
  const firstDay    = new Date(currentMonth.year, currentMonth.month, 1);
  const lastDay     = new Date(currentMonth.year, currentMonth.month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const calDays: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) =>
      new Date(currentMonth.year, currentMonth.month, i + 1),
    ),
  ];
  while (calDays.length % 7 !== 0) calDays.push(null);

  const prevMonth = () => setCurrentMonth(({ year, month }) =>
    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
  );
  const nextMonth = () => setCurrentMonth(({ year, month }) =>
    month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
  );

  // ── 행 렌더 ───────────────────────────────────────────────
  const renderDayRow = (date: Date, i: number) => {
    const dateKey  = toDateKey(date);
    const isToday  = dateKey === today;
    const dow      = date.getDay();
    const dayColor = dow === 0 ? '#e05c7a' : dow === 6 ? '#4a90d9' : '#3d2c1e';
    const rowClass = `sc-day-row${isToday ? ' today' : ''}${editMode ? ' edit-mode' : ''}`;

    return (
      <div key={dateKey} className={rowClass}>
        <div className="sc-day-label">
          <span className="sc-day-name" style={{ color: dayColor }}>{WEEK_DAY_KO[i]}</span>
          <div
            className={isToday ? 'sc-today-circle' : ''}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span className="sc-day-num" style={{ color: isToday ? '#fff' : dayColor }}>
              {date.getDate()}
            </span>
          </div>
        </div>

        {/* 뷰 모드 */}
        {!editMode && (
          <div style={{ flex: 1, padding: '0 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 7 }}>
            {getEntries(dateKey).length === 0 ? (
              <span style={{ color: '#3d2c1e', opacity: 0.2, fontSize: 22, fontWeight: 900 }}>—</span>
            ) : (
              getEntries(dateKey).map(e => (
                <div
                  key={e.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <span className="sc-time-badge">
                    {e.time && isValidTimeFormat(e.time) ? e.time : '-'}
                  </span>

                  <span className="sc-content">{e.content}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* 편집 모드 */}
        {editMode && (
          <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
            {getDraftEntries(dateKey).length === 0 && (
              <span style={{ color: '#3d2c1e', opacity: 0.25, fontSize: 12, fontWeight: 700 }}>
                일정 없음
              </span>
            )}
            {getDraftEntries(dateKey).map(e => (
              <div key={e._localId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="text"
                  className="sc-inline-input sc-inline-time"
                  value={e.time ?? ''}
                  onChange={ev => updateDraft(e._localId, 'time', ev.target.value)}
                  placeholder="18:00"
                  maxLength={5}
                />
                <input
                  type="text"
                  className="sc-inline-input sc-inline-content"
                  value={e.content}
                  onChange={ev => updateDraft(e._localId, 'content', ev.target.value)}
                  placeholder="방송 내용"
                />
                <button
                  type="button"
                  className="sc-del-inline-btn"
                  onClick={() => removeEntry(e._localId)}
                  title="삭제"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
            <button type="button" className="sc-add-day-btn" onClick={() => addEntryForDate(dateKey)}>
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

        {/* 상단 컨트롤 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
          <button
            className={`sc-tab-btn ${tab === 'week' ? 'sc-tab-active' : 'sc-tab-passive'}`}
            onClick={() => { cancelEdit(); setTab('week'); }}
          >
            주간
          </button>
          <button
            className={`sc-tab-btn ${tab === 'month' ? 'sc-tab-active' : 'sc-tab-passive'}`}
            onClick={() => { cancelEdit(); setTab('month'); }}
          >
            월간
          </button>

          {!editMode && (
            <button className="sc-edit-btn" onClick={startEdit}>✏️ 수정</button>
          )}
          {editMode && (
            <>
              <button className="sc-cancel-btn" type="button" onClick={cancelEdit}>취소</button>
              <button className="sc-save-btn" type="button" onClick={saveEdit} disabled={saving}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </>
          )}
        </div>

        {/* 에러 */}
        {error && (
          <p className="text-sm mb-3" style={{ color: '#ff8a8a', fontFamily: "'Noto Sans KR',sans-serif" }}>
            {error}
          </p>
        )}

        {/* 주간 뷰 */}
        {tab === 'week' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <button className="sc-nav-btn" onClick={prevWeek} disabled={editMode} style={{ opacity: editMode ? 0.35 : 1 }}>
                ← 이전
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 900, fontSize: 'clamp(11px,3.5vw,14px)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  {weekLabel}
                </span>
                <button className="sc-today-btn" onClick={goToday} disabled={editMode} style={{ opacity: editMode ? 0.35 : 1 }}>
                  오늘
                </button>
              </div>
              <button className="sc-nav-btn" onClick={nextWeek} disabled={editMode} style={{ opacity: editMode ? 0.35 : 1 }}>
                다음 →
              </button>
            </div>

            <div className="sc-card">
              <div className="sc-header">
                <span className="sc-title">WEEKLY SCHEDULE</span>
                {editMode && <span className="sc-header-badge">수정 중</span>}
              </div>
              {loading
                ? <div className="sc-loading">일정을 불러오는 중...</div>
                : weekDates.map((date, i) => renderDayRow(date, i))
              }
            </div>
          </>
        )}

        {/* 월간 뷰 */}
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
                    <div
                      key={d}
                      style={{
                        textAlign: 'center', fontSize: 11, fontWeight: 900,
                        fontFamily: "'Noto Sans KR',sans-serif",
                        color: i === 6 ? '#e05c7a' : i === 5 ? '#4a90d9' : '#3d2c1e',
                        paddingBottom: 4,
                      }}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {loading
                  ? <div className="sc-loading">일정을 불러오는 중...</div>
                  : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 4 }}>
                      {calDays.map((date, i) => {
                        if (!date) return <div key={`e-${i}`} style={{ minHeight: 66 }} />;
                        const dateKey    = toDateKey(date);
                        const dayEntries = getEntries(dateKey);
                        const isToday    = dateKey === today;
                        const colIdx     = (startOffset + date.getDate() - 1) % 7;
                        const isSat = colIdx === 5;
                        const isSun = colIdx === 6;

                        return (
                          <div key={dateKey} className={`sc-mcell${isToday ? ' today' : ''}`}>
                            <span style={{
                              fontSize: 11, fontWeight: 900,
                              fontFamily: "'Noto Sans KR',sans-serif",
                              background: isToday ? '#e05c7a' : 'transparent',
                              color: isToday ? '#fff' : isSun ? '#e05c7a' : isSat ? '#4a90d9' : '#3d2c1e',
                              borderRadius: '50%', width: 19, height: 19,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              {date.getDate()}
                            </span>
                            {dayEntries.map(e => (
                              <div
                                key={e.id}
                                className="sc-mpill"
                                title={`${e.time && isValidTimeFormat(e.time) ? e.time + ' ' : ''}${e.content}`}
                              >
                                {e.time && isValidTimeFormat(e.time) && <span>{e.time} </span>}
                                {e.content}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )
                }
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
