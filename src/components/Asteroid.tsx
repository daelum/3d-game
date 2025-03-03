import { useRef, useState, useEffect, useMemo } from 'react';
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
  const [maxHealth] = useState(initialHealth || Math.floor(size * 30)); // Track max health for damage visualization
  const [destroyed, setDestroyed] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);

  // Create a random but consistent shape for the asteroid
  const seed = useRef(Math.random() * 100);
  const roughness = useRef(Math.random() * 0.4 + 0.2);
  
  // Visual damage indicator
  const [damageLevel, setDamageLevel] = useState(0); // 0 = no damage, 1 = moderate, 2 = severe
  const [hitEffects, setHitEffects] = useState<{position: [number, number, number], time: number}[]>([]);

  // Define the damage texture/color based on damage level
  const asteroidMaterial = useMemo(() => {
    // Start with the original color
    let baseColor = new THREE.Color(color);
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.7 + (damageLevel * 0.1), // More damaged = rougher
      metalness: 0.2 - (damageLevel * 0.05), // Less metallic as damaged
    });
    
    // Add red/orange glow for damage effect
    if (damageLevel > 0) {
      material.emissive = new THREE.Color('#ff4400');
      material.emissiveIntensity = damageLevel * 0.1; // Increases with damage
    }
    
    return material;
  }, [color, damageLevel]);

  // Function to handle taking damage
  const takeDamage = (amount: number) => {
    setHealth(prev => {
      const newHealth = prev - amount;
      
      // Calculate damage level based on health percentage
      const healthPercentage = newHealth / maxHealth;
      
      if (healthPercentage <= 0.3) {
        setDamageLevel(2); // Severe damage
      } else if (healthPercentage <= 0.7) {
        setDamageLevel(1); // Moderate damage
      }
      
      // Add hit effect at a random position on the asteroid
      if (asteroidRef.current) {
        const hitPosition: [number, number, number] = [
          Math.random() * size * 0.8 - size * 0.4,
          Math.random() * size * 0.8 - size * 0.4,
          Math.random() * size * 0.8 - size * 0.4
        ];
        
        setHitEffects(prev => [...prev, { position: hitPosition, time: Date.now() }]);
        
        // Remove hit effects after a time
        setTimeout(() => {
          setHitEffects(prev => prev.filter(effect => effect.time !== Date.now()));
        }, 300);
      }
      
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
    
    // Create a bound version of takeDamage that will work when called from collision handlers
    const handleDamage = (amount: number) => {
      console.log(`Asteroid ${id} taking damage: ${amount}`);
      takeDamage(amount);
    };
    
    // Add takeDamage directly to the rigidBody ref
    rigidBodyRef.current.takeDamage = handleDamage;
    
    // Ensure userData is properly set for collision detection
    const userData = {
      type: 'asteroid',
      id,
      takeDamage: handleDamage, // Use the bound handler
      size,
      isFragment,
      health, // Add current health to userData
      maxHealth // Add max health for potential use
    };
    
    // Set userData on the rigidBody
    rigidBodyRef.current.userData = userData;
    
    // Set name for collision detection
    if (asteroidRef.current) {
      asteroidRef.current.name = 'asteroid';
      // Also set it on the mesh for redundancy
      asteroidRef.current.userData = { ...userData };
    }
    
    console.log(`Asteroid ${id} initialized with health: ${health}/${maxHealth}, size: ${size}`);
    
    // Clean up function
    return () => {
      // Clean up properties if needed
      if (rigidBodyRef.current) {
        delete rigidBodyRef.current.takeDamage;
      }
    };
  }, [id, size, isFragment, health, maxHealth, takeDamage]);

  useFrame((state, delta) => {
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
      
      // If severely damaged, add wobble and sporadic particle effects
      if (damageLevel === 2 && !isFragment) {
        // Add wobble to rotation
        const wobbleAmount = 0.005;
        rigidBodyRef.current.setAngvel({
          x: rigidBodyRef.current.angvel().x + (Math.random() - 0.5) * wobbleAmount,
          y: rigidBodyRef.current.angvel().y + (Math.random() - 0.5) * wobbleAmount,
          z: rigidBodyRef.current.angvel().z + (Math.random() - 0.5) * wobbleAmount
        });
        
        // Occasionally emit a small fragment/particle
        if (Math.random() < 0.01) {
          // Could add particle effects here in the future
        }
      }
    }
    
    // Remove old hit effects
    setHitEffects(prev => prev.filter(effect => Date.now() - effect.time < 300));
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
          userData={{ 
            type: 'asteroid', 
            id, 
            takeDamage,
            size,
            isFragment,
            health, 
            maxHealth
          }}
        >
          <Sphere 
            ref={asteroidRef} 
            args={[size, 8, 8]}
            scale={[1 + roughness.current * Math.sin(seed.current), 
                    1 + roughness.current * Math.cos(seed.current * 2), 
                    1 + roughness.current * Math.sin(seed.current * 3)]}
          >
            {/* Use the damage-aware material */}
            <primitive object={asteroidMaterial} attach="material" />
            
            {/* Add glow for damaged asteroids */}
            {damageLevel > 0 && (
              <pointLight 
                intensity={0.5 * damageLevel} 
                distance={size * 3} 
                color="#ff4400" 
              />
            )}
          </Sphere>
          
          {/* Hit effect markers */}
          {hitEffects.map((effect, index) => (
            <mesh 
              key={`hit-${index}-${effect.time}`} 
              position={effect.position}
              scale={[0.05, 0.05, 0.05]}
            >
              <sphereGeometry />
              <meshBasicMaterial color="#ffff00" />
              <pointLight intensity={1} distance={size} color="#ffff00" />
            </mesh>
          ))}
        </RigidBody>
      )}
      
      {showExplosion && (
        <ExplosionEffect 
          position={position}
          size={size * 2}
          color={damageLevel > 0 ? '#ff6600' : color}
          particleCount={Math.floor(size * 20)} // More particles for larger asteroids
          isFragment={isFragment}
        />
      )}
    </>
  );
};

export default Asteroid; 