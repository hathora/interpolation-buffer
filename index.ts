//@ts-ignore
import createMedianFilter from "moving-median";

type BufferEntry<T> = { state: T; updatedAt: number };

export class InterpolationBuffer<T> {
  private clientStartTime: number | undefined;
  private offsetMedian = createMedianFilter(100);
  private buffer: BufferEntry<T>[] = [];

  constructor(
    private restingState: T,
    private tickRate: number,
    private interpolate: (from: T, to: T, pctElapsed: number) => T
  ) {}

  public enqueue(state: T, updatedAt: number) {
    const offset = this.offsetMedian(Date.now() - updatedAt);
    this.buffer.push({ state, updatedAt: updatedAt + offset + this.tickRate });
  }

  public getInterpolatedState(now: number): T {
    if (this.buffer.length === 0) {
      return this.restingState;
    }

    if (this.buffer[this.buffer.length - 1].updatedAt <= now) {
      this.clientStartTime = undefined;
      this.restingState = this.buffer[this.buffer.length - 1].state;
      this.buffer = [];
      return this.restingState;
    }

    for (let i = this.buffer.length - 1; i >= 0; i--) {
      if (this.buffer[i].updatedAt <= now) {
        this.clientStartTime = undefined;
        this.buffer.splice(0, i);
        return this.interp(this.buffer[0], this.buffer[1], now);
      }
    }

    if (this.clientStartTime === undefined) {
      this.clientStartTime = now;
    }
    return this.interp({ state: this.restingState, updatedAt: this.clientStartTime }, this.buffer[0], now);
  }

  private interp(from: BufferEntry<T>, to: BufferEntry<T>, now: number): T {
    const pctElapsed = (now - from.updatedAt) / (to.updatedAt - from.updatedAt);
    return this.interpolate(from.state, to.state, pctElapsed);
  }
}
