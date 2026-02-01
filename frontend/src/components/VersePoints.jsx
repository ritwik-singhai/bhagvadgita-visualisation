import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useStore from '../store';

// Soft, muted cluster colors for light theme
const CLUSTER_COLORS = [
  '#d4a574', // Warm sand
  '#9cb4a3', // Sage green
  '#c49a82', // Terracotta
  '#8fa9b8', // Dusty blue
  '#b8a4c4', // Lavender
  '#a3b18a', // Olive
  '#d4a5a5', // Dusty rose
  '#9bb5c4', // Sky blue
  '#c4b896', // Wheat
  '#b09080', // Taupe
  '#8fbc8f', // Sea green
  '#d4a373', // Camel
  '#a0c4b0', // Mint
  '#c9b896', // Sand
  '#9faec4', // Steel blue
  '#b5a080', // Khaki
  '#c4a0a0', // Rose
  '#8fb5a0', // Teal
  '#d4b896', // Buff
  '#a0a0c4', // Periwinkle
  '#c4b0a0', // Tan
];

export default function VersePoints({ verses, onVerseClick }) {
  const pointsRef = useRef();
  const { camera, raycaster, pointer } = useThree();
  const {
    selectedVerse, setSelectedVerse,
    hoveredVerse, setHoveredVerse,
    searchResults
  } = useStore();

  // Create geometry
  const { positions, colors, sizes, originalColors, originalSizes } = useMemo(() => {
    if (!verses || verses.length === 0) {
      return {
        positions: new Float32Array(0),
        colors: new Float32Array(0),
        sizes: new Float32Array(0),
        originalColors: new Float32Array(0),
        originalSizes: new Float32Array(0),
      };
    }

    const positions = new Float32Array(verses.length * 3);
    const colors = new Float32Array(verses.length * 3);
    const originalColors = new Float32Array(verses.length * 3);
    const sizes = new Float32Array(verses.length);
    const originalSizes = new Float32Array(verses.length);

    verses.forEach((verse, i) => {
      positions[i * 3] = verse.position?.x || 0;
      positions[i * 3 + 1] = verse.position?.y || 0;
      positions[i * 3 + 2] = verse.position?.z || 0;

      const colorHex = CLUSTER_COLORS[verse.cluster % CLUSTER_COLORS.length];
      const color = new THREE.Color(colorHex);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      originalColors[i * 3] = color.r;
      originalColors[i * 3 + 1] = color.g;
      originalColors[i * 3 + 2] = color.b;

      const baseSize = 0.15;
      sizes[i] = baseSize;
      originalSizes[i] = baseSize;
    });

    return { positions, colors, sizes, originalColors, originalSizes };
  }, [verses]);

  // Animate based on interaction
  useFrame(() => {
    if (!pointsRef.current || !verses || verses.length === 0) return;

    const colorsAttr = pointsRef.current.geometry.attributes.color;
    const sizesAttr = pointsRef.current.geometry.attributes.size;

    verses.forEach((verse, i) => {
      const isSelected = selectedVerse?.id === verse.id;
      const isHovered = hoveredVerse?.id === verse.id;
      const isSearchResult = searchResults.length > 0 && searchResults.includes(verse.id);
      const dimmed = searchResults.length > 0 && !isSearchResult;

      if (isSelected) {
        // Warm gold for selected
        colorsAttr.array[i * 3] = 0.8;
        colorsAttr.array[i * 3 + 1] = 0.5;
        colorsAttr.array[i * 3 + 2] = 0.1;
        sizesAttr.array[i] = 0.3;
      } else if (isHovered) {
        // Darker for hovered
        colorsAttr.array[i * 3] = originalColors[i * 3] * 0.7;
        colorsAttr.array[i * 3 + 1] = originalColors[i * 3 + 1] * 0.7;
        colorsAttr.array[i * 3 + 2] = originalColors[i * 3 + 2] * 0.7;
        sizesAttr.array[i] = 0.22;
      } else if (isSearchResult) {
        // Brighten search results 
        colorsAttr.array[i * 3] = Math.min(originalColors[i * 3] * 1.2, 1);
        colorsAttr.array[i * 3 + 1] = Math.min(originalColors[i * 3 + 1] * 1.2, 1);
        colorsAttr.array[i * 3 + 2] = Math.min(originalColors[i * 3 + 2] * 1.2, 1);
        sizesAttr.array[i] = 0.22;
      } else if (dimmed) {
        // Very faint for non-matching
        colorsAttr.array[i * 3] = originalColors[i * 3] * 0.3 + 0.6;
        colorsAttr.array[i * 3 + 1] = originalColors[i * 3 + 1] * 0.3 + 0.6;
        colorsAttr.array[i * 3 + 2] = originalColors[i * 3 + 2] * 0.3 + 0.6;
        sizesAttr.array[i] = 0.08;
      } else {
        // Normal state
        colorsAttr.array[i * 3] = originalColors[i * 3];
        colorsAttr.array[i * 3 + 1] = originalColors[i * 3 + 1];
        colorsAttr.array[i * 3 + 2] = originalColors[i * 3 + 2];
        sizesAttr.array[i] = originalSizes[i];
      }
    });

    colorsAttr.needsUpdate = true;
    sizesAttr.needsUpdate = true;
  });

  // Click handler
  const handleClick = (event) => {
    event.stopPropagation();

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(pointsRef.current);

    if (intersects.length > 0) {
      const index = intersects[0].index;
      const clickedVerse = verses[index];
      setSelectedVerse(clickedVerse);
      if (onVerseClick) {
        onVerseClick(clickedVerse);
      }
    } else {
      setSelectedVerse(null);
    }
  };

  // Hover handler
  const handlePointerMove = () => {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(pointsRef.current);

    if (intersects.length > 0) {
      const index = intersects[0].index;
      setHoveredVerse(verses[index]);
      document.body.style.cursor = 'pointer';
    } else {
      setHoveredVerse(null);
      document.body.style.cursor = 'default';
    }
  };

  if (!verses || verses.length === 0) return null;

  return (
    <points
      ref={pointsRef}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.85}
      />
    </points>
  );
}
