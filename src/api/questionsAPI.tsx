
import { supabase } from '../supabaseClient';

export const questionsAPI = {
    getSets: async () => {
        const { data, error } = await supabase
            .from('sets')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    createSet: async (name: string) => {
        const { data, error } = await supabase
            .from('sets')
            .insert([{ name }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    addQuestion: async (text: string, isFinal: boolean = false, setId?: string | null) => {
        const { data, error } = await supabase
            .from('questions')
            .insert([{ text, is_final: isFinal }])
            .select()
            .single();

        if (error) throw error;

        if (setId && data) {
            const { error: qsError } = await supabase
                .from('question_sets')
                .insert([{ question_id: data.id, set_id: setId }]);
            if (qsError) {
                console.error('Error assigning question to set:', qsError);
                // We won't throw here to avoid breaking if just the relation fails, but ideally it should be handled
            }
        }

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

    getQuestions: async (setId?: string | null) => {
        if (setId) {
            const { data: qsData, error: qsError } = await supabase
                .from('question_sets')
                .select('question_id')
                .eq('set_id', setId);
            if (qsError) throw qsError;
            const qIds = qsData.map(qs => qs.question_id);
            if (qIds.length === 0) return [];

            const { data, error } = await supabase
                .from('questions')
                .select('*')
                .in('id', qIds)
                .order('id', { ascending: true });
            if (error) throw error;
            return data;
        }

        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        return data;
    },

    getFinalQuestions: async (setId?: string | null) => {
        if (setId) {
            const { data: qsData, error: qsError } = await supabase
                .from('question_sets')
                .select('question_id')
                .eq('set_id', setId);
            if (qsError) throw qsError;
            const qIds = qsData.map(qs => qs.question_id);
            if (qIds.length === 0) return [];

            const { data, error } = await supabase
                .from('questions')
                .select('*')
                .eq('is_final', true)
                .in('id', qIds)
                .order('id', { ascending: true });
            if (error) throw error;
            return data;
        }

        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('is_final', true)
            .order('id', { ascending: true });

        if (error) throw error;
        return data;
    }
};
