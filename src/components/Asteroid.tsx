import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import ExplosionEffect from './ExplosionEffect';

interface AsteroidProps {
  position: [number, number, number];
  size?: number;
  velocity?: [number, number, number];
  color?: string;
  id?: number;
  health?: number;
  onDestroy?: (position: [number, number, number], size: number, id: number) => void;
  isFragment?: boolean;
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
  id = Math.random(),
  health: initialHealth,
  onDestroy,
  isFragment = false,
}: AsteroidProps) => {
  const asteroidRef = useRef<THREE.Mesh>(null);
  const rigidBodyRef = useRef<any>(null);
  
  // Set initial health based on size
  const [health, setHealth] = useState(initialHealth || Math.floor(size * 30));
  const [destroyed, setDestroyed] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);

  // Create a random but consistent shape for the asteroid
  const seed = useRef(Math.random() * 100);
  const roughness = useRef(Math.random() * 0.4 + 0.2);

  // Function to handle taking damage
  const takeDamage = (amount: number) => {
    setHealth(prev => {
      const newHealth = prev - amount;
      if (newHealth <= 0 && !destroyed) {
        handleDestruction();
      }
      return newHealth;
    });
  };

  // Function to handle destruction
  const handleDestruction = () => {
    if (destroyed) return;
    
    setDestroyed(true);
    setShowExplosion(true);
    
    // Trigger the parent callback if provided
    if (onDestroy && asteroidRef.current) {
      const currentPosition = [
        asteroidRef.current.position.x,
        asteroidRef.current.position.y,
        asteroidRef.current.position.z
      ] as [number, number, number];
      
      onDestroy(currentPosition, size, id);
    }
    
    // Remove explosion effect after duration
    setTimeout(() => {
      setShowExplosion(false);
    }, 1500);
  };

  // Handle collision with projectiles
  useEffect(() => {
    if (!rigidBodyRef.current) return;
    
    // Set up the collision handler
    rigidBodyRef.current.userData = {
      type: 'asteroid',
      id,
      takeDamage,
      size
    };
    
    // Set the name for collision detection
    if (asteroidRef.current) {
      asteroidRef.current.name = 'asteroid';
    }
  }, [id, size]);

  useFrame(() => {
    if (rigidBodyRef.current && !destroyed) {
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

  if (destroyed && !showExplosion) return null;

  return (
    <>
      {!destroyed && (
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
      )}
      
      {showExplosion && (
        <ExplosionEffect 
          position={position}
          size={size * 2}
          color={color}
        />
      )}
    </>
  );
};

export default Asteroid; 