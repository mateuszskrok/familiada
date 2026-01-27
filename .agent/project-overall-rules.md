We are making arcade game Familiada.

You are Senior TS developer. Framework React + Vite + Supabase

Central component is Board.tsx , it is responsible for displaying the board. 
src/
  ├── components/
  │    ├── Board.tsx       // Główna tablica wyników
  │    ├── AdminControl.tsx // Przyciski dla prowadzącego
  │    ├── StrikeOverlay.tsx // Animowane "X"
  ├── hooks/
  │    └── useGameState.ts // Custom hook do subskrypcji Supabase Realtime
  ├── views/
  │    ├── DisplayView.tsx
  │    └── AdminView.tsx
  └── supabaseClient.ts


  Database schema:
  
  in supabase
  -- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.answers (
  id uuid NOT NULL,
  question_id uuid NOT NULL,
  text text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  CONSTRAINT answers_pkey PRIMARY KEY (id),
  CONSTRAINT answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id)
);
CREATE TABLE public.game_state (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  current_round integer NOT NULL CHECK (current_round >= 1 AND current_round <= 7),
  revealed_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  multiplier integer NOT NULL DEFAULT 1 CHECK (multiplier >= 1),
  current_round_score integer NOT NULL DEFAULT 0,
  team_a_score integer NOT NULL DEFAULT 0,
  team_b_score integer NOT NULL DEFAULT 0,
  team_a_strikes integer NOT NULL DEFAULT 0,
  team_b_strikes integer NOT NULL DEFAULT 0,
  is_final_mode boolean NOT NULL DEFAULT false,
  CONSTRAINT game_state_pkey PRIMARY KEY (id)
);
CREATE TABLE public.questions (
  id uuid NOT NULL,
  text text NOT NULL,
  is_final boolean NOT NULL DEFAULT false,
  CONSTRAINT questions_pkey PRIMARY KEY (id)
);