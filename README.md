# Space Asteroid Explorer - Flight Simulator

A 3D space flight simulator built with React, Three.js, and React Three Fiber, where you pilot a spaceship through an immersive asteroid field in first-person view.

## Features

- First-person cockpit view for immersive space flight
- Real-time flight controls with pitch, yaw, and roll
- Physics-based movement and collisions
- Dense asteroid field to navigate through
- Multi-layered star field for deep space immersion
- Player health and score tracking
- Game over system with restart functionality

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone this repository
2. Navigate to the project directory:
   ```bash
   cd my-game
   ```
3. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

### Running the Game

From the `my-game` directory:

```bash
npm run dev
# or
yarn dev
```

Open your browser and visit http://localhost:5173

## Flight Controls

- **W/S**: Pitch down/up (nose down/up)
- **A/D**: Yaw left/right (turn left/right)
- **Q/E**: Roll left/right (barrel roll)
- **R**: Reset ship position and orientation

Your spaceship automatically moves forward, and you control its direction with these flight controls.

## Game Mechanics

- Navigate through dense asteroid fields
- Each collision with an asteroid reduces your health
- Your score increases as you travel through space
- Game ends when your health reaches zero
- Click "RESTART" to play again

## Project Structure

```
my-game/
├── public/         # Static assets
├── src/            # Source code
│   ├── components/ # React components
│   │   ├── AsteroidField.tsx  # Asteroid generation
│   │   ├── SpaceFighter.tsx   # Player spaceship with controls
│   ├── Game.tsx     # Main game component
│   ├── index.tsx    # Application entry point
│   └── styles.css   # Global styles
└── ...
```

## Built With

- [React](https://reactjs.org/) - UI Library
- [Three.js](https://threejs.org/) - 3D Graphics Library
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) - React renderer for Three.js
- [React Three Rapier](https://github.com/pmndrs/react-three-rapier) - Physics for React Three Fiber
- [Drei](https://github.com/pmndrs/drei) - Useful helpers for React Three Fiber
- [Vite](https://vitejs.dev/) - Frontend build tool

## Future Enhancements

- Weapons and shooting mechanics
- Enemy spacecraft to engage with
- Different space environments to explore
- Power-ups and ship upgrades
- Advanced flight control options
- Multiplayer dogfighting mode

## License

This project is licensed under the MIT License - see the LICENSE file for details. 