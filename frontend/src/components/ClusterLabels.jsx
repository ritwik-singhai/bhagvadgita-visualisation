import { Html } from '@react-three/drei';
import useStore from '../store';

export default function ClusterLabels({ clusters }) {
  const { showClusterLabels } = useStore();

  if (!showClusterLabels) return null;

  return (
    <>
      {clusters.map((cluster) => (
        <Html
          key={cluster.id}
          position={[cluster.centroid.x, cluster.centroid.y + 0.5, cluster.centroid.z]}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(250, 249, 246, 0.85)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'Georgia, serif',
              color: '#5D4E37',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid rgba(139, 115, 85, 0.2)',
            }}
          >
            {cluster.theme}
            <span style={{ 
              marginLeft: '6px', 
              opacity: 0.6, 
              fontSize: '10px' 
            }}>
              ({cluster.verse_count})
            </span>
          </div>
        </Html>
      ))}
    </>
  );
}
