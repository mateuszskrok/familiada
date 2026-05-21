
import { useState, useEffect } from 'react';
import { questionsAPI } from '../api/questionsAPI';

export interface Question {
    id: string;
    text: string;
    is_final: boolean;
}

export interface Answer {
    id: string;
    question_id: string;
    text: string;
    points: number;
}

export const useRoundData = (roundNumber: number, setId: string | null = null) => {
    const [question, setQuestion] = useState<Question | null>(null);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch all questions to determine which one corresponds to roundNumber
                const allQuestions = await questionsAPI.getQuestions(setId);

                if (allQuestions && allQuestions.length >= roundNumber) {
                    const targetQuestion = allQuestions[roundNumber - 1];
                    setQuestion(targetQuestion as Question);

                    // 2. Fetch answers for this question
                    const answersData = await questionsAPI.getAnswers(targetQuestion.id);
                    setAnswers(answersData as Answer[]);
                } else {
                    setQuestion(null);
                    setAnswers([]);
                }
            } catch (error) {
                console.error('Error fetching round data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [roundNumber, setId]);

    return { question, answers, loading };
};
