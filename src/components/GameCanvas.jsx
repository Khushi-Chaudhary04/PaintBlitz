import { useEffect, useRef, useState } from 'react';
import { PLAYER_COLORS } from '../constants';

export const GameCanvas = ({ grid, gridSize, onCellClick }) => {
  const canvasRef = useRef(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const cellSizeRef = useRef(0);

  const draw = (hovered) => {
    const canvas = canvasRef.current;
    if (!canvas || !grid || !grid.length) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width / gridSize;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Debug: log any painted cells
    let paintedCount = 0;
    for (let x = 0; x < gridSize; x++)
      for (let y = 0; y < gridSize; y++)
        if ((grid[x]?.[y] ?? 0) > 0) paintedCount++;
    if (paintedCount > 0) console.log('Canvas drawing', paintedCount, 'painted cells. Grid[0]:', grid[0]);

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const colorIndex = grid[x]?.[y] ?? 0;
        const isHovered = hovered?.x === x && hovered?.y === y;
        const isEmpty = colorIndex === 0;
        const px = x * size;
        const py = y * size;

        if (isEmpty) {
          // Empty cell — dark background
          ctx.fillStyle = '#0f1117';
          ctx.fillRect(px, py, size, size);

          // Hover effect
          if (isHovered) {
            ctx.fillStyle = 'rgba(255,255,255,0.10)';
            ctx.fillRect(px, py, size, size);
          }
        } else {
          // Painted cell — solid player color with glow
          const color = PLAYER_COLORS[colorIndex];
          ctx.fillStyle = color;
          ctx.fillRect(px, py, size, size);

          // Inner glow
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = 15;
          ctx.fillStyle = color;
          ctx.fillRect(px + 2, py + 2, size - 4, size - 4);
          ctx.restore();
        }

        // Grid lines
        ctx.strokeStyle = isEmpty
          ? 'rgba(255,255,255,0.07)'
          : 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, size, size);
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    const size = Math.min(container.clientWidth - 32, 600);
    canvas.width = size;
    canvas.height = size;
    cellSizeRef.current = size / gridSize;
    draw(hoveredCell);
  }, [grid, gridSize]);

  useEffect(() => { draw(hoveredCell); }, [hoveredCell]);

  const getCellFromEvent = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !cellSizeRef.current) return null;
    const rect = canvas.getBoundingClientRect();
    // Correct for CSS scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / cellSizeRef.current);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / cellSizeRef.current);
    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) return { x, y };
    return null;
  };

  return (
    <div className="flex items-center justify-center p-4">
      <canvas
        ref={canvasRef}
        onClick={(e) => { const c = getCellFromEvent(e); if (c) onCellClick(c.x, c.y); }}
        onMouseMove={(e) => setHoveredCell(getCellFromEvent(e))}
        onMouseLeave={() => setHoveredCell(null)}
        className="cursor-crosshair rounded-lg shadow-2xl shadow-purple-500/50 border-2 border-purple-500/50"
        style={{ maxWidth: '600px', width: '100%', height: 'auto' }}
      />
    </div>
  );
};
