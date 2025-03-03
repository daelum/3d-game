import { useMemo, useState, useCallback } from 'react';
import Asteroid from './Asteroid';

interface AsteroidFieldProps {
  count?: number;
  radius?: number;
  onAsteroidDestroyed?: (points: number) => void;
}

interface AsteroidData {
  position: [number, number, number];
  size: number;
  velocity: [number, number, number];
  color: string;
  id: number;
  isFragment?: boolean;
}

const AsteroidField = ({ 
  count = 20, 
  radius = 200,
  onAsteroidDestroyed 
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
      
      // Generate random size
      const size = Math.random() * 1.5 + 0.5;
      
      // Generate random velocity directed roughly toward the center
      const velocity: [number, number, number] = [
        -position[0] * 0.01 * (Math.random() * 0.5 + 0.5),
        -position[1] * 0.01 * (Math.random() * 0.5 + 0.5),
        -position[2] * 0.01 * (Math.random() * 0.5 + 0.5)
      ];
      
      // Generate random color
      const colors = ['#8A8A8A', '#A0A0A0', '#707070', '#909090', '#606060'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      return { position, size, velocity, color, id: i };
    });
  }, [count, radius]);

  // Handle an asteroid being destroyed
  const handleAsteroidDestroyed = useCallback((position: [number, number, number], size: number, id: number) => {
    // Add score based on asteroid size
    if (onAsteroidDestroyed) {
      const points = Math.floor(50 / size); // Smaller asteroids = more points
      onAsteroidDestroyed(points);
    }
    
    // Only create fragments if asteroid is large enough
    if (size > 0.8) {
      // Create 2-3 smaller fragments
      const fragmentCount = Math.floor(Math.random() * 2) + 2;
      const fragments: AsteroidData[] = [];
      
      for (let i = 0; i < fragmentCount; i++) {
        // Create a new fragment with randomized direction
        const fragmentSize = size * 0.5; // Half the original size
        const fragmentId = Date.now() + i;
        
        // Randomize fragment velocity in different directions
        const speed = 0.1;
        const fragmentVelocity: [number, number, number] = [
          (Math.random() - 0.5) * speed,
          (Math.random() - 0.5) * speed,
          (Math.random() - 0.5) * speed
        ];
        
        fragments.push({
          position: [...position], // Clone the position
          size: fragmentSize,
          velocity: fragmentVelocity,
          color: '#A06060', // Slightly reddish to indicate damaged fragments
          id: fragmentId,
          isFragment: true
        });
      }
      
      // Add the fragments to the dynamic asteroids list
      setDynamicAsteroids(prev => [...prev, ...fragments]);
    }
    
    // Remove the destroyed asteroid from dynamic list if it exists there
    setDynamicAsteroids(prev => prev.filter(asteroid => asteroid.id !== id));
  }, [onAsteroidDestroyed]);

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
          onDestroy={handleAsteroidDestroyed}
        />
      ))}
    </group>
  );
};

export default AsteroidField; 