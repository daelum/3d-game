import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

interface AsteroidProps {
  position: [number, number, number];
  size?: number;
  velocity?: [number, number, number];
  color?: string;
}

const Asteroid = ({
  position,
  size = Math.random() * 0.5 + 0.5,
  velocity = [
    (Math.random() - 0.5) * 0.05,
    (Math.random() - 0.5) * 0.05,
    (Math.random() - 0.5) * 0.05,
  ],
  color = '#888888',
}: AsteroidProps) => {
  const asteroidRef = useRef<THREE.Mesh>(null);
  const rigidBodyRef = useRef<any>(null);

  // Create a random but consistent shape for the asteroid
  const seed = useRef(Math.random() * 100);
  const roughness = useRef(Math.random() * 0.4 + 0.2);

  useFrame(() => {
    if (rigidBodyRef.current) {
      const asteroidPosition = rigidBodyRef.current.translation();
      
      // If asteroid goes too far from origin, reset it to the opposite side
      const limit = 250;
      if (Math.abs(asteroidPosition.x) > limit || 
          Math.abs(asteroidPosition.y) > limit || 
          Math.abs(asteroidPosition.z) > limit) {
        rigidBodyRef.current.setTranslation(
          { 
            x: -asteroidPosition.x * 0.9, 
            y: -asteroidPosition.y * 0.9, 
            z: -asteroidPosition.z * 0.9 
          }, 
          true
        );
      }
    }
  });

  return (
    <RigidBody 
      ref={rigidBodyRef}
      position={position}
      linearVelocity={velocity}
      angularVelocity={[
        Math.random() * 0.2 - 0.1,
        Math.random() * 0.2 - 0.1,
        Math.random() * 0.2 - 0.1,
      ]}
      type="dynamic"
      colliders="ball"
    >
      <Sphere 
        ref={asteroidRef} 
        args={[size, 8, 8]}
        scale={[1 + roughness.current * Math.sin(seed.current), 
                1 + roughness.current * Math.cos(seed.current * 2), 
                1 + roughness.current * Math.sin(seed.current * 3)]}
      >
        <meshStandardMaterial 
          color={color} 
          roughness={0.8}
          metalness={0.2}
        />
      </Sphere>
    </RigidBody>
  );
};

export default Asteroid; 