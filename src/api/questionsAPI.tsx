
import { supabase } from '../supabaseClient';

export const questionsAPI = {
    addQuestion: async (text: string, isFinal: boolean = false) => {
        const { data, error } = await supabase
            .from('questions')
            .insert([{ text, is_final: isFinal }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    updateQuestion: async (questionId: string, text: string, isFinal: boolean = false) => {
        const { data, error } = await supabase
            .from('questions')
            .update({ text, is_final: isFinal })
            .eq('id', questionId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    addAnswer: async (questionId: string, text: string, points: number) => {
        const { data, error } = await supabase
            .from('answers')
            .insert([{ question_id: questionId, text, points }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    deleteAnswer: async (answerId: string) => {
        const { error } = await supabase
            .from('answers')
            .delete()
            .eq('id', answerId);

        if (error) throw error;
    },

    revealAnswer: async (answerId: string) => {
        // 1. Get current state
        const { data: currentState, error: fetchError } = await supabase
            .from('game_state')
            .select('revealed_answers')
            .eq('id', 1)
            .single();

        if (fetchError) throw fetchError;

        const currentRevealed = (currentState?.revealed_answers as string[]) || [];

        // Prevent duplicate reveal
        if (!currentRevealed.includes(answerId)) {
            const { error: updateError } = await supabase
                .from('game_state')
                .update({ revealed_answers: [...currentRevealed, answerId] })
                .eq('id', 1);

            if (updateError) throw updateError;
        }
    },

    getAnswers: async (questionId: string) => {
        const { data, error } = await supabase
            .from('answers')
            .select('*')
            .eq('question_id', questionId)
            .order('points', { ascending: false });

        if (error) throw error;
        return data;
    },

    getQuestions: async () => {
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        return data;
    },

    getFinalQuestions: async () => {
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('is_final', true)
            .order('id', { ascending: true });

        if (error) throw error;
        return data;
    }
};
