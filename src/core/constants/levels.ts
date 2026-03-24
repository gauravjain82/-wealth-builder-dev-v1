export enum LevelCode {
  TA = 'TA',
  A = 'A',
  MD = 'MD',
  SMD = 'SMD',
}

export const LEVEL_OPTIONS: Array<{ value: LevelCode; label: string }> = [
  { value: LevelCode.TA, label: 'TA' },
  { value: LevelCode.A, label: 'A' },
  { value: LevelCode.MD, label: 'MD' },
  { value: LevelCode.SMD, label: 'SMD' },
];
