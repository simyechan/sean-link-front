import { useEffect, useRef } from 'react';
import { usePinball } from './usePinball';
import type { PinballGameProps } from './pinball.types';

export function PinballGame({ names, onWinner, mapIndex = 0, winningRank = 1, speed = 1, useSkills = true }: PinballGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { status, winner, start, reset, isReady, setMap, setWinningRank, setSpeed, setSkills } = usePinball(containerRef);

  useEffect(() => {
    if (isReady && status === 'idle' && names.length > 0) {
      setSkills(useSkills);
      setMap(mapIndex);
      setWinningRank(winningRank - 1);
      setSpeed(speed);
      start(names);
    }
  }, [isReady]);

  useEffect(() => {
    if (winner) onWinner?.(winner);
  }, [winner]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden border border-white/10"
        style={{
            width: '100%',
            aspectRatio: '16/9',
        }}
      />
      {!isReady && (
        <div className="text-sm text-white/50">로딩 중...</div>
      )}
      {status === 'finished' && winner && (
        <div className="text-2xl font-bold">
          🎉 당첨자: <span className="text-yellow-400">{winner}</span>
        </div>
      )}
      {status === 'finished' && (
        <button
          onClick={reset}
          className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
        >
          다시하기
        </button>
      )}
    </div>
  );
}