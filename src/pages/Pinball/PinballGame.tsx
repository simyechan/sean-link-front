import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { usePinball } from './usePinball';
import type { PinballGameProps, PinballGameHandle } from './pinball.types';

export const PinballGame = forwardRef<PinballGameHandle, PinballGameProps>(
  ({ names, onWinner, mapIndex = 0, winningRank = 1, speed = 1, useSkills = true, onPhaseChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { phase, winner, isReady, preview, shuffle, startGame, reset, setMap, setWinningRank, setSpeed } = usePinball(containerRef);

    useImperativeHandle(ref, () => ({
        shuffle,
        startGame: () => startGame(useSkills, speed),
        reset,
        changeMap: (map: number) => {
            if (phase === 'preview') {
            preview(names, winningRank - 1, map);
            }
        },
    }));

    useEffect(() => {
        if (isReady && phase === 'idle' && names.length > 0) {
            preview(names, winningRank - 1, mapIndex);
        }
    }, [isReady, names]);

    useEffect(() => {
        if (phase === 'preview' || phase === 'idle') {
            setWinningRank(winningRank - 1);
        }
    }, [winningRank]);

    useEffect(() => { onPhaseChange?.(phase); }, [phase]);
    useEffect(() => { if (winner) onWinner?.(winner); }, [winner]);

    return (
        <div
            ref={containerRef}
            className="relative rounded-xl overflow-hidden border border-white/10 w-full h-full"
        />
      );
  }
);