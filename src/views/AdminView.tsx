
import React from 'react';
import { useGameState } from '../hooks/useGameState';
import { AdminControl } from '../components/AdminControl';
import { ContentManager } from '../components/ContentManager';
import { useState } from 'react';

export const AdminView: React.FC = () => {
    const { gameState, loading, error } = useGameState();
    const [mode, setMode] = useState<'game' | 'content'>('game');

    if (loading) return <div>Loading Admin...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!gameState) return <div>No game state active</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h1>Admin Dashboard</h1>

            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <button
                    onClick={() => setMode('game')}
                    style={{
                        padding: '10px 20px',
                        background: mode === 'game' ? '#002b5e' : '#ddd',
                        color: mode === 'game' ? 'white' : 'black',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Game Control
                </button>
                <button
                    onClick={() => setMode('content')}
                    style={{
                        padding: '10px 20px',
                        background: mode === 'content' ? '#002b5e' : '#ddd',
                        color: mode === 'content' ? 'white' : 'black',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Content Manager
                </button>
            </div>

            {mode === 'game' ? (
                <AdminControl gameState={gameState} />
            ) : (
                <ContentManager />
            )}
        </div>
    );
};
