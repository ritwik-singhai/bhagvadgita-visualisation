import { useMemo } from 'react';

export default function ConceptMap({ clusters, clusterGraph = [] }) {
  const layout = useMemo(() => {
    const radius = 80;
    const centerX = 120;
    const centerY = 120;
    const positions = new Map();

    clusters.forEach((cluster, index) => {
      const angle = (index / clusters.length) * Math.PI * 2;
      positions.set(cluster.id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });

    return positions;
  }, [clusters]);

  if (!clusters.length) return null;

  return (
    <div className="concept-map">
      <div className="concept-map-title">Concept Map</div>
      <svg width="240" height="240">
        {clusterGraph.map((edge, idx) => {
          const source = layout.get(edge.source);
          const target = layout.get(edge.target);
          if (!source || !target) return null;
          return (
            <line
              key={`edge-${idx}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="rgba(139, 115, 85, 0.35)"
              strokeWidth={1 + edge.weight * 0.8}
            />
          );
        })}
        {clusters.map((cluster) => {
          const position = layout.get(cluster.id);
          return (
            <g key={cluster.id}>
              <circle
                cx={position.x}
                cy={position.y}
                r={6}
                fill="rgba(139, 115, 85, 0.9)"
              />
            </g>
          );
        })}
      </svg>
      <div className="concept-map-legend">
        Lines show semantic proximity between clusters.
      </div>
    </div>
  );
}
