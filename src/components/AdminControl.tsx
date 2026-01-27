import React from 'react';
import { supabase } from '../supabaseClient';
import type { GameState } from '../hooks/useGameState';
import { useRoundData } from '../hooks/useRoundData';
import { questionsAPI } from '../api/questionsAPI';

interface AdminControlProps {
    gameState: GameState;
}

export const AdminControl: React.FC<AdminControlProps> = ({ gameState }) => {
    const { question, answers, loading: roundLoading } = useRoundData(gameState.current_round);

    const updateState = async (updates: Partial<GameState>) => {
        const { error } = await supabase
            .from('game_state')
            .update(updates)
            .eq('id', 1);

        if (error) {
            console.error('Error updating state:', error);
            alert('Error updating state: ' + error.message);
        }
    };

    const handleRevealAnswer = async (answerId: string, points: number) => {
        try {
            // 1. Reveal in DB
            await questionsAPI.revealAnswer(answerId);

            // 2. Add points to current round score
            // Note: We should ideally check if it was ALREADY revealed to avoid double scoring,
            // but revealAnswer prevents duplicate ID in array.
            // However, we need to check local state or assume implicit trust.
            // Better: 'questionsAPI.revealAnswer' handles the array check. 
            // We should only add points if it wasn't already revealed.

            const isAlreadyRevealed = gameState.revealed_answers.some((a: any) =>
                (typeof a === 'string' && a === answerId) || (a.id === answerId)
            );

            if (!isAlreadyRevealed) {
                updateState({
                    current_round_score: gameState.current_round_score + points
                });
            }

        } catch (error) {
            console.error('Failed to reveal answer', error);
            alert('Failed to reveal');
        }
    };

    const handleNextRound = () => {
        updateState({
            current_round: gameState.current_round + 1,
            revealed_answers: [],
            current_round_score: 0,
            team_a_strikes: 0,
            team_b_strikes: 0,
            multiplier: 1 // or logic to increase
        });
    };

    const addStrike = (team: 'A' | 'B') => {
        if (team === 'A') {
            updateState({ team_a_strikes: gameState.team_a_strikes + 1 });
        } else {
            updateState({ team_b_strikes: gameState.team_b_strikes + 1 });
        }
    };

    const winRound = (team: 'A' | 'B') => {
        if (team === 'A') {
            updateState({ team_a_score: gameState.team_a_score + gameState.current_round_score });
        } else {
            updateState({ team_b_score: gameState.team_b_score + gameState.current_round_score });
        }
    };

    const resetStrikes = () => {
        updateState({ team_a_strikes: 0, team_b_strikes: 0 });
    };

    return (
        <div style={{ padding: '20px', background: '#f0f0f0', border: '1px solid #ccc' }}>
            <h3>Admin Control Panel</h3>

            <div style={{ marginBottom: '20px', padding: '10px', background: '#e0e0e0' }}>
                <h4>Current Question: {roundLoading ? 'Loading...' : (question?.text || 'No question found')}</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                    {answers.map(answer => {
                        const isRevealed = gameState.revealed_answers.includes(answer.id);
                        return (
                            <button
                                key={answer.id}
                                onClick={() => handleRevealAnswer(answer.id, answer.points)}
                                disabled={isRevealed}
                                style={{
                                    padding: '10px',
                                    background: isRevealed ? '#aaa' : '#fff',
                                    display: 'flex',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <span>{answer.text}</span>
                                <span>{answer.points} pts</span>
                            </button>
                        );
                    })}
                    {answers.length === 0 && !roundLoading && <div>No answers found</div>}
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h4>Round Control</h4>
                <button onClick={handleNextRound}>Next Round ({gameState.current_round + 1})</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h4>Round Win (Adds Pot to Team)</h4>
                <button onClick={() => winRound('A')}>Win Team A</button>
                <button onClick={() => winRound('B')}>Win Team B</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h4>Strikes</h4>
                <button onClick={() => addStrike('A')}>Strike Team A</button>
                <button onClick={() => addStrike('B')}>Strike Team B</button>
                <button onClick={resetStrikes}>Reset Strikes</button>
            </div>

            <div style={{ marginBottom: '20px', borderTop: '2px solid #ccc', paddingTop: '20px' }}>
                <h4 style={{ color: 'red' }}>DANGER ZONE</h4>
                <button
                    onClick={() => {
                        if (confirm('Are you sure you want to RESET the entire game?')) {
                            updateState({
                                current_round: 1,
                                revealed_answers: [],
                                current_round_score: 0,
                                team_a_score: 0,
                                team_b_score: 0,
                                team_a_strikes: 0,
                                team_b_strikes: 0,
                                multiplier: 1
                            });
                        }
                    }}
                    style={{ background: 'red', color: 'white', fontWeight: 'bold' }}
                >
                    RESET GAME
                </button>
            </div>

            <div>
                <h4>Debug</h4>
                <pre>{JSON.stringify(gameState, null, 2)}</pre>
            </div>
        </div>
    );
};
