import { RouletteRenderer } from './lib/rouletteRenderer';

export class PinballRenderer extends RouletteRenderer {
  private _container: HTMLElement;

  constructor(container: HTMLElement) {
    super();
    this._container = container;
  }

  // ResizeObserver 비활성화
  protected setupResizeObserver(_resizing: (entries?: ResizeObserverEntry[]) => void) {}

  async init() {
    await super.init();

    this._container.appendChild(this._canvas);
    this._canvas.style.cssText = 'width:100%;height:100%;display:block;';

    const setSize = () => {
        const rect = this._container.getBoundingClientRect();
        const w = Math.floor(rect.width);
        const h = Math.floor(rect.height);
        if (w === 0 || h === 0) return;
        this._canvas.width = w;
        this._canvas.height = h;
        this.sizeFactor = 1;
    };

    requestAnimationFrame(() => {
        setSize();
        new ResizeObserver(setSize).observe(this._container);
    });
  }
}