import { useMemo } from 'react';
import Asteroid from './Asteroid';

interface AsteroidFieldProps {
  count?: number;
  radius?: number;
  quality?: string;
  onAsteroidDestroyed?: (points: number) => void;
}

interface AsteroidData {
  position: [number, number, number];
  size: number;
  velocity: [number, number, number];
  color: string;
  id: number;
}

const AsteroidField = ({ 
  count = 20, 
  radius = 200,
  quality = 'medium'
}: AsteroidFieldProps) => {
  // Generate asteroid data with memoization
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
      
      // Generate random size between 1.0 and 2.5 for asteroids
      const size = Math.random() * 1.5 + 1.0;
      
      // Generate random velocity with more varied directions and speeds
      const speed = 0.05 + Math.random() * 0.1; // Increased speed range
      const velocityTheta = Math.random() * Math.PI * 2; // Random direction in XZ plane
      const velocityPhi = Math.random() * Math.PI; // Random elevation angle
      
      const velocity: [number, number, number] = [
        speed * Math.sin(velocityPhi) * Math.cos(velocityTheta),
        speed * Math.sin(velocityPhi) * Math.sin(velocityTheta),
        speed * Math.cos(velocityPhi)
      ];
      
      // Add slight orbital motion by adding a perpendicular component
      const orbitComponent = 0.02 + Math.random() * 0.03;
      const perpVector = [
        -velocity[2], // Perpendicular to velocity in XZ plane
        velocity[1],  // Keep Y component
        velocity[0]   // Complete the perpendicular vector
      ];
      
      // Normalize and scale the perpendicular vector
      const perpLength = Math.sqrt(perpVector[0]**2 + perpVector[1]**2 + perpVector[2]**2);
      velocity[0] += (perpVector[0] / perpLength) * orbitComponent;
      velocity[1] += (perpVector[1] / perpLength) * orbitComponent;
      velocity[2] += (perpVector[2] / perpLength) * orbitComponent;
      
      // Generate random color
      const colors = ['#8A8A8A', '#A0A0A0', '#707070', '#909090', '#606060'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      return { 
        position, 
        size, 
        velocity, 
        color, 
        id: i
      };
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
          id={asteroid.id}
        />
      ))}
    </group>
  );
};

export default AsteroidField; 