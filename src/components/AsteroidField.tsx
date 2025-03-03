import { useMemo, useState, useCallback } from 'react';
import Asteroid from './Asteroid';

interface AsteroidFieldProps {
  count?: number;
  radius?: number;
  onAsteroidDestroyed?: (points: number) => void;
  quality?: string; // Add quality parameter for performance optimization
}

interface AsteroidData {
  position: [number, number, number];
  size: number;
  velocity: [number, number, number];
  color: string;
  id: number;
  isFragment?: boolean;
  health?: number;
}

const AsteroidField = ({ 
  count = 20, 
  radius = 200,
  onAsteroidDestroyed,
  quality = 'medium'
}: AsteroidFieldProps) => {
  // State to track all asteroids including dynamically created fragments
  const [dynamicAsteroids, setDynamicAsteroids] = useState<AsteroidData[]>([]);

  // Generate initial asteroid data with memoization
  const initialAsteroids = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // Generate random positions within a sphere
      const theta = Math.random() * Math.PI * 2; // Random angle around the y-axis
      const phi = Math.acos(2 * Math.random() - 1); // Random angle from the y-axis
      const r = radius * Math.cbrt(Math.random()); // Cube root for more uniform distribution
      
      const position: [number, number, number] = [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      ];
      
      // Generate random size between 1.0 and 2.5 for initial asteroids
      const size = Math.random() * 1.5 + 1.0;
      
      // Generate random velocity directed roughly toward the center
      const velocity: [number, number, number] = [
        -position[0] * 0.01 * (Math.random() * 0.5 + 0.5),
        -position[1] * 0.01 * (Math.random() * 0.5 + 0.5),
        -position[2] * 0.01 * (Math.random() * 0.5 + 0.5)
      ];
      
      // Generate random color
      const colors = ['#8A8A8A', '#A0A0A0', '#707070', '#909090', '#606060'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // Calculate health based on size
      const health = Math.floor(size * 30);
      
      return { 
        position, 
        size, 
        velocity, 
        color, 
        id: i,
        isFragment: false, // Ensure all initial asteroids have this property
        health // Add health based on size
      };
    });
  }, [count, radius]);

  // Handle an asteroid being destroyed
  const handleAsteroidDestroyed = useCallback((position: [number, number, number], size: number, id: number) => {
    // Add score based on asteroid size
    if (onAsteroidDestroyed) {
      const points = Math.floor(50 / size); // Smaller asteroids = more points
      onAsteroidDestroyed(points);
    }
    
    // Only create fragments if asteroid is large enough and based on quality settings
    if (size > 0.5) { // Reduced minimum size to allow more breaking stages
      // Adjust fragment count based on quality setting
      let maxFragments = 3; // Default for medium
      if (quality === 'low') {
        maxFragments = size >= 1.5 ? 2 : 0; // Only large asteroids create fragments on low quality
      } else if (quality === 'high') {
        maxFragments = 4;
      }
      
      // Create fewer smaller fragments based on the original size and quality setting
      const fragmentCount = size >= 1.0 ? Math.min(Math.floor(Math.random() * 2) + 2, maxFragments) : Math.min(2, maxFragments);
      
      // Skip fragment creation if count would be 0
      if (fragmentCount <= 0) return;
      
      const fragments: AsteroidData[] = [];
      
      for (let i = 0; i < fragmentCount; i++) {
        // Create a new fragment with randomized direction
        // Fragments are proportionally smaller based on parent size
        const fragmentSize = size * (0.4 + Math.random() * 0.2); // 40-60% of original size
        const fragmentId = Date.now() + i;
        
        // Randomize fragment velocity in different directions with more energy
        const speed = 0.15 + (Math.random() * 0.1);
        const fragmentVelocity: [number, number, number] = [
          (Math.random() - 0.5) * speed,
          (Math.random() - 0.5) * speed,
          (Math.random() - 0.5) * speed
        ];
        
        // Slightly offset fragment positions to prevent immediate collisions
        const posOffset = 0.5 * size;
        const fragmentPos: [number, number, number] = [
          position[0] + (Math.random() - 0.5) * posOffset,
          position[1] + (Math.random() - 0.5) * posOffset,
          position[2] + (Math.random() - 0.5) * posOffset
        ];
        
        // Generate a slightly different color for fragments
        let fragmentColor = '#A06060'; // Default reddish
        
        // For larger fragments, vary colors more
        if (fragmentSize > 0.8) {
          const colors = ['#A06060', '#A07060', '#906060', '#805050', '#705060'];
          fragmentColor = colors[Math.floor(Math.random() * colors.length)];
        }
        
        // Calculate health based on fragment size
        const fragmentHealth = Math.floor(fragmentSize * 25); // Slightly less durable than parent
        
        fragments.push({
          position: fragmentPos,
          size: fragmentSize,
          velocity: fragmentVelocity,
          color: fragmentColor,
          id: fragmentId,
          isFragment: true,
          health: fragmentHealth
        });
      }
      
      // Add the fragments to the dynamic asteroids list
      setDynamicAsteroids(prev => [...prev, ...fragments]);
    }
    
    // Remove the destroyed asteroid from dynamic list if it exists there
    setDynamicAsteroids(prev => prev.filter(asteroid => asteroid.id !== id));
  }, [onAsteroidDestroyed, quality]);

  // Combine initial and dynamic asteroids
  const allAsteroids = [...initialAsteroids, ...dynamicAsteroids];
  
  return (
    <group>
      {allAsteroids.map((asteroid) => (
        <Asteroid
          key={asteroid.id}
          position={asteroid.position}
          size={asteroid.size}
          velocity={asteroid.velocity}
          color={asteroid.color}
          id={asteroid.id}
          isFragment={asteroid.isFragment}
          health={asteroid.health}
          onDestroy={handleAsteroidDestroyed}
        />
      ))}
    </group>
  );
};

export default AsteroidField; 