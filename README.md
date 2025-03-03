# Space Shooter Multiplayer Game

A 3D multiplayer space shooter game built with React Three Fiber, featuring asteroid fields, ship controls, and multiplayer functionality.

## Features

- **3D Space Environment**: Navigate through a beautiful space environment with stars and asteroid fields
- **Spacecraft Controls**: Control your spaceship with intuitive keyboard controls
- **Multiplayer**: Play with friends in the same space environment
- **Projectile System**: Shoot at asteroids and other players
- **Collision Detection**: Realistic collision handling for asteroids and ships
- **Score System**: Earn points by destroying asteroids and eliminating other players
- **Health Management**: Monitor your ship's health and avoid damage

## Getting Started

### Prerequisites

- Node.js (v14.x or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd my-game
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

### Running the Game

#### Development Mode (Single Player)

To run the game in development mode:

```bash
npm run dev
# or
yarn dev
```

This will start a Vite development server at http://localhost:5173.

#### Multiplayer Mode

To run the game in multiplayer mode:

1. Build the game and start the multiplayer server:
   ```bash
   npm run start
   # or
   yarn start
   ```

2. The game will be available at http://localhost:3000

3. Share the URL with friends on the same network, or use port forwarding to play across the internet.

## Game Controls

- **W/S**: Increase/decrease throttle (forward/backward)
- **Arrow Keys**: Control pitch (up/down) and yaw (left/right)
- **A/D**: Roll left/right
- **Spacebar**: Fire projectiles
- **R**: Reset the view
- **Shift**: Boost speed (hold)
- **V**: Toggle between first-person and third-person views

## Multiplayer Features

- Real-time player position synchronization
- Player scores visible to all players
- Projectile synchronization between players
- Health synchronization and damage reporting
- Respawn system when players are eliminated

## Development

### Project Structure

- `src/components/`: React components for the game
- `src/services/`: Service modules including Socket.io communication
- `server.js`: Multiplayer server implementation

### Adding New Features

The codebase is designed to be modular and extensible. Here are some areas to consider for expansion:

- Add more spacecraft types with different abilities
- Create new weapon types with different damage profiles
- Implement power-ups and special abilities
- Design more complex space environments with obstacles and hazards

## Technology Stack

- React and React Three Fiber for 3D rendering
- Three.js for 3D graphics
- Rapier for physics
- Socket.io for real-time multiplayer communication
- Express for the server

## License

MIT 