import React from 'react';
import { supabase } from '../supabaseClient';
import type { GameState } from '../hooks/useGameState';
import { useRoundData } from '../hooks/useRoundData';
import { questionsAPI } from '../api/questionsAPI';

interface AdminControlProps {
    gameState: GameState;
}

const FALLBACK_JOKES = [
    "– Jak nazywa się najszybsza potrawa?\n– Zapieprzanka!",
    "– Dlaczego ryby żyją w wodzie?\n– Żeby koty nie miały tak łatwo.",
    "– Co robi rolnik na polu?\n– Uprawia... kulturę fizyczną!",
    "– Co mówi elektryk do kolegi?\n– Bądźmy w kontakcie!",
    "– Dlaczego pingwiny nie latają?\n– Bo nie stać ich na bilety lotnicze.",
    "– Jak nazywa się żona ginekologa?\n– Poczciwa kobieta.",
    "– Co robi lekarz w lodówce?\n– Operuje zamrażalnik!",
    "– Jak nazywa się pies bez nóg?\n– Nie nazywa się, i tak nie przyjdzie.",
    "– Dlaczego marchewka jest pomarańczowa?\n– Bo gdyby była zielona, byłaby ogórkiem!",
    "– Co robi dyrektor na lekcji fizyki?\n– Przewodzi!"
];

export const AdminControl: React.FC<AdminControlProps> = ({ gameState }) => {
    const { question, answers, loading: roundLoading } = useRoundData(gameState.current_round, gameState.current_set_id);
    const [finalQuestions, setFinalQuestions] = React.useState<any[]>([]);
    const [finalAnswers, setFinalAnswers] = React.useState<Record<string, any[]>>({});
    const [loadingFinal, setLoadingFinal] = React.useState(false);
    const [sets, setSets] = React.useState<{ id: string, name: string }[]>([]);
    const [jokes, setJokes] = React.useState<{ id: string | number, content: string }[]>([]);
    const [currentJoke, setCurrentJoke] = React.useState<string | null>(null);

    React.useEffect(() => {
        // Set initial random joke from fallbacks
        const randomIdx = Math.floor(Math.random() * FALLBACK_JOKES.length);
        setCurrentJoke(FALLBACK_JOKES[randomIdx]);

        const fetchJokes = async () => {
            try {
                const { data, error } = await supabase
                    .from('jokes')
                    .select('id, content');
                if (error) {
                    console.error('Error fetching jokes from DB:', error);
                } else if (data && data.length > 0) {
                    setJokes(data);
                    // Select a random joke from the newly loaded database jokes
                    const randomIdxDb = Math.floor(Math.random() * data.length);
                    setCurrentJoke(data[randomIdxDb].content);
                }
            } catch (err) {
                console.error('Failed to fetch jokes:', err);
            }
        };
        fetchJokes();
    }, []);

    const handleDrawJoke = () => {
        const jokePool = jokes.length > 0 ? jokes.map(j => j.content) : FALLBACK_JOKES;
        if (jokePool.length > 0) {
            const randomIdx = Math.floor(Math.random() * jokePool.length);
            setCurrentJoke(jokePool[randomIdx]);
        }
    };

    React.useEffect(() => {
        const loadSets = async () => {
            try {
                const data = await questionsAPI.getSets();
                setSets(data);
            } catch (error) {
                console.error('Error loading sets:', error);
            }
        };
        loadSets();
    }, []);

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
                    const questions = await questionsAPI.getFinalQuestions(gameState.current_set_id);
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

            {/* Jokes Section - Karol Strasburger's Joke Corner */}
            <div style={{
                marginBottom: '20px',
                padding: '15px',
                background: 'linear-gradient(135deg, #fff9e6 0%, #fff0cc 100%)',
                border: '2px solid #ffcc00',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    fontSize: '4rem',
                    opacity: 0.1,
                    userSelect: 'none'
                }}>
                    🎭
                </div>
                <h4 style={{ margin: '0 0 10px 0', color: '#b38600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🎭</span> Kącik Suchego Żartu Prowadzącego
                </h4>
                <div style={{
                    background: '#fff',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #ffe0b3',
                    minHeight: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontStyle: 'italic',
                    whiteSpace: 'pre-line',
                    textAlign: 'center',
                    fontSize: '1.05rem',
                    color: '#4d3d00',
                    lineHeight: '1.4',
                    marginBottom: '10px'
                }}>
                    {currentJoke}
                </div>
                <button
                    onClick={handleDrawJoke}
                    style={{
                        background: '#ffcc00',
                        color: '#4d3d00',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'background 0.2s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#e6b800'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#ffcc00'}
                >
                    🔄 Losuj suchara
                </button>
            </div>

            {/* Set Selection */}
            <div style={{ marginBottom: '20px', padding: '15px', background: '#fff', border: '2px solid #002b5e', borderRadius: '5px' }}>
                <h4 style={{ marginBottom: '10px' }}>Aktywny Zestaw Pytań</h4>
                <select
                    value={gameState.current_set_id || ''}
                    onChange={(e) => updateState({ current_set_id: e.target.value || null })}
                    style={{ width: '100%', padding: '8px', fontSize: '1rem' }}
                >
                    <option value="">Wszystkie pytania</option>
                    {sets.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
            </div>

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
