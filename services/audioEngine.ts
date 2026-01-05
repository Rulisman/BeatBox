
import { InstrumentType } from '../types';

class AudioEngine {
  private context: AudioContext;
  private mainGain: GainNode;
  private recordingBuffers: Float32Array[] = [];
  private isRecording: boolean = false;
  private processorNode: ScriptProcessorNode | null = null;

  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.mainGain = this.context.createGain();
    this.mainGain.connect(this.context.destination);
    this.mainGain.gain.value = 0.5;
  }

  public resume() {
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  private createKick(time: number) {
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    osc.connect(gain);
    gain.connect(this.mainGain);
    osc.start(time);
    osc.stop(time + 0.5);
  }

  private createSnare(time: number) {
    const noise = this.context.createBufferSource();
    const bufferSize = this.context.sampleRate * 0.1;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.mainGain);
    noise.start(time);
  }

  private createHiHat(time: number) {
    const osc = this.context.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(10000, time);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    osc.connect(gain);
    gain.connect(this.mainGain);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  private createSynth(time: number, pitchOffset: number = 0) {
    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    const freq = 110 * Math.pow(2, pitchOffset / 12);
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, time + 0.2);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.4);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.mainGain);
    osc.start(time);
    osc.stop(time + 0.4);
  }

  public playInstrument(type: InstrumentType, time: number, pitchOffset: number = 0) {
    switch (type) {
      case InstrumentType.KICK: this.createKick(time); break;
      case InstrumentType.SNARE: this.createSnare(time); break;
      case InstrumentType.HIHAT: this.createHiHat(time); break;
      case InstrumentType.SYNTH: this.createSynth(time, pitchOffset); break;
    }
  }

  public getContext() {
    return this.context;
  }

  public getAnalyser() {
    const analyser = this.context.createAnalyser();
    this.mainGain.connect(analyser);
    return analyser;
  }

  // --- Lógica de Grabación WAV ---

  public startRecording() {
    this.recordingBuffers = [];
    this.isRecording = true;
    
    // Crear un nodo procesador para capturar los samples en tiempo real
    this.processorNode = this.context.createScriptProcessor(4096, 1, 1);
    this.mainGain.connect(this.processorNode);
    this.processorNode.connect(this.context.destination);

    this.processorNode.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const inputData = e.inputBuffer.getChannelData(0);
      // Guardamos una copia de los datos
      this.recordingBuffers.push(new Float32Array(inputData));
    };
  }

  public async stopRecording(): Promise<Blob> {
    this.isRecording = false;
    
    if (this.processorNode) {
      this.mainGain.disconnect(this.processorNode);
      this.processorNode.disconnect(this.context.destination);
      this.processorNode = null;
    }

    // Unir todos los buffers capturados
    const totalLength = this.recordingBuffers.reduce((acc, buf) => acc + buf.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const buf of this.recordingBuffers) {
      result.set(buf, offset);
      offset += buf.length;
    }

    // Codificar a WAV
    return this.encodeWAV(result, this.context.sampleRate);
  }

  private encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    /* RIFF identifier */
    writeString(0, 'RIFF');
    /* file length */
    view.setUint32(4, 32 + samples.length * 2, true);
    /* RIFF type */
    writeString(8, 'WAVE');
    /* format chunk identifier */
    writeString(12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 2, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    // Escribir los samples (convertir de Float32 a Int16)
    let index = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(index, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      index += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  }
}

export const audioEngine = new AudioEngine();
