import { io, Socket } from 'socket.io-client';
import { Vector3 } from 'three';

// Define event types
export interface PlayerData {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  health: number;
  score: number;
  color: string;
  throttle: number;
}

export interface ProjectileData {
  id: string;
  position: [number, number, number];
  direction: Vector3;
}

// Extend ImportMeta interface to include env
declare global {
  interface ImportMeta {
    env: Record<string, string>;
  }
}

// Define the socket service class
class SocketService {
  private socket: Socket | null = null;
  private callbacks: { [key: string]: Function[] } = {};

  // Initialize the socket connection
  connect() {
    if (this.socket) return;

    let serverUrl;
    
    if (import.meta.env.PROD) {
      // Use api subdomain for WebSocket server
      serverUrl = 'https://api.lost-in-space.today';
      console.log(`Connecting to: ${serverUrl} (production)`);
    } else {
      // In development, use localhost
      serverUrl = 'http://localhost:3000';
      console.log(`Connecting to: ${serverUrl} (development)`);
    }
    
    this.socket = io(serverUrl, {
      transports: ['websocket'],
      withCredentials: false
    });
    
    // Add connection status listeners
    this.socket.on('connect', () => {
      console.log(`Socket connected with ID: ${this.socket?.id}`);
      this.emit('connectionChange', true);
    });
    
    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.emit('connectionChange', false);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.emit('connectionError', error);
    });
    
    // Set up default listeners
    this.setupListeners();
    
    console.log('Socket connection initialized');
  }

  // Register callback functions for different events
  on(event: string, callback: Function) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
    
    return () => {
      this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
    };
  }
  
  // Handle events and call registered callbacks
  private emit(event: string, ...args: any[]) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => {
        callback(...args);
      });
    }
  }
  
  // Set up socket event listeners
  private setupListeners() {
    if (!this.socket) return;
    
    // Initial players list
    this.socket.on('players', (players: PlayerData[]) => {
      console.log('Received initial players list:', players);
      this.emit('players', players);
    });
    
    // New player joined
    this.socket.on('playerJoined', (player: PlayerData) => {
      console.log('Player joined:', player);
      this.emit('playerJoined', player);
    });
    
    // Player movement updates
    this.socket.on('playerMoved', (data: {
      id: string;
      position: [number, number, number];
      rotation: [number, number, number];
      throttle: number;
    }) => {
      // Log less frequently to avoid console spam
      if (Math.random() < 0.01) { // Log only 1% of movement updates
        console.log('Player moved:', data);
      }
      this.emit('playerMoved', data);
    });
    
    // Player left the game
    this.socket.on('playerLeft', (playerId: string) => {
      console.log('Player left:', playerId);
      this.emit('playerLeft', playerId);
    });
    
    // Projectile fired by another player
    this.socket.on('projectileFired', (data: ProjectileData) => {
      this.emit('projectileFired', data);
    });
    
    // Player health updated
    this.socket.on('playerHealthUpdated', (data: { id: string; health: number }) => {
      this.emit('playerHealthUpdated', data);
    });
    
    // Player eliminated another player
    this.socket.on('playerEliminated', (data: { id: string; eliminatedBy: string }) => {
      this.emit('playerEliminated', data);
    });
    
    // Player score updated
    this.socket.on('playerScoreUpdated', (data: { id: string; score: number }) => {
      this.emit('playerScoreUpdated', data);
    });
    
    // Player respawned
    this.socket.on('respawn', (data: { position: [number, number, number]; health: number }) => {
      this.emit('respawn', data);
    });
  }
  
  // Send position update to server
  updatePosition(position: [number, number, number], rotation: [number, number, number], throttle: number) {
    if (this.socket) {
      this.socket.emit('updatePosition', { position, rotation, throttle });
    }
  }
  
  // Send projectile fired event to server
  fireProjectile(position: [number, number, number], direction: Vector3) {
    if (this.socket) {
      this.socket.emit('projectileFired', { position, direction });
    }
  }
  
  // Report damage received
  reportDamage(amount: number, sourceId: string = '') {
    if (this.socket) {
      this.socket.emit('playerDamaged', { amount, sourceId });
    }
  }
  
  // Report asteroid destroyed
  reportAsteroidDestroyed(points: number) {
    if (this.socket) {
      this.socket.emit('asteroidDestroyed', { points });
    }
  }
  
  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('Socket disconnected');
    }
  }
  
  // Get the socket ID
  getSocketId(): string {
    return this.socket?.id || '';
  }
}

// Export a singleton instance
export const socketService = new SocketService();
export default socketService; 