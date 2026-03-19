'use client';

import { Card } from '@/components/ui/card';
import type { SkillRadarData } from '@/lib/profile/profile-types';

type SkillRadarProps = {
  skills: SkillRadarData[];
};

export function SkillRadar({ skills }: SkillRadarProps) {
  const maxValue = Math.max(...skills.map(s => s.maxValue));
  const centerX = 200;
  const centerY = 200;
  const radius = 150;
  const levels = 5;

  const angleStep = (2 * Math.PI) / skills.length;

  const getPoint = (index: number, value: number, max: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / max) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle)
    };
  };

  const getLabelPoint = (index: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = radius + 40;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle)
    };
  };

  const dataPoints = skills.map((skill, index) =>
    getPoint(index, skill.value, skill.maxValue)
  );

  const dataPath = dataPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ') + ' Z';

  const gridLevels = Array.from({ length: levels }, (_, i) => {
    const levelRadius = ((i + 1) / levels) * radius;
    const points = skills.map((_, index) => {
      const angle = angleStep * index - Math.PI / 2;
      return {
        x: centerX + levelRadius * Math.cos(angle),
        y: centerY + levelRadius * Math.sin(angle)
      };
    });
    return points;
  });

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        技能雷达图
      </h3>
      <div className="flex justify-center">
        <svg width="400" height="400" className="overflow-visible">
          {/* 背景网格 */}
          {gridLevels.map((points, levelIndex) => (
            <polygon
              key={levelIndex}
              points={points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-gray-300 dark:text-gray-600"
              opacity={0.3}
            />
          ))}

          {/* 轴线 */}
          {skills.map((_, index) => {
            const endPoint = getPoint(index, maxValue, maxValue);
            return (
              <line
                key={index}
                x1={centerX}
                y1={centerY}
                x2={endPoint.x}
                y2={endPoint.y}
                stroke="currentColor"
                strokeWidth="1"
                className="text-gray-300 dark:text-gray-600"
                opacity={0.3}
              />
            );
          })}

          {/* 数据区域 */}
          <path
            d={dataPath}
            fill="currentColor"
            className="text-blue-500 dark:text-blue-400"
            opacity={0.3}
          />
          <path
            d={dataPath}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-blue-600 dark:text-blue-400"
          />

          {/* 数据点 */}
          {dataPoints.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="5"
              fill="currentColor"
              className="text-blue-600 dark:text-blue-400"
            />
          ))}

          {/* 标签 */}
          {skills.map((skill, index) => {
            const labelPoint = getLabelPoint(index);
            const angle = angleStep * index - Math.PI / 2;
            let textAnchor: 'start' | 'middle' | 'end' = 'middle';
            if (Math.cos(angle) > 0.1) textAnchor = 'start';
            else if (Math.cos(angle) < -0.1) textAnchor = 'end';

            return (
              <g key={index}>
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor={textAnchor}
                  className="text-sm font-medium fill-gray-700 dark:fill-gray-300"
                >
                  {skill.skill}
                </text>
                <text
                  x={labelPoint.x}
                  y={labelPoint.y + 16}
                  textAnchor={textAnchor}
                  className="text-xs fill-gray-500 dark:fill-gray-400"
                >
                  {skill.value}/{skill.maxValue}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 图例 */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        {skills.map((skill, index) => {
          const percentage = Math.round((skill.value / skill.maxValue) * 100);
          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{skill.skill}</span>
                <span className="text-gray-600 dark:text-gray-400">{percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
