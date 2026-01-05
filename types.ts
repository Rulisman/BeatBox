
export enum InstrumentType {
  KICK = 'KICK',
  SNARE = 'SNARE',
  HIHAT = 'HIHAT',
  SYNTH = 'SYNTH'
}

export interface Pattern {
  name: string;
  tempo: number;
  steps: {
    [key in InstrumentType]: boolean[];
  };
}

export interface AudioSettings {
  volume: number;
  pitch: number;
  reverb: number;
}
