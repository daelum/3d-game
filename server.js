import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, you'd want to restrict this
    methods: ["GET", "POST"]
  }
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Store connected players
const players = {};

// Game state
let asteroids = [];

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  console.log(`Current player count: ${Object.keys(players).length + 1}`);
  
  // Add new player with default attributes
  players[socket.id] = {
    id: socket.id,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    health: 100,
    score: 0,
    color: getRandomColor(),
    throttle: 0
  };
  
  // Log all current players
  console.log('All players:');
  Object.entries(players).forEach(([id, player]) => {
    console.log(`- ${id}: position: [${player.position}], health: ${player.health}`);
  });
  
  // Send the current players to the new player
  const playersList = Object.values(players);
  console.log(`Sending ${playersList.length} players to new player ${socket.id}`);
  socket.emit('players', playersList);
  
  // Broadcast the new player to all other players
  console.log(`Broadcasting new player ${socket.id} to all other players`);
  socket.broadcast.emit('playerJoined', players[socket.id]);
  
  // When a player sends a position update, broadcast it to others
  socket.on('updatePosition', (data) => {
    // Add player ID to the data object
    const updateData = {
      id: socket.id,
      ...data
    };
    
    // Add throttle if it's missing (backward compatibility)
    if (updateData.throttle === undefined) {
      updateData.throttle = 0;
    }
    
    // Update the player's stored data
    if (players[socket.id]) {
      players[socket.id].position = data.position;
      players[socket.id].rotation = data.rotation;
      players[socket.id].throttle = data.throttle;
      
      // Log position updates occasionally (about 5% of the time)
      if (Math.random() < 0.05) {
        console.log(`Player ${socket.id} moved to [${data.position}] with throttle ${data.throttle}`);
      }
      
      // Debug: log every 20th update with all player positions
      if (Math.random() < 0.05) {
        console.log("Current player positions:");
        Object.keys(players).forEach(id => {
          console.log(`- ${id.substring(0, 6)}: [${players[id].position}]`);
        });
      }
    }
    
    // Broadcast position update to all clients except the sender
    socket.broadcast.emit('playerMoved', updateData);
  });
  
  // Handle projectile fired
  socket.on('projectileFired', (data) => {
    socket.broadcast.emit('projectileFired', {
      id: socket.id,
      position: data.position,
      direction: data.direction
    });
  });
  
  // Handle player damage
  socket.on('playerDamaged', (data) => {
    const player = players[socket.id];
    if (player) {
      player.health = Math.max(0, player.health - data.amount);
      
      if (player.health <= 0) {
        // Player has been eliminated
        socket.broadcast.emit('playerEliminated', {
          id: socket.id,
          eliminatedBy: data.sourceId
        });
        
        // Increment score for the player who caused the damage
        const sourcePlayer = players[data.sourceId];
        if (sourcePlayer) {
          sourcePlayer.score += 10;
          io.to(data.sourceId).emit('scoreUpdated', { score: sourcePlayer.score });
        }
        
        // Reset player health
        player.health = 100;
        player.position = [
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 200
        ];
        
        // Notify the player they've been respawned
        socket.emit('respawn', {
          position: player.position,
          health: player.health
        });
      }
      
      // Broadcast player health update
      io.emit('playerHealthUpdated', {
        id: socket.id,
        health: player.health
      });
    }
  });
  
  // Handle asteroid destroyed
  socket.on('asteroidDestroyed', (data) => {
    const player = players[socket.id];
    if (player) {
      player.score += data.points;
      
      // Broadcast the score update
      io.emit('playerScoreUpdated', {
        id: socket.id,
        score: player.score
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Broadcast player left
    io.emit('playerLeft', socket.id);
    
    // Remove player from our object
    delete players[socket.id];
  });
});

// Generate a random color for new players
function getRandomColor() {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#FFE66D', // Yellow
    '#6BFF9E', // Green
    '#6B95FF', // Blue
    '#D46BFF', // Purple
    '#FF9E6B', // Orange
    '#FF6BE6'  // Pink
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 