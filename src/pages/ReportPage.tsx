import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ALL_REPORTS, CREATE_REPORT, RESOLVE_REPORT } from '../lib/queries';
import { ReportModel } from '../types/models';
import { useAuth } from '../context/AuthContext';

const inputStyle: React.CSSProperties = { backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' };
const btnPrimary: React.CSSProperties = { backgroundColor: 'var(--accent)', color: '#1a1a1a' };
const btnSecondary: React.CSSProperties = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' };

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

export const ReportPage: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const [filter, setFilter] = useState<boolean | undefined>(undefined);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [createError, setCreateError] = useState('');
  const [resolveTarget, setResolveTarget] = useState<ReportModel | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [resolveError, setResolveError] = useState('');
  const [detailTarget, setDetailTarget] = useState<ReportModel | null>(null);

  const { data, loading, refetch } = useQuery(GET_ALL_REPORTS, {
    variables: { isResolved: filter },
    fetchPolicy: 'network-only',
  });
  const reports: ReportModel[] = data?.getAllReports ?? [];

  const [createReport, { loading: creating }] = useMutation(CREATE_REPORT);
  const [resolveReport, { loading: resolving }] = useMutation(RESOLVE_REPORT);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    try {
      await createReport({ variables: { input: { title: newTitle, content: newContent } } });
      setNewTitle(''); setNewContent(''); setShowCreateModal(false); refetch();
    } catch (err: any) {
      setCreateError(err.message || '신고 등록에 실패했어요.');
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveTarget) return;
    setResolveError('');
    try {
      await resolveReport({ variables: { input: { reportId: resolveTarget.id, adminComment } } });
      setResolveTarget(null); setAdminComment(''); refetch();
    } catch (err: any) {
      setResolveError(err.message || '처리에 실패했어요.');
    }
  };

  return (
    <div className="min-h-screen pt-14" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="max-w-screen-md mx-auto px-4 pt-8 pb-6">

        {/* ── 헤더: 제목+버튼 한 줄, 설명은 아래 ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>신고 / 문의</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              style={btnPrimary}
              className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold hover:opacity-80 transition-opacity whitespace-nowrap"
            >
              + 신고하기
            </button>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            문제가 있는 콘텐츠나 오류를 신고해 주세요
          </p>
        </div>

        {/* ── 필터 탭: 균등 분배 ── */}
        <div className="flex gap-2 mb-4">
          {[
            { label: '전체', value: undefined },
            { label: '미처리', value: false },
            { label: '처리완료', value: true },
          ].map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setFilter(value)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              style={
                filter === value
                  ? { backgroundColor: 'var(--accent)', color: '#1a1a1a' }
                  : { backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── 목록 ── */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-card)' }} />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40">
            <img src="/logo.png" alt="" className="w-[200px] sm:w-[350px] h-auto mb-4 opacity-20 grayscale" />
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map(report => (
              <div
                key={report.id}
                className="px-4 py-3 rounded-xl cursor-pointer transition-colors"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-input)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
                onClick={() => setDetailTarget(report)}
              >
                <div className="flex items-start gap-2">
                  {/* 좌측: 뱃지 + 제목 + 내용 + 날짜 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold flex-shrink-0"
                        style={{
                          backgroundColor: report.isResolved ? '#1a4a2a' : '#4a2a1a',
                          color: report.isResolved ? '#4ade80' : '#ffa07a',
                        }}
                      >
                        {report.isResolved ? '처리완료' : '미처리'}
                      </span>
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {report.title}
                      </p>
                    </div>
                    <p className="text-xs line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                      {report.content}
                    </p>
                    {/* 날짜: 내용 아래 배치 */}
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                      {formatDate(report.createdAt)}
                    </p>
                  </div>

                  {/* 우측: 답변 버튼 */}
                  {isLoggedIn && !report.isResolved && (
                    <button
                      onClick={e => { e.stopPropagation(); setResolveTarget(report); setAdminComment(''); }}
                      style={btnPrimary}
                      className="flex-shrink-0 self-center px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                    >
                      답변
                    </button>
                  )}
                </div>

                {report.isResolved && report.adminComment && (
                  <div className="mt-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                    💬 {report.adminComment}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 상세 보기 모달 ── */}
      {detailTarget && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => setDetailTarget(null)}
        >
          <div
            className="rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md max-h-[85vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="px-2 py-0.5 rounded text-xs font-bold flex-shrink-0"
                style={{
                  backgroundColor: detailTarget.isResolved ? '#1a4a2a' : '#4a2a1a',
                  color: detailTarget.isResolved ? '#4ade80' : '#ffa07a',
                }}
              >
                {detailTarget.isResolved ? '처리완료' : '미처리'}
              </span>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{detailTarget.title}</h2>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{formatDate(detailTarget.createdAt)}</p>
            <p className="text-sm leading-relaxed mb-4 whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{detailTarget.content}</p>
            {detailTarget.adminComment && (
              <div className="px-3 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <p className="text-xs font-bold mb-1" style={{ color: 'var(--accent)' }}>어드민 답변</p>
                <p className="whitespace-pre-wrap">{detailTarget.adminComment}</p>
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={() => setDetailTarget(null)} style={btnSecondary} className="px-4 py-2 rounded-lg text-sm hover:opacity-80 transition-opacity">닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 신고 작성 모달 ── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => { setShowCreateModal(false); setNewTitle(''); setNewContent(''); }}
        >
          <div
            className="rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">신고 / 문의하기</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>제목 *</label>
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} required placeholder="신고/문의 제목" style={inputStyle} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>내용 *</label>
                <textarea value={newContent} onChange={e => setNewContent(e.target.value)} required placeholder="신고/문의 내용을 자세히 작성해 주세요" rows={5} style={inputStyle} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none" />
              </div>
              {createError && <p className="text-sm" style={{ color: '#ff8a8a' }}>{createError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowCreateModal(false); setNewTitle(''); setNewContent(''); }} className="px-4 py-2 text-sm hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>취소</button>
                <button type="submit" disabled={creating} style={btnPrimary} className="px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50 hover:opacity-80 transition-opacity">
                  {creating ? '등록 중...' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 어드민 답변 모달 ── */}
      {resolveTarget && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => { setResolveTarget(null); setAdminComment(''); }}
        >
          <div
            className="rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-1">신고 처리</h2>
            <p className="text-sm mb-3 truncate" style={{ color: 'var(--text-muted)' }}>{resolveTarget.title}</p>
            <div className="px-3 py-2 rounded-lg mb-4 text-sm" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}>{resolveTarget.content}</div>
            <form onSubmit={handleResolve} className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>어드민 답변 *</label>
                <textarea value={adminComment} onChange={e => setAdminComment(e.target.value)} required placeholder="답변 내용을 입력해 주세요" rows={4} style={inputStyle} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none" />
              </div>
              {resolveError && <p className="text-sm" style={{ color: '#ff8a8a' }}>{resolveError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setResolveTarget(null); setAdminComment(''); }} className="px-4 py-2 text-sm hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>취소</button>
                <button type="submit" disabled={resolving} style={btnPrimary} className="px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50 hover:opacity-80 transition-opacity">
                  {resolving ? '처리 중...' : '처리 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
