import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ExplosionEffectProps {
  position: [number, number, number];
  size?: number;
  duration?: number;
  color?: string;
  particleCount?: number;
  isFragment?: boolean; // To differentiate between full asteroid and fragment explosions
}

const ExplosionEffect = ({
  position,
  size = 1,
  duration = 1.5,
  color = '#ff5500',
  particleCount = 15,
  isFragment = false,
}: ExplosionEffectProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const [elapsed, setElapsed] = useState(0);
  const [active, setActive] = useState(true);
  
  // Create a unique explosion pattern with randomized velocities
  const particleData = useMemo(() => {
    return Array.from({ length: particleCount }).map(() => ({
      // Random direction vector for each particle
      direction: new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize(),
      // Random speed for each particle
      speed: Math.random() * 2 + 1,
      // Random rotation axis
      rotationAxis: new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize(),
      // Random rotation speed
      rotationSpeed: Math.random() * 5 + 2,
      // Random geometric shape (0, 1, or 2)
      shape: Math.floor(Math.random() * 3),
      // Slight color variation
      colorOffset: Math.random() * 0.3 - 0.15,
    }));
  }, [particleCount]);
  
  // Add secondary flare effect
  const [flareIntensity, setFlareIntensity] = useState(1.0);
  
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
    
    // Calculate progress (1 at start, 0 at end)
    const progress = Math.max(0, 1 - elapsed / duration);
    
    // Update flare intensity - starts strong, quickly fades
    setFlareIntensity(Math.pow(progress, 1.5) * 1.5);
    
    // Early explosion phase has different behavior than later phase
    const earlyPhase = elapsed < duration * 0.3;
    const explosionForce = earlyPhase ? 
      // Initial outward explosion is faster
      4 * Math.pow(progress, 0.5) :
      // Later phase slows down
      2 * Math.pow(progress, 0.8);
    
    // Update each particle (child of the group) except the last one (which is the light)
    const particleCount = groupRef.current.children.length - 1;
    
    for (let i = 0; i < particleCount; i++) {
      const childMesh = groupRef.current.children[i] as THREE.Mesh;
      const particleInfo = particleData[i];
      
      // Calculate particle position based on direction and progress
      const distance = particleInfo.speed * explosionForce * size;
      
      const x = position[0] + particleInfo.direction.x * distance;
      const y = position[1] + particleInfo.direction.y * distance;
      const z = position[2] + particleInfo.direction.z * distance;
      
      childMesh.position.set(x, y, z);
      
      // Scale down over time, but not linearly
      // Particles maintain size longer, then rapidly shrink at end
      const scaleProgress = Math.max(0, Math.pow(progress, 0.7));
      childMesh.scale.setScalar(scaleProgress * size * 0.3);
      
      // Add dynamic rotation that speeds up over time
      const rotationSpeed = particleInfo.rotationSpeed * (1 + (1 - progress) * 2);
      childMesh.rotateOnAxis(particleInfo.rotationAxis, delta * rotationSpeed);
      
      // Update material properties
      if (childMesh.material) {
        const material = childMesh.material as THREE.MeshStandardMaterial;
        
        // Opacity follows progress but with slight variation
        material.opacity = progress * (0.7 + Math.sin(elapsed * 10 + i) * 0.3);
        
        // Emissive intensity increases as particles fade (glow effect)
        material.emissiveIntensity = 2 + (1 - progress) * 3;
      }
    }
    
    // Update the point light position and intensity
    const light = groupRef.current.children[particleCount] as THREE.PointLight;
    if (light && light.type === 'PointLight') {
      // Light intensity peaks early then fades
      light.intensity = 15 * Math.pow(progress, 0.5);
      // Light distance increases then decreases
      light.distance = size * (5 + Math.sin(elapsed * 5) * 2);
    }
  });
  
  if (!active) return null;
  
  // Create particles with different geometric shapes
  const particles = particleData.map((data, i) => {
    // Choose a geometry based on the shape value
    let geometry;
    switch (data.shape) {
      case 0:
        // Dodecahedron for rocky fragments
        geometry = <dodecahedronGeometry args={[0.2 * size, 0]} />;
        break;
      case 1:
        // Octahedron for sharper fragments
        geometry = <octahedronGeometry args={[0.25 * size, 0]} />;
        break;
      default:
        // Tetrahedron for smaller debris
        geometry = <tetrahedronGeometry args={[0.2 * size, 0]} />;
    }
    
    // Calculate a slightly varied color
    const baseColor = new THREE.Color(color);
    if (data.colorOffset) {
      baseColor.offsetHSL(0, 0, data.colorOffset);
    }
    
    return (
      <mesh key={i} position={position}>
        {geometry}
        <meshStandardMaterial 
          color={baseColor} 
          emissive={baseColor} 
          emissiveIntensity={2} 
          transparent
          opacity={1}
        />
      </mesh>
    );
  });
  
  return (
    <group ref={groupRef}>
      {particles}
      {/* Main explosion light */}
      <pointLight 
        intensity={15} 
        distance={size * 5} 
        decay={2} 
        position={position} 
        color={color} 
      />
      
      {/* Add central flare effect */}
      {flareIntensity > 0.05 && (
        <sprite position={position} scale={[size * flareIntensity * 3, size * flareIntensity * 3, 1]}>
          <spriteMaterial 
            attach="material" 
            map={null} 
            sizeAttenuation={true}
            transparent={true} 
            opacity={flareIntensity * 0.7}
            color={color}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      )}
      
      {/* Add subtle shockwave effect */}
      {elapsed < duration * 0.3 && (
        <mesh position={position}>
          <ringGeometry args={[size * (elapsed / duration * 8), size * (elapsed / duration * 8 + 0.1), 32]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={0.3 * (1 - elapsed / duration)} 
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
};

export default ExplosionEffect; 