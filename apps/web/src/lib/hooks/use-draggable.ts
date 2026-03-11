import { useState, useCallback, useEffect, RefObject } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  initialPosition?: Position;
  storageKey?: string;
  bounds?: 'window' | 'parent';
}

/**
 * 拖拽 Hook
 * @param ref 拖拽元素的 ref
 * @param options 配置选项
 */
export function useDraggable(
  ref: RefObject<HTMLElement>,
  options: UseDraggableOptions = {}
) {
  const { initialPosition = { x: 0, y: 0 }, storageKey, bounds = 'window' } = options;

  // 从 localStorage 加载位置
  const loadPosition = (): Position => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return initialPosition;
        }
      }
    }
    return initialPosition;
  };

  const [position, setPosition] = useState<Position>(loadPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });

  // 保存位置到 localStorage
  const savePosition = useCallback((pos: Position) => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(pos));
    }
  }, [storageKey]);

  // 开始拖拽
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  }, [position, ref]);

  // 拖拽中
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;

      let newX = e.clientX - dragStart.x;
      let newY = e.clientY - dragStart.y;

      // 边界限制
      if (bounds === 'window') {
        const rect = ref.current.getBoundingClientRect();
        newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
        newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
      }

      const newPosition = { x: newX, y: newY };
      setPosition(newPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      savePosition(position);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, position, bounds, ref, savePosition]);

  return {
    position,
    isDragging,
    handleMouseDown,
    setPosition,
  };
}
