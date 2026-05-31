import { useEffect, useRef, useState } from 'react';
import { Roulette } from './lib/roulette';
import { PinballRenderer } from './PinballRenderer';
import type { GamePhase } from './pinball.types';
import options from './lib/options';
import { stages } from './lib/data/maps';

let _pendingContainer: HTMLElement | null = null;

class PinballRoulette extends Roulette {
  protected createRenderer() {
    return new PinballRenderer(_pendingContainer!);
  }
}

export function usePinball(containerRef: React.RefObject<HTMLDivElement | null>) {
  const rouletteRef = useRef<PinballRoulette | null>(null);
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [winner, setWinner] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const namesRef = useRef<string[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    _pendingContainer = container;
    const roulette = new PinballRoulette();
    _pendingContainer = null;
    rouletteRef.current = roulette;

    const checkReady = setInterval(() => {
      if (roulette.isReady) {
        setIsReady(true);
        clearInterval(checkReady);
      }
    }, 100);

    roulette.addEventListener('goal', (e: Event) => {
      const name = (e as CustomEvent).detail.winner as string;
      setWinner(name);
      setPhase('finished');
    });

    return () => {
      clearInterval(checkReady);
      container.querySelector('canvas')?.remove();
      rouletteRef.current = null;
      setIsReady(false);
    };
  }, []);

  // 마블을 화면에 올려놓기 (start 전)
  const preview = (names: string[], rank: number, map: number) => {
    const roulette = rouletteRef.current;
    if (!roulette || !roulette.isReady) return;

    console.log('map index:', map, 'stage:', stages[map]?.title); // ← 확인용

    namesRef.current = names;
    options.useSkills = false;
    options.winningRank = rank;
    roulette.setWinningRank(rank);
    (roulette as any)._stage = stages[map];
    (roulette as any)._loadMap();
    roulette.setMarbles(names);
    setPhase('preview');
  };

  // 현재 마블 순서 셔플
  const shuffle = () => {
    const roulette = rouletteRef.current;
    if (!roulette || !roulette.isReady || phase !== 'preview') return;
    const shuffled = [...namesRef.current].sort(() => Math.random() - 0.5);
    namesRef.current = shuffled;
    roulette.setMarbles(shuffled);
  };

  // 게임 시작
  const startGame = (useSkills: boolean, spd: number) => {
    const roulette = rouletteRef.current;
    if (!roulette || !roulette.isReady || phase !== 'preview') return;
    options.useSkills = useSkills;
    roulette.setSpeed(spd); // ← 시작 직전에 speed 적용
    roulette.start();
    setPhase('running');
  };

  const reset = () => {
    rouletteRef.current?.reset();
    setPhase('idle');
    setWinner(null);
  };

  const setMap = (index: number) => rouletteRef.current?.setMap(index);
  const setWinningRank = (rank: number) => {
    options.winningRank = rank;
    rouletteRef.current?.setWinningRank(rank);
  };
  const setSpeed = (speed: number) => rouletteRef.current?.setSpeed(speed);

  return { phase, winner, isReady, preview, shuffle, startGame, reset, setMap, setWinningRank, setSpeed };
}