
import React from 'react';
import type { GameState } from '../hooks/useGameState';
import { questionsAPI } from '../api/questionsAPI';

interface FinalModeBoardProps {
    gameState: GameState;
}

interface FinalQuestion {
    id: string;
    text: string;
    is_final: boolean;
}

interface Answer {
    id: string;
    text: string;
    points: number;
    question_id: string;
}

export const FinalModeBoard: React.FC<FinalModeBoardProps> = ({ gameState }) => {
    const {
        current_round_score,
        timer_running,
        timer_value,
        revealed_answers,
        answers_masked
    } = gameState;

    const [finalQuestions, setFinalQuestions] = React.useState<FinalQuestion[]>([]);
    const [questionAnswers, setQuestionAnswers] = React.useState<Record<string, Answer[]>>({});
    const [loading, setLoading] = React.useState(true);

    // Fetch final questions and their answers
    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const questions = await questionsAPI.getFinalQuestions();
                setFinalQuestions(questions || []);

                // Fetch answers for each question
                const answersMap: Record<string, Answer[]> = {};
                for (const q of questions || []) {
                    const ans = await questionsAPI.getAnswers(q.id);
                    answersMap[q.id] = ans || [];
                }
                setQuestionAnswers(answersMap);
            } catch (error) {
                console.error('Error fetching final questions:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const renderAnswerCell = (answer: Answer | undefined, masked: boolean) => {
        if (!answer) {
            return (
                <>
                    <span style={{ flex: 1, textAlign: 'left' }}>
                        ..................
                    </span>
                    <span>--</span>
                </>
            );
        }

        const isRevealed = revealed_answers.includes(answer.id);

        if (isRevealed && !masked) {
            return (
                <>
                    <span style={{ flex: 1, textAlign: 'left' }}>
                        {answer.text}
                    </span>
                    <span style={{ fontWeight: 'bold', fontSize: '2rem', marginLeft: '20px' }}>
                        {answer.points}
                    </span>
                </>
            );
        } else if (isRevealed && masked) {
            return (
                <>
                    <span style={{ flex: 1, textAlign: 'left' }}>
                        XXXXXXXX
                    </span>
                    <span>XX</span>
                </>
            );
        } else {
            return (
                <>
                    <span style={{ flex: 1, textAlign: 'left' }}>
                        ..................
                    </span>
                    <span>--</span>
                </>
            );
        }
    };

    return (
        <div className="board-container final-mode-board" style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            padding: '20px',
            boxSizing: 'border-box'
        }}>
            {/* Top Section - Round Score and Timer */}
            <div className="final-header" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '40px',
                paddingBottom: '30px',
                borderBottom: '3px solid #333'
            }}>
                {!timer_running ? (
                    <div style={{ fontSize: '7rem', fontWeight: 'bold', marginBottom: '20px' }}>
                        {current_round_score}
                    </div>
                ) : (

                    <div style={{
                        fontSize: '7rem',
                        fontWeight: 'bold',
                        minWidth: '250px',
                        textAlign: 'center'
                    }}>
                        {formatTime(timer_value)}
                    </div>
                )}


            </div>

            {/* Questions as Rows */}
            <div className="final-questions" style={{
                flex: 1,
                overflow: 'auto',
                padding: '0 20px'
            }}>
                {loading ? (
                    <div style={{ textAlign: 'center', fontSize: '2rem' }}>
                        Ładowanie pytań...
                    </div>
                ) : finalQuestions.length === 0 ? (
                    <div style={{ textAlign: 'center', fontSize: '2rem', color: '#666' }}>
                        Brak pytań finałowych
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {finalQuestions.map((question, qIdx) => {
                            const answers = questionAnswers[question.id] || [];

                            // Find which answers are revealed and in what order
                            const revealedForThisQuestion = answers
                                .map(ans => ({
                                    answer: ans,
                                    revealIndex: revealed_answers.indexOf(ans.id)
                                }))
                                .filter(item => item.revealIndex !== -1)
                                .sort((a, b) => a.revealIndex - b.revealIndex);

                            // First revealed = Person A, Second revealed = Person B
                            const answerA = revealedForThisQuestion[0]?.answer;
                            const answerB = revealedForThisQuestion[1]?.answer;

                            return (
                                <div key={question.id} style={{
                                    display: 'flex',
                                    gap: '30px',
                                    alignItems: 'stretch'
                                }}>
                                    {/* Question Number */}
                                    <div style={{
                                        fontSize: '3rem',
                                        fontWeight: 'bold',
                                        minWidth: '60px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        {qIdx + 1}.
                                    </div>

                                    {/* Person A Answer (first revealed) */}
                                    <div style={{
                                        flex: 1,
                                        padding: '20px 30px',
                                        fontSize: '2.5rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        minHeight: '80px',
                                        borderRight: '3px solid #333'
                                    }}>
                                        {renderAnswerCell(answerA, answers_masked)}
                                    </div>

                                    {/* Person B Answer (second revealed) */}
                                    <div style={{
                                        flex: 1,
                                        padding: '20px 30px',
                                        fontSize: '2.5rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        minHeight: '80px'
                                    }}>
                                        {renderAnswerCell(answerB, false)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div >
    );
};
