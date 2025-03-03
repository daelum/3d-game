import React, { useState, useEffect } from 'react';
import { socketService, PlayerData } from '../services/SocketService';

interface DebugPanelProps {
  isConnected: boolean;
  localPlayerId: string;
  otherPlayers: Map<string, PlayerData>;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  isConnected,
  localPlayerId,
  otherPlayers
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Capture console logs
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      // Only capture socket-related logs
      const logString = args.join(' ');
      if (logString.includes('Socket') || logString.includes('Player')) {
        setMessages(prev => [logString, ...prev].slice(0, 50));
      }
      originalConsoleLog(...args);
    };

    return () => {
      console.log = originalConsoleLog;
    };
  }, []);

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)} 
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          zIndex: 1000,
          background: '#333',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          padding: '5px 10px',
          cursor: 'pointer'
        }}
      >
        Show Debug
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      width: isExpanded ? '400px' : '200px',
      maxHeight: '300px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 1000,
      overflowY: isExpanded ? 'auto' : 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontWeight: 'bold' }}>Multiplayer Debug</span>
        <div>
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            style={{ marginRight: '5px', background: 'none', border: '1px solid white', color: 'white', cursor: 'pointer' }}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
          <button 
            onClick={() => setIsVisible(false)} 
            style={{ background: 'none', border: '1px solid white', color: 'white', cursor: 'pointer' }}
          >
            X
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div>
          Connection Status: 
          <span style={{ color: isConnected ? '#4CAF50' : '#F44336', marginLeft: '5px' }}>
            {isConnected ? '✓ Connected' : '✗ Disconnected'}
          </span>
        </div>
        <div>Socket ID: <span style={{ color: '#2196F3' }}>{localPlayerId || 'Not assigned'}</span></div>
        <div>Players connected: <span style={{ color: '#FF9800' }}>{otherPlayers.size}</span></div>
      </div>

      {isExpanded && (
        <>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid #555', paddingBottom: '5px', marginBottom: '5px' }}>
              Other Players
            </div>
            {Array.from(otherPlayers.entries()).map(([id, player]) => (
              <div key={id} style={{ marginBottom: '5px', fontSize: '11px' }}>
                <div>{id.substring(0, 6)}... : 
                  <span style={{ color: '#4CAF50' }}> pos: </span>
                  <span>
                    {player.position ? 
                      `(${player.position[0].toFixed(1)}, ${player.position[1].toFixed(1)}, ${player.position[2].toFixed(1)})` 
                      : 'unknown'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid #555', paddingBottom: '5px', marginBottom: '5px' }}>
              Recent Logs
            </div>
            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ fontSize: '10px', marginBottom: '2px', wordBreak: 'break-word' }}>
                  {msg}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DebugPanel; 