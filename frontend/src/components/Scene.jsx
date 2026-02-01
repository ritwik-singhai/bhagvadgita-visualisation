import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import VersePoints from './VersePoints';
import ClusterLabels from './ClusterLabels';
import CameraController from './CameraController';
import useStore from '../store';

/**
 * 3D Scene - Semantic Visualization Canvas
 * Light beige theme with soft colors
 */

export default function Scene({ onVerseClick }) {
  const verses = useStore(state => state.verses);
  const clusters = useStore(state => state.clusters);
  const showClusterLabels = useStore(state => state.showClusterLabels);

  return (
    <Canvas
      style={{ background: 'linear-gradient(to bottom, #faf8f5 0%, #f5f2ed 100%)' }}
      gl={{
        antialias: true,
        alpha: true,
      }}
      dpr={[1, 2]}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 18]} fov={55} />
      <CameraController />

      {/* Soft lighting */}
      <ambientLight intensity={0.8} color="#fff8e7" />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#f5e6d3" />
      <pointLight position={[0, 15, 0]} intensity={0.3} color="#ffffff" />

      {/* Verse Points */}
      <VersePoints verses={verses} onVerseClick={onVerseClick} />

      {/* Cluster Labels */}
      {showClusterLabels && <ClusterLabels clusters={clusters} />}

      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={35}
        dampingFactor={0.05}
        enableDamping={true}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
      />
    </Canvas>
  );
}
