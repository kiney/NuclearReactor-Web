export const GRID_SIZE = 525;
export const GRID_CELLS = GRID_SIZE * GRID_SIZE;
export const MOVEMENT_LIMIT = 524;
export const CORE_MIN = 64;
export const CORE_MAX = 460;
export const CORE_SIZE = 397;
export const MAX_NEUTRONS = 100_000;
export const NEW_NEUTRON_SPEED = 5;
export const INITIAL_NEUTRON_COUNT = 2;
export const FISSION_CHILD_COUNT = 3;
export const MAX_BURNOUT = 10;
export const RANDOM_CENTER = 0.5;
export const SCATTER_COMPONENT_SCALE = 4;
export const SCATTER_COMPONENT_OFFSET = 2;
export const PERCENT_SCALE = 100;
export const NORMAL_PERIOD_MS = 20;
export const SLOW_PERIOD_MS = 100;
export const ROD_INSERTED_END = 461;
export const ROD_WITHDRAWN_END = 64;
export const ROD_STEP = 5;
export const ROD_WIDTH = 4;
export const SOURCE_MIN_X = 260;
export const SOURCE_MAX_X = 267;
export const SOURCE_MIN_Y = 438;
export const SOURCE_MAX_Y = 445;
export const SOURCE_X = 263;
export const SOURCE_Y = 441;
export const HISTOGRAM_BAND_MIN = 213;
export const HISTOGRAM_BAND_MAX = 311;
export const HISTOGRAM_WINDOW_STEPS = 100;
export const HISTOGRAM_MINIMUM_NORMALIZER = 1;

export const LCG_MULTIPLIER = 0x08088405;
export const UINT32_RANGE = 0x1_0000_0000;
export const MODERATION_PROBABILITY = 0.05;
export const MODERATOR_ABSORPTION_PROBABILITY = 0.003;
export const FISSION_PROBABILITY_FACTOR = 0.002;
export const FUEL_ABSORPTION_PROBABILITY_FACTOR = 0.0005;
export const FAST_ABSORBER_ABSORPTION_PROBABILITY = 0.2;
export const SOURCE_EMISSION_PROBABILITY = 0.5;
export const BACKGROUND_EMISSION_PROBABILITY = 0.01;
export const POWER_DECAY_FACTOR = 0.9;
export const POWER_ACTIVITY_FACTOR = 0.01;
export const DETECTOR_WARNING_PERCENT = 80;
export const DETECTOR_HIGH_SCRAM_PERCENT = 90;
export const DETECTOR_LOW_SCRAM_PERCENT = 3;
export const POWER_SCRAM_THRESHOLD = 120;
export const LATTICE_PERIOD = 32;
export const FIRST_MODERATOR_END = 5;
export const ABSORBER_END = 9;
export const SECOND_MODERATOR_START = 10;
export const SECOND_MODERATOR_END = 15;

export const MATERIAL = {
  EMPTY: 0,
  MODERATOR: 1,
  FUEL: 2,
  ABSORBER: 3,
  SOURCE: 5,
} as const;

export type MaterialCode = (typeof MATERIAL)[keyof typeof MATERIAL];

export const SAFETY_ROD_STARTS = [
  70, 134, 198, 262, 326, 390, 454,
] as const;
export const CONTROL_ROD_STARTS = [102, 166, 230, 294, 358, 422] as const;

export const DETECTOR_RANGES = [100, 1_000, 10_000, 100_000] as const;

export const DEFAULT_ORIGINAL12_CONFIG = {
  profile: "original-1.2-default",
} as const;

export const MODEL_METADATA = {
  id: "original-1.2",
  modelVersion: "1.0.0",
  snapshotSchemaVersion: 1,
  name: "Originalmodell 1.2",
  grid: { width: GRID_SIZE, height: GRID_SIZE },
  runModes: [
    { id: "normal", periodMs: NORMAL_PERIOD_MS },
    { id: "slow", periodMs: SLOW_PERIOD_MS },
  ],
  capabilities: [
    "particles",
    "control-rods",
    "scram",
    "source",
    "reflector",
    "moderator-drain",
    "burnout",
    "detector",
    "histograms",
  ],
  render: {
    cellStyles: [
      { id: MATERIAL.EMPTY, color: [248, 250, 252] },
      { id: MATERIAL.MODERATOR, color: [242, 201, 76] },
      { id: MATERIAL.FUEL, color: [46, 173, 98] },
      { id: MATERIAL.ABSORBER, color: [40, 100, 199] },
      { id: MATERIAL.SOURCE, color: [128, 102, 59] },
    ],
    pointCategories: [
      { id: "fast", color: "#e5484d" },
      { id: "slow", color: "#101828" },
    ],
  },
} as const;
