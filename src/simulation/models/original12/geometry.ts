import {
  CONTROL_ROD_STARTS,
  ABSORBER_END,
  CORE_MAX,
  CORE_MIN,
  FIRST_MODERATOR_END,
  GRID_CELLS,
  GRID_SIZE,
  LATTICE_PERIOD,
  MATERIAL,
  ROD_INSERTED_END,
  ROD_WIDTH,
  SAFETY_ROD_STARTS,
  SECOND_MODERATOR_END,
  SECOND_MODERATOR_START,
  SOURCE_MAX_X,
  SOURCE_MAX_Y,
  SOURCE_MIN_X,
  SOURCE_MIN_Y,
} from "./constants";

export interface GeometryState {
  controlRodEnd: number;
  safetyRodsWithdrawn: boolean;
  replacementMaterial: typeof MATERIAL.MODERATOR | typeof MATERIAL.EMPTY;
  reflectorEnabled: boolean;
  sourceEnabled: boolean;
}

const indexOf = (x: number, y: number): number => y * GRID_SIZE + x;

export function createInitialMaterial(): Uint8Array {
  const material = new Uint8Array(GRID_CELLS);
  for (let y = CORE_MIN; y <= CORE_MAX; y += 1) {
    for (let x = CORE_MIN; x <= CORE_MAX; x += 1) {
      const period = x % LATTICE_PERIOD;
      material[indexOf(x, y)] =
        period <= FIRST_MODERATOR_END ||
        (period >= SECOND_MODERATOR_START &&
          period <= SECOND_MODERATOR_END)
          ? MATERIAL.MODERATOR
          : period <= ABSORBER_END
            ? MATERIAL.ABSORBER
            : MATERIAL.FUEL;
    }
  }
  return material;
}

function fillRodStrips(
  material: Uint8Array,
  starts: readonly number[],
  absorberUntil: number,
  replacement: number,
): void {
  for (const startX of starts) {
    for (let x = startX; x < startX + ROD_WIDTH; x += 1) {
      for (let y = CORE_MIN; y <= CORE_MAX; y += 1) {
        material[indexOf(x, y)] =
          y < absorberUntil ? MATERIAL.ABSORBER : replacement;
      }
    }
  }
}

export function rebuildMaterial(
  material: Uint8Array,
  state: GeometryState,
): void {
  const initial = createInitialMaterial();
  material.set(initial);

  if (state.replacementMaterial === MATERIAL.EMPTY) {
    for (let i = 0; i < material.length; i += 1) {
      if (material[i] === MATERIAL.MODERATOR) material[i] = MATERIAL.EMPTY;
    }
  }

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (x < CORE_MIN || x > CORE_MAX || y < CORE_MIN || y > CORE_MAX) {
        material[indexOf(x, y)] = state.reflectorEnabled
          ? MATERIAL.MODERATOR
          : MATERIAL.EMPTY;
      }
    }
  }

  fillRodStrips(
    material,
    SAFETY_ROD_STARTS,
    state.safetyRodsWithdrawn ? CORE_MIN : ROD_INSERTED_END,
    state.replacementMaterial,
  );
  fillRodStrips(
    material,
    CONTROL_ROD_STARTS,
    state.controlRodEnd,
    state.replacementMaterial,
  );

  if (state.sourceEnabled) {
    for (let y = SOURCE_MIN_Y; y <= SOURCE_MAX_Y; y += 1) {
      for (let x = SOURCE_MIN_X; x <= SOURCE_MAX_X; x += 1) {
        material[indexOf(x, y)] = MATERIAL.SOURCE;
      }
    }
  }
}

export function countCoreMaterials(material: Uint8Array): {
  moderator: number;
  fuel: number;
  absorber: number;
} {
  const result = { moderator: 0, fuel: 0, absorber: 0 };
  for (let y = CORE_MIN; y <= CORE_MAX; y += 1) {
    for (let x = CORE_MIN; x <= CORE_MAX; x += 1) {
      const value = material[indexOf(x, y)];
      if (value === MATERIAL.MODERATOR) result.moderator += 1;
      if (value === MATERIAL.FUEL) result.fuel += 1;
      if (value === MATERIAL.ABSORBER) result.absorber += 1;
    }
  }
  return result;
}
