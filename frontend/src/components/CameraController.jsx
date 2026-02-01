import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useStore from '../store';

export default function CameraController() {
  const { camera } = useThree();
  const { cameraTarget, setCameraTarget } = useStore();
  const isAnimating = useRef(false);
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const currentLookAt = useRef(new THREE.Vector3());

  useEffect(() => {
    if (cameraTarget) {
      isAnimating.current = true;
      
      // Calculate camera position (offset from target)
      const offset = new THREE.Vector3(3, 2, 5);
      targetPosition.current.set(
        cameraTarget.x + offset.x,
        cameraTarget.y + offset.y,
        cameraTarget.z + offset.z
      );
      targetLookAt.current.set(cameraTarget.x, cameraTarget.y, cameraTarget.z);
    }
  }, [cameraTarget]);

  useFrame(() => {
    if (isAnimating.current && cameraTarget) {
      // Smooth camera movement
      camera.position.lerp(targetPosition.current, 0.02);
      currentLookAt.current.lerp(targetLookAt.current, 0.05);
      camera.lookAt(currentLookAt.current);
      
      // Check if we're close enough to stop
      const distance = camera.position.distanceTo(targetPosition.current);
      if (distance < 0.1) {
        isAnimating.current = false;
        setCameraTarget(null);
      }
    }
  });

  return null;
}
