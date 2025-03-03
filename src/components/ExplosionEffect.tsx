import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ExplosionEffectProps {
  position: [number, number, number];
  size?: number;
  duration?: number;
  color?: string;
  particleCount?: number;
}

const ExplosionEffect = ({
  position,
  size = 1,
  duration = 1.5,
  color = '#ff5500',
  particleCount = 15,
}: ExplosionEffectProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const [elapsed, setElapsed] = useState(0);
  const [active, setActive] = useState(true);
  
  // Update particle positions on each frame
  useFrame((state, delta) => {
    if (!active || !groupRef.current) return;
    
    // Update elapsed time
    setElapsed((prev) => {
      const newElapsed = prev + delta;
      if (newElapsed >= duration) {
        setActive(false);
      }
      return newElapsed;
    });
    
    // Update each particle (child of the group)
    const progress = Math.max(0, 1 - elapsed / duration);
    
    groupRef.current.children.forEach((child, i) => {
      // Apply outward explosion movement
      const childMesh = child as THREE.Mesh;
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = size * (1 - progress) * 2;
      
      const x = position[0] + Math.cos(angle) * radius * (1 + 0.5 * Math.sin(i));
      const y = position[1] + Math.sin(angle) * radius * (1 + 0.5 * Math.cos(i));
      const z = position[2] + Math.sin(angle * 2) * radius * 0.5;
      
      childMesh.position.set(x, y, z);
      
      // Scale down over time
      childMesh.scale.setScalar(progress * size * 0.3);
      
      // Add some rotation
      childMesh.rotation.x += delta * 3;
      childMesh.rotation.y += delta * 3;
      childMesh.rotation.z += delta * 3;
      
      // Update material opacity
      if (childMesh.material) {
        const material = childMesh.material as THREE.MeshStandardMaterial;
        material.opacity = progress;
      }
    });
  });
  
  if (!active) return null;
  
  // Create particles once
  const particles = Array.from({ length: particleCount }).map((_, i) => (
    <mesh key={i} position={position}>
      <dodecahedronGeometry args={[0.2 * size, 0]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        emissiveIntensity={2} 
        transparent
        opacity={1}
      />
    </mesh>
  ));
  
  return (
    <group ref={groupRef}>
      {particles}
      <pointLight intensity={10} distance={size * 5} decay={2} position={position} color={color} />
    </group>
  );
};

export default ExplosionEffect; 