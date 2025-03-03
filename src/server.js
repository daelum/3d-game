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