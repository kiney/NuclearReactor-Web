import {
  MAX_NEUTRONS,
  NEW_NEUTRON_SPEED,
  RANDOM_CENTER,
} from "./constants";
import type { RandomSource } from "./rng";

export class NeutronPool {
  readonly x = new Float32Array(MAX_NEUTRONS);
  readonly y = new Float32Array(MAX_NEUTRONS);
  readonly dx = new Float32Array(MAX_NEUTRONS);
  readonly dy = new Float32Array(MAX_NEUTRONS);
  readonly fast = new Uint8Array(MAX_NEUTRONS);
  readonly active = new Uint8Array(MAX_NEUTRONS);
  count = 0;

  clear(): void {
    this.count = 0;
  }

  add(
    x: number,
    y: number,
    dx: number,
    dy: number,
    fast: boolean,
  ): boolean {
    if (this.count >= MAX_NEUTRONS) return false;
    const index = this.count;
    this.x[index] = x;
    this.y[index] = y;
    this.dx[index] = dx;
    this.dy[index] = dy;
    this.fast[index] = fast ? 1 : 0;
    this.active[index] = 1;
    this.count += 1;
    return true;
  }

  addRandomDirection(
    x: number,
    y: number,
    fast: boolean,
    rng: RandomSource,
  ): boolean {
    if (this.count >= MAX_NEUTRONS) return false;
    let rx = rng.next() - RANDOM_CENTER;
    let ry = rng.next() - RANDOM_CENTER;
    const length = Math.hypot(rx, ry);
    if (length === 0) {
      rx = 1;
      ry = 0;
    }
    const scale = NEW_NEUTRON_SPEED / (length || 1);
    return this.add(x, y, rx * scale, ry * scale, fast);
  }

  compact(): void {
    let target = 0;
    for (let source = 0; source < this.count; source += 1) {
      if (this.active[source] === 0) continue;
      if (target !== source) {
        this.x[target] = this.x[source];
        this.y[target] = this.y[source];
        this.dx[target] = this.dx[source];
        this.dy[target] = this.dy[source];
        this.fast[target] = this.fast[source];
        this.active[target] = 1;
      }
      target += 1;
    }
    this.count = target;
  }
}
