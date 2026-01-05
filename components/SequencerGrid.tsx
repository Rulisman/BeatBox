
import React from 'react';
import { InstrumentType } from '../types';

interface SequencerGridProps {
  steps: { [key in InstrumentType]: boolean[] };
  currentStep: number;
  onToggle: (instrument: InstrumentType, stepIndex: number) => void;
}

const SequencerGrid: React.FC<SequencerGridProps> = ({ steps, currentStep, onToggle }) => {
  const instruments = Object.keys(steps) as InstrumentType[];

  return (
    <div className="grid grid-cols-1 gap-4 select-none">
      {instruments.map((inst) => (
        <div key={inst} className="flex items-center space-x-4">
          <div className="w-20 text-xs font-orbitron text-purple-400 tracking-widest">{inst}</div>
          <div className="flex-1 grid grid-cols-16 gap-1 md:gap-2">
            {steps[inst].map((isActive, i) => (
              <button
                key={i}
                onClick={() => onToggle(inst, i)}
                className={`
                  h-8 md:h-12 rounded-md transition-all duration-150 transform active:scale-95
                  ${isActive ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]' : 'bg-gray-800 hover:bg-gray-700'}
                  ${currentStep === i ? 'ring-2 ring-white scale-105 z-10' : ''}
                `}
              />
            ))}
          </div>
        </div>
      ))}
      <style>{`
        .grid-cols-16 {
          grid-template-columns: repeat(16, minmax(0, 1fr));
        }
      `}</style>
    </div>
  );
};

export default SequencerGrid;
