import React, { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { GET_VOTE, ADD_OPTION, VOTE, DELETE_OPTION } from "../lib/queries";
import { useAuth } from "../context/AuthContext";

export default function VotePage() {
  const voteId = "main";

  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { data, refetch } = useQuery(GET_VOTE, {
    variables: { voteId },
  });

  const [addOption] = useMutation(ADD_OPTION);
  const [voteMutation, { loading }] = useMutation(VOTE);

  const [deleteOption] = useMutation(DELETE_OPTION);

  const { isLoggedIn } = useAuth();

  const options = data?.getVote?.options ?? [];

  const total = options.reduce((sum: number, opt: any) => sum + (Number(opt.count) || 0), 0);

  /**
   * 옵션 추가
   */
  const handleAddOption = async () => {
    if (!input.trim()) return;

    try {
      await addOption({
        variables: {
          voteId,
          text: input.trim(),
        },
      });

      setInput("");
      refetch();
    } catch (e: any) {
      setError(e.message || "옵션 추가 실패");
    }
  };

  /**
   * 투표
   */
  const handleVote = async () => {
    if (!selected) return;

    setError("");

    try {
      await voteMutation({
        variables: {
          voteId,
          optionId: selected,
        },
      });

      alert("투표 완료");
    } catch (err: any) {
      setError(err.message || "투표 실패");
    }
  };

  return (
    <div className="min-h-screen pt-14" style={{ backgroundColor: "var(--bg-base)" }}>
      <div className="max-w-screen-md mx-auto px-4 pt-12">

        <h1 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
          추가 기능 투표
        </h1>

        {/* 옵션 추가 */}
        <div className="flex gap-2 mb-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="항목 추가"
            className="flex-1 px-4 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: "var(--bg-input)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />

          <button
            onClick={handleAddOption}
            className="px-4 py-2 rounded-lg text-sm font-bold"
            style={{ backgroundColor: "var(--accent)", color: "#1a1a1a" }}
          >
            추가
          </button>
        </div>

        {/* 옵션 리스트 */}
        <div className="space-y-2 mb-4">
          {options.length === 0 && (
            <div style={{ color: "var(--text-muted)" }}>
              아직 투표 항목이 없습니다
            </div>
          )}

          {options.map((opt: any) => {
            const percent = total === 0 ? 0 : ((Number(opt.count) || 0) / total) * 100;

            return (
                <label
                key={opt.id}
                className="flex flex-col gap-1 px-3 py-2 rounded-lg"
                style={{ backgroundColor: "var(--bg-card)" }}
                >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                    <input
                        type="radio"
                        name="vote"
                        checked={selected === opt.id}
                        onChange={() => setSelected(opt.id)}
                    />
                    <span style={{ color: "var(--text-primary)" }}>
                        {opt.text}
                    </span>
                    </div>

                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {opt.count}표 ({percent.toFixed(1)}%)
                    </span>
                </div>

                {/* 바 그래프 */}
                <div
                    style={{
                    height: 6,
                    backgroundColor: "var(--bg-input)",
                    borderRadius: 999,
                    overflow: "hidden",
                    }}
                >
                    <div
                    style={{
                        width: `${percent}%`,
                        height: "100%",
                        backgroundColor: "var(--accent)",
                        transition: "width 0.3s",
                    }}
                    />
                </div>

                {isLoggedIn && (
                    <button
                    onClick={async () => {
                        await deleteOption({
                        variables: {
                            voteId,
                            optionId: opt.id,
                        },
                        });
                        refetch();
                    }}
                    style={{ color: "#ff8a8a", fontSize: 12, alignSelf: "flex-end" }}
                    >
                    삭제
                    </button>
                )}
                </label>
            );
          })}
        </div>

        {/* 에러 */}
        {error && (
          <p className="text-sm mb-2" style={{ color: "#ff8a8a" }}>
            {error}
          </p>
        )}

        {/* 투표 버튼 */}
        <button
          onClick={handleVote}
          disabled={!selected || loading}
          className="w-full py-3 rounded-lg font-bold"
          style={{
            backgroundColor: "var(--accent)",
            color: "#1a1a1a",
            opacity: !selected || loading ? 0.5 : 1,
          }}
        >
          {loading ? "투표 중..." : "투표하기"}
        </button>
      </div>
    </div>
  );
}