
import React from 'react';
import type { GameState } from '../hooks/useGameState';
import { useRoundData } from '../hooks/useRoundData';
import { FinalModeBoard } from './FinalModeBoard';
import strikeSound from '../assets/strike.mp3';
import okSound from '../assets/ok.mp3';
import roundSound from '../assets/round.mp3';

interface BoardProps {
    gameState: GameState;
}

export const Board: React.FC<BoardProps> = ({ gameState }) => {
    const {
        current_round,
        team_a_score,
        team_b_score,
        current_round_score,
        team_a_strikes,
        team_b_strikes, // eslint-disable-line @typescript-eslint/no-unused-vars
        multiplier,
        revealed_answers
    } = gameState;

    const { answers, loading } = useRoundData(current_round);

    // Audio refs to prevent partial playback
    const strikeAudioRef = React.useRef<HTMLAudioElement | null>(null);
    const okAudioRef = React.useRef<HTMLAudioElement | null>(null);
    const roundAudioRef = React.useRef<HTMLAudioElement | null>(null);

    // Preload audio files on mount
    React.useEffect(() => {
        strikeAudioRef.current = new Audio(strikeSound);
        okAudioRef.current = new Audio(okSound);
        roundAudioRef.current = new Audio(roundSound);

        // Preload
        strikeAudioRef.current.load();
        okAudioRef.current.load();
        roundAudioRef.current.load();

        return () => {
            // Cleanup on unmount
            if (strikeAudioRef.current) {
                strikeAudioRef.current.pause();
                strikeAudioRef.current = null;
            }
            if (okAudioRef.current) {
                okAudioRef.current.pause();
                okAudioRef.current = null;
            }
            if (roundAudioRef.current) {
                roundAudioRef.current.pause();
                roundAudioRef.current = null;
            }
        };
    }, []);

    // Sound effect for strikes
    const prevStrikesRef = React.useRef(0);
    const prevRevealedAnswersRef = React.useRef(0);
    const currentRoundRef = React.useRef(current_round);

    React.useEffect(() => {
        const currentTotal = team_a_strikes + team_b_strikes;
        if (currentTotal > prevStrikesRef.current && strikeAudioRef.current) {
            // Reset and play
            strikeAudioRef.current.currentTime = 0;
            strikeAudioRef.current.play().catch(e => console.log('Audio play failed', e));
        }
        prevStrikesRef.current = currentTotal;
    }, [team_a_strikes, team_b_strikes]);

    React.useEffect(() => {
        const currentTotal = revealed_answers.length;
        if (currentTotal > prevRevealedAnswersRef.current) {
            // Check if the last added item is a NO_ANSWER marker
            const lastItem = revealed_answers[revealed_answers.length - 1];
            const isNoAnswer = typeof lastItem === 'string' && lastItem.startsWith('NO_ANSWER_');

            if (isNoAnswer && strikeAudioRef.current) {
                // Play strike sound for NO_ANSWER
                strikeAudioRef.current.currentTime = 0;
                strikeAudioRef.current.play().catch(e => console.log('Audio play failed', e));
            } else if (okAudioRef.current) {
                // Play ok sound for correct answer
                okAudioRef.current.currentTime = 0;
                okAudioRef.current.play().catch(e => console.log('Audio play failed', e));
            }
        }
        prevRevealedAnswersRef.current = currentTotal;
    }, [revealed_answers]);

    React.useEffect(() => {
        const currentRound = current_round;
        if (currentRound > currentRoundRef.current && roundAudioRef.current) {
            // Reset and play
            roundAudioRef.current.currentTime = 0;
            roundAudioRef.current.play().catch(e => console.log('Audio play failed', e));
        }
        currentRoundRef.current = currentRound;
    }, [current_round]);



    // Sort answers by points descending (already done in API/Hook ideally, but ensuring here)
    // Actually API does it.

    // Create a fixed list of slots (e.g. 6) or just use the number of answers.
    // Familiada usually has fixed slots, but we'll use answers length.

    // Render final mode board if in final mode
    if (gameState.is_final_mode) {
        return <FinalModeBoard gameState={gameState} />;
    }

    return (
        <div className="board-container" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            padding: '20px',
            boxSizing: 'border-box'
        }}>
            {/* Team A - Left Side */}
            <div className="team-score" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                fontSize: '3rem',
                borderRight: '2px solid #333',
                height: '100%',
                justifyContent: 'top'
            }}>
                <div style={{ marginBottom: '10px' }}>{gameState.team_a_name || 'Team A'}</div>
                <div style={{ fontSize: '6rem', fontWeight: 'bold' }}>{team_a_score}</div>
                <div style={{
                    fontSize: '9rem',
                    marginTop: '10px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                }}>
                    {Array.from({ length: team_a_strikes }).map((_, i) => (
                        <div key={i} style={{ lineHeight: '1' }}>X</div>
                    ))}
                </div>
            </div>

            {/* Center Board - Answers & Round Info */}
            <div className="center-board" style={{
                flex: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '0 40px'
            }}>
                <div className="round-info" style={{
                    fontSize: '2rem',
                    marginBottom: '40px',
                    textAlign: 'center'
                }}>
                    <div>Runda: {current_round} <span style={{ fontSize: '1.5rem' }}>(x{multiplier})</span></div>
                    <div style={{ fontSize: '6rem', marginTop: '10px' }}>{current_round_score}</div>
                </div>

                <div className="answers-board" style={{
                    width: '100%',
                    padding: '30px',
                    minHeight: '400px',
                }}>
                    <ul style={{ listStyle: 'none', padding: 0, width: '100%' }}>
                        {loading && <li style={{ textAlign: 'center' }}>Loading round data...</li>}

                        {!loading && answers.map((ans, idx) => {
                            const isRevealed = revealed_answers.includes(ans.id);
                            return (
                                <li key={ans.id} style={{
                                    margin: '10px 0',
                                    padding: '15px 30px',
                                    fontSize: '3rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    height: '70px',
                                    alignItems: 'center'
                                }}>
                                    <span>{idx + 1}</span>
                                    {isRevealed ? (
                                        <>
                                            <span style={{ flex: 1, textAlign: 'left', marginLeft: '30px' }}>{ans.text}</span>
                                            <span style={{ fontWeight: 'bold' }}>{ans.points}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ flex: 1, textAlign: 'left', marginLeft: '30px' }}>
                                                ..................
                                            </span>
                                            <span>--</span>
                                        </>
                                    )}
                                </li>
                            );
                        })}

                        {!loading && answers.length === 0 && (
                            <li style={{ textAlign: 'center', color: '#666', fontSize: '1.5rem', padding: '40px' }}>
                            </li>
                        )}
                    </ul>
                </div>
            </div>

            {/* Team B - Right Side */}
            <div className="team-score" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                fontSize: '3rem',
                borderLeft: '2px solid #333',
                height: '100%',
                justifyContent: 'top'
            }}>
                <div style={{ marginBottom: '10px' }}>{gameState.team_b_name || 'Team B'}</div>
                <div style={{ fontSize: '6rem', fontWeight: 'bold' }}>{team_b_score}</div>
                <div style={{
                    fontSize: '9rem',
                    marginTop: '10px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                }}>
                    {Array.from({ length: team_b_strikes }).map((_, i) => (
                        <div key={i} style={{ lineHeight: '1' }}>X</div>
                    ))}
                </div>
            </div>
        </div>
    );
};
