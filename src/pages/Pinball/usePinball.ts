import { useEffect, useRef, useState } from 'react';
import { Roulette } from './lib/roulette';
import { PinballRenderer } from './PinballRenderer';
import type { GameStatus } from './pinball.types';
import options from './lib/options';

// super() 전에 container를 전달하기 위한 임시 저장소
let _pendingContainer: HTMLElement | null = null;

class PinballRoulette extends Roulette {
  protected createRenderer() {
    return new PinballRenderer(_pendingContainer!);
  }
}

export function usePinball(containerRef: React.RefObject<HTMLDivElement | null>) {
  const rouletteRef = useRef<PinballRoulette | null>(null);
  const [status, setStatus] = useState<GameStatus>('idle');
  const [winner, setWinner] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // super() → createRenderer() 호출 전에 container 세팅
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
      setStatus('finished');
    });

    return () => {
      clearInterval(checkReady);
      container.querySelector('canvas')?.remove();
      rouletteRef.current = null;
      setIsReady(false);
    };
  }, []);

  const start = (names: string[]) => {
    const roulette = rouletteRef.current;
    if (!roulette || !roulette.isReady) return;
    roulette.setMarbles(names);
    roulette.start();
    setStatus('running');
  };

  const reset = () => {
    rouletteRef.current?.reset();
    setStatus('idle');
    setWinner(null);
  };

  const setMap = (index: number) => rouletteRef.current?.setMap(index);
  const setWinningRank = (rank: number) => rouletteRef.current?.setWinningRank(rank);
  const setSpeed = (speed: number) => rouletteRef.current?.setSpeed(speed);
  const getMaps = () => rouletteRef.current?.getMaps() ?? [];
  const setSkills = (value: boolean) => { options.useSkills = value; };

  return { status, winner, start, reset, isReady, setMap, setWinningRank, setSpeed, getMaps, setSkills };
}