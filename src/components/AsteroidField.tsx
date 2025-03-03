import { useMemo } from 'react';
import Asteroid from './Asteroid';

interface AsteroidFieldProps {
  count?: number;
  radius?: number;
}

const AsteroidField = ({ count = 20, radius = 30 }: AsteroidFieldProps) => {
  // Generate asteroid data with memoization to avoid recreating on each render
  const asteroids = useMemo(() => {
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
  
  return (
    <group>
      {asteroids.map((asteroid) => (
        <Asteroid
          key={asteroid.id}
          position={asteroid.position}
          size={asteroid.size}
          velocity={asteroid.velocity}
          color={asteroid.color}
        />
      ))}
    </group>
  );
};

export default AsteroidField; 