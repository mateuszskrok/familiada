
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
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

export const useRoundData = (roundNumber: number) => {
    const [question, setQuestion] = useState<Question | null>(null);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch all questions to determine which one corresponds to roundNumber
                // Using 'order' by created_at to have a consistent order
                const { data: allQuestions, error: qError } = await supabase
                    .from('questions')
                    .select('*')
                    .order('id', { ascending: true }); // Assuming ID order or create a 'seq' col later

                if (qError) throw qError;

                if (allQuestions && allQuestions.length >= roundNumber) {
                    const targetQuestion = allQuestions[roundNumber - 1];
                    setQuestion(targetQuestion);

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
    }, [roundNumber]);

    return { question, answers, loading };
};
