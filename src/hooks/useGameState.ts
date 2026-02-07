
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export interface GameState {
    id: number;
    current_round: number;
    revealed_answers: any[]; // refined later based on usage
    multiplier: number;
    current_round_score: number;
    team_a_score: number;
    team_b_score: number;
    team_a_strikes: number;
    team_b_strikes: number;
    team_a_name: string;
    team_b_name: string;
    is_final_mode: boolean;
    timer_value: number;
    timer_running: boolean;
    answers_masked: boolean;
}

export const useGameState = () => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Initial fetch
        const fetchState = async () => {
            try {
                const { data, error } = await supabase
                    .from('game_state')
                    .select('*')
                    .eq('id', 1)
                    .single();

                if (error) throw error;
                setGameState(data as GameState);
            } catch (err: any) {
                console.error('Error fetching game state:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchState();

        // Realtime subscription
        const channel = supabase
            .channel('game_state_subscription')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'game_state', filter: 'id=eq.1' },
                (payload) => {
                    setGameState(payload.new as GameState);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return { gameState, loading, error };
};
