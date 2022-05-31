//@ts-ignore
import createMedianFilter from "moving-median";

type BufferEntry<T> = { state: T; events: string[]; updatedAt: number };

export class InterpolationBuffer<T> {
  private clientStartTime: number | undefined;
  private offsetMedian = createMedianFilter(100);
  private buffer: BufferEntry<T>[] = [];

  constructor(
    private restingState: T,
    private tickRate: number,
    private interpolate: (from: T, to: T, pctElapsed: number) => T,
    private onEvent: (event: string) => void
  ) {}

  public enqueue(state: T, events: string[], updatedAt: number) {
    const now = Date.now();
    if (this.buffer.length === 0 && this.clientStartTime === undefined) {
      this.clientStartTime = now;
    }
    const offset = this.offsetMedian(now - updatedAt);
    const roundedOffset = Math.ceil(offset / (this.tickRate / 2)) * (this.tickRate / 2);
    this.buffer.push({ state, events, updatedAt: updatedAt + roundedOffset + this.tickRate });
  }

  public getInterpolatedState(now: number): T {
    if (this.buffer.length === 0) {
      this.clientStartTime = undefined;
      return this.restingState;
    }

    if (this.buffer[this.buffer.length - 1].updatedAt <= now) {
      this.restingState = this.buffer[this.buffer.length - 1].state;
      this.clientStartTime = this.buffer[this.buffer.length - 1].updatedAt;
      this.sendEvents(0, this.buffer.length);
      this.buffer = [];
      return this.restingState;
    }

    for (let i = this.buffer.length - 1; i >= 0; i--) {
      if (this.buffer[i].updatedAt <= now) {
        this.clientStartTime = undefined;
        this.sendEvents(0, i + 2);
        this.buffer.splice(0, i);
        return this.interp(this.buffer[0], this.buffer[1], now);
      }
    }

    this.sendEvents(0, 1);
    return this.interp({ state: this.restingState, updatedAt: this.clientStartTime ?? now }, this.buffer[0], now);
  }

  private interp(from: Omit<BufferEntry<T>, "events">, to: BufferEntry<T>, now: number): T {
    const pctElapsed = (now - from.updatedAt) / (to.updatedAt - from.updatedAt);
    return this.interpolate(from.state, to.state, pctElapsed);
  }

  private sendEvents(startIdx: number, endIndex: number) {
    for (let i = startIdx; i < endIndex; i++) {
      this.buffer[i].events.forEach(this.onEvent);
      this.buffer[i].events = [];
    }
  }
}
