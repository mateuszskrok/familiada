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
    const [finalQuestions, setFinalQuestions] = React.useState<any[]>([]);
    const [finalAnswers, setFinalAnswers] = React.useState<Record<string, any[]>>({});
    const [loadingFinal, setLoadingFinal] = React.useState(false);

    // Local state for team names to prevent race condition with realtime updates
    const [teamANameLocal, setTeamANameLocal] = React.useState(gameState.team_a_name || 'Team A');
    const [teamBNameLocal, setTeamBNameLocal] = React.useState(gameState.team_b_name || 'Team B');

    // Update local state when gameState changes (but only if not currently editing)
    React.useEffect(() => {
        setTeamANameLocal(gameState.team_a_name || 'Team A');
        setTeamBNameLocal(gameState.team_b_name || 'Team B');
    }, [gameState.team_a_name, gameState.team_b_name]);

    // Fetch final questions when in final mode
    React.useEffect(() => {
        if (gameState.is_final_mode) {
            const fetchFinalQuestions = async () => {
                setLoadingFinal(true);
                try {
                    const questions = await questionsAPI.getFinalQuestions();
                    setFinalQuestions(questions || []);

                    // Fetch answers for each final question
                    const answersMap: Record<string, any[]> = {};
                    for (const q of questions || []) {
                        const ans = await questionsAPI.getAnswers(q.id);
                        answersMap[q.id] = ans || [];
                    }
                    setFinalAnswers(answersMap);
                } catch (error) {
                    console.error('Error fetching final questions:', error);
                } finally {
                    setLoadingFinal(false);
                }
            };
            fetchFinalQuestions();
        }
    }, [gameState.is_final_mode]);

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

    const addStrike = (team: 'A' | 'B', event?: React.MouseEvent<HTMLButtonElement>) => {
        // Blur the button to prevent focus lock
        if (event?.currentTarget) {
            event.currentTarget.blur();
        }
        if (team === 'A') {
            updateState({ team_a_strikes: gameState.team_a_strikes + 1 });
        } else {
            updateState({ team_b_strikes: gameState.team_b_strikes + 1 });
        }
    };

    const winRound = (team: 'A' | 'B') => {
        if (gameState.current_round_score <= 0) {
            alert('Cannot award points: current round score is 0. Reveal some answers first.');
            return;
        }
        if (team === 'A') {
            updateState({ team_a_score: gameState.team_a_score + gameState.current_round_score });
        } else {
            updateState({ team_b_score: gameState.team_b_score + gameState.current_round_score });
        }
    };

    const resetStrikes = () => {
        updateState({ team_a_strikes: 0, team_b_strikes: 0 });
    };

    // Final mode handlers
    const goToFinal = () => {
        updateState({
            is_final_mode: true,
            timer_value: 0,
            timer_running: false,
            answers_masked: false,
            revealed_answers: [],
            current_round_score: 0
        });
    };

    const exitFinalMode = () => {
        updateState({
            is_final_mode: false,
            timer_value: 0,
            timer_running: false,
            answers_masked: false
        });
    };

    const startTimer = (seconds: number) => {
        updateState({
            timer_value: seconds,
            timer_running: true
        });
    };

    const stopTimer = () => {
        updateState({
            timer_running: false
        });
    };

    const toggleMaskAnswers = () => {
        updateState({
            answers_masked: !gameState.answers_masked
        });
    };

    // Add a "No Answer" marker for final mode
    const addNoAnswer = async (questionId: string) => {
        try {
            // Add a special marker to revealed_answers with question ID
            const noAnswerMarker = `NO_ANSWER_${questionId}_${Date.now()}`;
            const currentRevealed = Array.isArray(gameState.revealed_answers) ? gameState.revealed_answers : [];
            await updateState({
                revealed_answers: [...currentRevealed, noAnswerMarker]
            });
        } catch (error) {
            console.error('Failed to add no answer marker', error);
        }
    };

    // Timer countdown effect
    React.useEffect(() => {
        if (!gameState.timer_running || gameState.timer_value <= 0) {
            return;
        }

        const interval = setInterval(() => {
            const newValue = gameState.timer_value - 1;
            if (newValue <= 0) {
                updateState({
                    timer_value: 0,
                    timer_running: false
                });
            } else {
                updateState({
                    timer_value: newValue
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [gameState.timer_running, gameState.timer_value]);

    return (
        <div style={{ padding: '20px', background: '#f0f0f0', border: '1px solid #ccc' }}>
            <h3>Admin Control Panel</h3>

            {/* Team Names */}
            <div style={{ marginBottom: '20px', padding: '15px', background: '#fff', border: '2px solid #002b5e', borderRadius: '5px' }}>
                <h4 style={{ marginBottom: '10px' }}>Team Names</h4>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Team A Name:</label>
                        <input
                            type="text"
                            value={teamANameLocal}
                            onChange={(e) => setTeamANameLocal(e.target.value)}
                            onBlur={() => updateState({ team_a_name: teamANameLocal })}
                            placeholder="Team A"
                            style={{ width: '100%', padding: '8px', fontSize: '1rem' }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Team B Name:</label>
                        <input
                            type="text"
                            value={teamBNameLocal}
                            onChange={(e) => setTeamBNameLocal(e.target.value)}
                            onBlur={() => updateState({ team_b_name: teamBNameLocal })}
                            placeholder="Team B"
                            style={{ width: '100%', padding: '8px', fontSize: '1rem' }}
                        />
                    </div>
                </div>
            </div>

            {/* Question/Answer Section - Conditional based on mode */}
            {!gameState.is_final_mode ? (
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
                    <div style={{ marginBottom: '20px' }}>
                        <h4>Round Control</h4>
                        <button onClick={handleNextRound}>Next Round ({gameState.current_round + 1})</button>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <h4>Round Win (Adds Pot to Team)</h4>
                        <button onClick={() => winRound('A')}>Win {gameState.team_a_name || 'Team A'}</button>
                        <button onClick={() => winRound('B')}>Win {gameState.team_b_name || 'Team B'}</button>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <h4>Strikes</h4>
                        <button onMouseDown={(e) => addStrike('A', e)}>Strike {gameState.team_a_name || 'Team A'}</button>
                        <button onMouseDown={(e) => addStrike('B', e)}>Strike {gameState.team_b_name || 'Team B'}</button>
                        <button onClick={resetStrikes}>Reset Strikes</button>
                    </div>
                </div>

            ) : (
                <div style={{ marginBottom: '20px', padding: '10px', background: '#ffe6cc' }}>
                    <h4>Final Questions</h4>
                    {loadingFinal ? (
                        <div>Loading final questions...</div>
                    ) : finalQuestions.length === 0 ? (
                        <div style={{ color: '#999', padding: '20px', textAlign: 'center' }}>
                            No final questions found. Please add questions with "is_final" = true.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {finalQuestions.map((q, qIdx) => (
                                <div key={q.id} style={{
                                    background: '#fff',
                                    padding: '15px',
                                    borderRadius: '5px',
                                    border: '2px solid #ff8800'
                                }}>
                                    <h5 style={{ marginBottom: '10px', color: '#ff8800' }}>
                                        Question {qIdx + 1}: {q.text}
                                    </h5>
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        {(finalAnswers[q.id] || []).map(answer => {
                                            const isRevealed = gameState.revealed_answers.includes(answer.id);
                                            return (
                                                <button
                                                    key={answer.id}
                                                    onClick={() => handleRevealAnswer(answer.id, answer.points)}
                                                    disabled={isRevealed}
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: isRevealed ? '#aaa' : '#fff',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        border: '1px solid #ddd',
                                                        cursor: isRevealed ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    <span>{answer.text}</span>
                                                    <span style={{ fontWeight: 'bold' }}>{answer.points} pts</span>
                                                </button>
                                            );
                                        })}
                                        {(finalAnswers[q.id] || []).length === 0 && (
                                            <div style={{ color: '#999', fontSize: '0.9rem' }}>No answers</div>
                                        )}
                                        <button
                                            onClick={() => addNoAnswer(q.id)}
                                            style={{
                                                padding: '8px 12px',
                                                background: '#ff6b6b',
                                                color: 'white',
                                                border: '1px solid #ff5252',
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                                marginTop: '5px'
                                            }}
                                        >
                                            --- (No Answer)
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div style={{
                marginBottom: '20px',
                borderTop: '2px solid #ccc',
                paddingTop: '20px',
                background: gameState.is_final_mode ? '#ffe6cc' : 'transparent',
                padding: '15px',
                borderRadius: '5px'
            }}>
                <h4 style={{ color: '#ff8800' }}>Final Mode Controls</h4>

                {!gameState.is_final_mode ? (
                    <button
                        onClick={goToFinal}
                        style={{
                            background: '#ff8800',
                            color: 'white',
                            fontWeight: 'bold',
                            padding: '12px 24px',
                            fontSize: '1.1rem'
                        }}
                    >
                        🎯 Go to Final
                    </button>
                ) : (
                    <>
                        <div style={{ marginBottom: '15px' }}>
                            <strong>Status:</strong> Final Mode Active |
                            Timer: {gameState.timer_value}s
                            {gameState.timer_running && ' ⏱️ Running...'}
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <h5 style={{ marginBottom: '5px' }}>Timer Controls</h5>
                            <button
                                onClick={() => startTimer(15)}
                                style={{ marginRight: '10px', background: '#4CAF50', color: 'white' }}
                            >
                                Start Timer 15s
                            </button>
                            <button
                                onClick={() => startTimer(20)}
                                style={{ marginRight: '10px', background: '#4CAF50', color: 'white' }}
                            >
                                Start Timer 20s
                            </button>
                            <button
                                onClick={stopTimer}
                                disabled={!gameState.timer_running}
                                style={{ background: '#f44336', color: 'white' }}
                            >
                                Stop Timer
                            </button>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <h5 style={{ marginBottom: '5px' }}>Answer Controls</h5>
                            <button
                                onClick={toggleMaskAnswers}
                                style={{
                                    background: gameState.answers_masked ? '#2196F3' : '#9E9E9E',
                                    color: 'white',
                                    fontWeight: 'bold'
                                }}
                            >
                                {gameState.answers_masked ? '👁️ Show Answers' : '🙈 Mask Answers'}
                            </button>
                        </div>

                        <div style={{ marginTop: '15px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
                            <button
                                onClick={exitFinalMode}
                                style={{ background: '#607D8B', color: 'white' }}
                            >
                                ← Exit Final Mode
                            </button>
                        </div>
                    </>
                )}
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
                                multiplier: 1,
                                is_final_mode: false,
                                timer_value: 0,
                                timer_running: false,
                                answers_masked: false
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
