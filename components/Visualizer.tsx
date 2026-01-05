
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface VisualizerProps {
  analyser: AnalyserNode | null;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!analyser || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 150;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const x = d3.scaleLinear().domain([0, bufferLength]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 255]).range([height, 0]);

    const line = d3.line<number>()
      .x((d, i) => x(i))
      .y(d => y(d))
      .curve(d3.curveBasis);

    const path = svg.append('path')
      .attr('fill', 'none')
      .attr('stroke', '#a855f7')
      .attr('stroke-width', 2);

    let animationId: number;

    const renderFrame = () => {
      analyser.getByteFrequencyData(dataArray);
      const data = Array.from(dataArray);
      
      path.attr('d', line(data) || '');
      
      animationId = requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => cancelAnimationFrame(animationId);
  }, [analyser]);

  return (
    <div className="w-full flex justify-center bg-black/40 rounded-xl overflow-hidden neon-border p-4 mb-8">
      <svg ref={svgRef} viewBox="0 0 800 150" className="w-full h-32"></svg>
    </div>
  );
};

export default Visualizer;
