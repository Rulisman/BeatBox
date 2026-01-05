
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Wand2, Volume2, Trash2, FastForward, Music, Circle, Download } from 'lucide-react';
import { InstrumentType, Pattern } from './types';
import { audioEngine } from './services/audioEngine';
import { generatePatternFromAI } from './services/geminiService';
import SequencerGrid from './components/SequencerGrid';
import Visualizer from './components/Visualizer';

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [tempo, setTempo] = useState(128);
  const [currentStep, setCurrentStep] = useState(-1);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('Atmospheric Latin Techno anthemic vibe');
  const [lastRecordingUrl, setLastRecordingUrl] = useState<string | null>(null);
  
  const [steps, setSteps] = useState<{ [key in InstrumentType]: boolean[] }>({
    [InstrumentType.KICK]: new Array(16).fill(false),
    [InstrumentType.SNARE]: new Array(16).fill(false),
    [InstrumentType.HIHAT]: new Array(16).fill(false),
    [InstrumentType.SYNTH]: new Array(16).fill(false),
  });

  const timerRef = useRef<number | null>(null);
  const nextStepTimeRef = useRef(0);
  const stepRef = useRef(0);

  useEffect(() => {
    setAnalyser(audioEngine.getAnalyser());
  }, []);

  const playStep = useCallback((time: number) => {
    Object.keys(steps).forEach((inst) => {
      if (steps[inst as InstrumentType][stepRef.current]) {
        audioEngine.playInstrument(inst as InstrumentType, time);
      }
    });
  }, [steps]);

  const scheduler = useCallback(() => {
    while (nextStepTimeRef.current < audioEngine.getContext().currentTime + 0.1) {
      playStep(nextStepTimeRef.current);
      const secondsPerStep = 60.0 / tempo / 4;
      nextStepTimeRef.current += secondsPerStep;
      setCurrentStep(stepRef.current);
      stepRef.current = (stepRef.current + 1) % 16;
    }
    timerRef.current = window.requestAnimationFrame(scheduler);
  }, [tempo, playStep]);

  const togglePlay = () => {
    audioEngine.resume();
    if (isPlaying) {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      setIsPlaying(false);
      setCurrentStep(-1);
      stepRef.current = 0;
      if (isRecording) handleToggleRecording();
    } else {
      setIsPlaying(true);
      nextStepTimeRef.current = audioEngine.getContext().currentTime;
      scheduler();
    }
  };

  const handleToggleRecording = async () => {
    if (!isRecording) {
      audioEngine.startRecording();
      setIsRecording(true);
      setLastRecordingUrl(null);
    } else {
      setIsRecording(false);
      const blob = await audioEngine.stopRecording();
      const url = URL.createObjectURL(blob);
      setLastRecordingUrl(url);
    }
  };

  const downloadRecording = () => {
    if (!lastRecordingUrl) return;
    const a = document.createElement('a');
    a.href = lastRecordingUrl;
    // Ahora guardamos como .wav para máxima compatibilidad
    a.download = `shakira-coldplay-beat-${Date.now()}.wav`;
    a.click();
  };

  const handleToggleStep = (inst: InstrumentType, idx: number) => {
    setSteps(prev => ({
      ...prev,
      [inst]: prev[inst].map((v, i) => i === idx ? !v : v)
    }));
  };

  const handleClear = () => {
    setSteps({
      [InstrumentType.KICK]: new Array(16).fill(false),
      [InstrumentType.SNARE]: new Array(16).fill(false),
      [InstrumentType.HIHAT]: new Array(16).fill(false),
      [InstrumentType.SYNTH]: new Array(16).fill(false),
    });
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      const pattern = await generatePatternFromAI(aiPrompt);
      setSteps(pattern.steps);
      setTempo(pattern.tempo);
    } catch (error) {
      console.error("AI Generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center max-w-5xl mx-auto text-white">
      {/* Header */}
      <header className="w-full text-center mb-10">
        <h1 className="text-4xl md:text-6xl font-orbitron font-bold tracking-tighter bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-500 bg-clip-text text-transparent drop-shadow-lg">
          BEATBOX X25
        </h1>
        <p className="text-gray-400 mt-2 font-light italic">
          Inspired by the Shakira & Coldplay Stage Experience
        </p>
      </header>

      {/* Top Visualizer */}
      <Visualizer analyser={analyser} />

      {/* Main Controls Section */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Playback & Record Controls */}
        <div className="bg-white/5 p-6 rounded-2xl neon-border flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <button 
                onClick={togglePlay}
                className={`p-5 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg ${isPlaying ? 'bg-red-500/80' : 'bg-green-500/80'}`}
              >
                {isPlaying ? <Square className="fill-white size-5" /> : <Play className="fill-white size-5" />}
              </button>
              
              <button 
                onClick={handleToggleRecording}
                disabled={!isPlaying && !isRecording}
                className={`p-5 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-30 disabled:cursor-not-allowed ${isRecording ? 'bg-red-600 animate-pulse ring-4 ring-red-500/30' : 'bg-gray-700 hover:bg-gray-600'}`}
                title={isRecording ? "Stop Recording" : "Start Recording"}
              >
                <Circle className={`size-5 ${isRecording ? 'fill-white text-white' : 'text-red-500 fill-red-500'}`} />
              </button>
            </div>

            {lastRecordingUrl && (
              <button 
                onClick={downloadRecording}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all animate-bounce shadow-[0_0_15px_rgba(99,102,241,0.5)]"
              >
                <Download className="size-4" />
                <span>SAVE WAV</span>
              </button>
            )}
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] text-purple-300 font-bold uppercase tracking-widest">Master Tempo</span>
              <span className="text-2xl font-orbitron text-white">{tempo} <span className="text-xs text-gray-500">BPM</span></span>
            </div>
            <input 
              type="range" 
              min="60" 
              max="200" 
              value={tempo} 
              onChange={(e) => setTempo(parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
        </div>

        {/* AI Assistant */}
        <div className="lg:col-span-2 bg-white/5 p-6 rounded-2xl neon-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Wand2 className="text-purple-400 size-5" />
              <h2 className="text-sm font-orbitron font-bold uppercase tracking-widest text-purple-400">Gemini Producer AI</h2>
            </div>
            {isGenerating && <span className="text-[10px] text-purple-400 animate-pulse font-bold">WRITING RHYTHM...</span>}
          </div>
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <input 
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Dreamy pop beats with aggressive synth..."
              className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white"
            />
            <button 
              onClick={handleAIGenerate}
              disabled={isGenerating}
              className={`flex items-center justify-center space-x-2 px-8 py-3 rounded-lg font-bold text-sm bg-purple-600 hover:bg-purple-700 transition-all shadow-lg active:scale-95 ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isGenerating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
              ) : (
                <>
                  <Music className="size-4" />
                  <span>GENERATE</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sequencer Grid */}
      <div className="w-full bg-white/5 p-4 md:p-8 rounded-3xl neon-border relative group shadow-2xl backdrop-blur-sm">
        <div className="absolute top-4 right-6 flex items-center space-x-4">
          {isRecording && (
            <div className="flex items-center space-x-2 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
              <div className="size-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">RECORDING LIVE</span>
            </div>
          )}
          
          {/* BOTÓN CLEAR MEJORADO */}
          <button 
            onClick={handleClear}
            className="flex items-center space-x-2 bg-white/10 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 px-3 py-1.5 rounded-lg transition-all duration-200 group/clear shadow-lg"
            title="Clear Pattern"
          >
            <span className="text-[10px] font-orbitron font-bold text-gray-400 group-hover/clear:text-red-500 transition-colors uppercase tracking-widest">Clear</span>
            <Trash2 className="size-4 text-gray-400 group-hover/clear:text-red-500 transition-colors group-hover/clear:rotate-6" />
          </button>
        </div>
        
        <div className="mt-8">
          <SequencerGrid 
            steps={steps} 
            currentStep={currentStep} 
            onToggle={handleToggleStep} 
          />
        </div>
      </div>

      {/* Quick Pads */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-8">
        {(Object.keys(InstrumentType) as InstrumentType[]).map((inst) => (
          <button
            key={inst}
            onMouseDown={() => {
              audioEngine.resume();
              audioEngine.playInstrument(inst, audioEngine.getContext().currentTime);
            }}
            className="h-24 bg-gray-900/50 border border-gray-800 rounded-2xl hover:bg-gray-800/80 active:bg-purple-900/50 active:border-purple-400/50 transition-all flex flex-col items-center justify-center group shadow-xl"
          >
            <span className="text-[10px] text-gray-500 group-hover:text-purple-400 transition-colors mb-2 uppercase font-orbitron tracking-widest">{inst}</span>
            <div className="w-8 h-1 rounded-full bg-gray-700 group-active:bg-purple-400 group-active:shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
          </button>
        ))}
      </div>

      <footer className="mt-16 mb-8 text-gray-600 text-[10px] font-orbitron flex flex-col items-center uppercase tracking-widest">
        <div className="flex space-x-8 mb-4 opacity-30">
          <Volume2 className="size-4" />
          <FastForward className="size-4" />
          <Music className="size-4" />
        </div>
        <span className="text-center opacity-50">&copy; 2025 EL RITMO DE COLOMBIA X COLDPLAY WORLD TOUR<br/>OUTPUT: HIGH-FIDELITY 16-BIT WAV</span>
      </footer>
    </div>
  );
};

export default App;
