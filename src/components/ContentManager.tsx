
import React, { useState, useEffect } from 'react';
import { questionsAPI } from '../api/questionsAPI';
import type { Question, Answer } from '../hooks/useRoundData';

export const ContentManager: React.FC = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Answer[]>([]);

    // Form States
    const [newQuestionText, setNewQuestionText] = useState('');
    const [newQuestionIsFinal, setNewQuestionIsFinal] = useState(false);
    const [newAnswerText, setNewAnswerText] = useState('');
    const [newAnswerPoints, setNewAnswerPoints] = useState('');

    const loadQuestions = async () => {
        try {
            const data = await questionsAPI.getQuestions();
            setQuestions(data as Question[]);
        } catch (error) {
            console.error('Error loading questions:', error);
        }
    };

    const loadAnswers = async (qId: string) => {
        try {
            const data = await questionsAPI.getAnswers(qId);
            setAnswers(data as Answer[]);
        } catch (error) {
            console.error('Error loading answers:', error);
        }
    };

    useEffect(() => {
        loadQuestions();
    }, []);

    useEffect(() => {
        if (selectedQuestionId) {
            loadAnswers(selectedQuestionId);
        } else {
            setAnswers([]);
        }
    }, [selectedQuestionId]);

    const handleAddQuestion = async () => {
        if (!newQuestionText.trim()) return;
        try {
            await questionsAPI.addQuestion(newQuestionText, newQuestionIsFinal);
            setNewQuestionText('');
            setNewQuestionIsFinal(false);
            loadQuestions();
        } catch (error) {
            alert('Failed to add question');
            console.error(error);
        }
    };

    const handleToggleIsFinal = async (questionId: string, currentValue: boolean) => {
        try {
            const question = questions.find(q => q.id === questionId);
            if (question) {
                await questionsAPI.updateQuestion(questionId, question.text, !currentValue);
                loadQuestions();
            }
        } catch (error) {
            alert('Failed to update question');
            console.error(error);
        }
    };

    const handleAddAnswer = async () => {
        if (!selectedQuestionId || !newAnswerText.trim() || !newAnswerPoints) return;
        try {
            await questionsAPI.addAnswer(selectedQuestionId, newAnswerText, parseInt(newAnswerPoints));
            setNewAnswerText('');
            setNewAnswerPoints('');
            loadAnswers(selectedQuestionId);
        } catch (error) {
            alert('Failed to add answer');
            console.error(error);
        }
    };

    const handleDeleteAnswer = async (answerId: string) => {
        if (!confirm('Delete this answer?')) return;
        try {
            await questionsAPI.deleteAnswer(answerId);
            if (selectedQuestionId) loadAnswers(selectedQuestionId);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div style={{ padding: '20px', background: '#fff', color: '#000' }}>
            <h2>Content Manager</h2>

            {/* Add Question */}
            <div style={{ marginBottom: '20px', padding: '10px', background: '#f9f9f9' }}>
                <h4>Add New Question</h4>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        value={newQuestionText}
                        onChange={e => setNewQuestionText(e.target.value)}
                        placeholder="Question text"
                        style={{ flex: 1, padding: '5px' }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                        <input
                            type="checkbox"
                            checked={newQuestionIsFinal}
                            onChange={e => setNewQuestionIsFinal(e.target.checked)}
                        />
                        Final Question
                    </label>
                    <button onClick={handleAddQuestion} style={{ padding: '5px 10px' }}>Add Question</button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
                {/* Questions List */}
                <div style={{ flex: 1, maxHeight: '500px', overflowY: 'auto', border: '1px solid #ddd' }}>
                    <h4 style={{ padding: '10px', margin: 0, background: '#eee' }}>Select Question</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {questions.map((q, idx) => (
                            <li
                                key={q.id}
                                style={{
                                    padding: '10px',
                                    borderBottom: '1px solid #eee',
                                    background: selectedQuestionId === q.id ? '#e0f0ff' : 'white',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}
                            >
                                <div
                                    onClick={() => setSelectedQuestionId(q.id)}
                                    style={{ flex: 1, cursor: 'pointer' }}
                                >
                                    <strong>{idx + 1}.</strong> {q.text}
                                    {q.is_final && (
                                        <span style={{
                                            marginLeft: '10px',
                                            padding: '2px 8px',
                                            background: '#ff8800',
                                            color: 'white',
                                            borderRadius: '3px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold'
                                        }}>
                                            FINAL
                                        </span>
                                    )}
                                </div>
                                <label
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={q.is_final || false}
                                        onChange={() => handleToggleIsFinal(q.id, q.is_final || false)}
                                    />
                                    Final
                                </label>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Answers Management */}
                <div style={{ flex: 2, padding: '10px', border: '1px solid #ddd' }}>
                    {selectedQuestionId ? (
                        <>
                            <h4>Manage Answers for:</h4>
                            <p><em>{questions.find(q => q.id === selectedQuestionId)?.text}</em></p>

                            <div style={{
                                marginBottom: '15px',
                                padding: '10px',
                                background: '#e8f5e9',
                                border: '2px solid #4caf50',
                                borderRadius: '5px',
                                fontWeight: 'bold',
                                fontSize: '1.1rem'
                            }}>
                                Total Points: {answers.reduce((sum, ans) => sum + ans.points, 0)}
                            </div>

                            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                                <input
                                    value={newAnswerText}
                                    onChange={e => setNewAnswerText(e.target.value)}
                                    placeholder="Answer text"
                                    style={{ flex: 2, padding: '5px' }}
                                />
                                <input
                                    type="number"
                                    value={newAnswerPoints}
                                    onChange={e => setNewAnswerPoints(e.target.value)}
                                    placeholder="Points"
                                    style={{ flex: 1, padding: '5px' }}
                                />
                                <button onClick={handleAddAnswer}>Add</button>
                            </div>

                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {answers.map(ans => (
                                    <li key={ans.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px', borderBottom: '1px solid #eee' }}>
                                        <span>{ans.text} ({ans.points} pts)</span>
                                        <button onClick={() => handleDeleteAnswer(ans.id)} style={{ color: 'red' }}>Delete</button>
                                    </li>
                                ))}
                                {answers.length === 0 && <li>No answers yet.</li>}
                            </ul>
                        </>
                    ) : (
                        <p>Select a question to manage answers.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
