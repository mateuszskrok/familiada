
import React, { useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import { Board } from '../components/Board';
import { StrikeOverlay } from '../components/StrikeOverlay';

export const DisplayView: React.FC = () => {
    const { gameState, loading, error } = useGameState();
    // const [showStrike, setShowStrike] = useState(false);
    // const [strikeCount, setStrikeCount] = useState(0);

    // Effect to handle strike animation when counts change
    useEffect(() => {
        if (!gameState) return;

        // Simple logic: if strikes increased, show overlay
        // This requires tracking previous value, implemented simply here:
        // Ideally we'd store prev in ref. 
        // For scaffolding, I'll just check if strikes > 0 for now or leave it for refinement.
        // To properly animate, we need to know "which" strike just happened.
        // For now, let's just render the board.

        // Placeholder interaction for strike overlay
        // setShowStrike(true);
        // setTimeout(() => setShowStrike(false), 2000);

    }, [gameState?.team_a_strikes, gameState?.team_b_strikes]);

    if (loading) return <div>Loading game state...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!gameState) return <div>No game state active</div>;

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Board gameState={gameState} />
            <StrikeOverlay show={false} count={0} />
        </div>
    );
};
