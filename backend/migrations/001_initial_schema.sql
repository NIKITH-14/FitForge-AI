-- ============================================================
-- AI Fitness Platform — PostgreSQL Migration
-- Run: psql -U postgres -d fitness_platform -f migration.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  height_cm FLOAT,
  weight_kg FLOAT,
  age INTEGER,
  gender VARCHAR(10) CHECK (gender IN ('male','female')),
  fitness_goal VARCHAR(20) CHECK (fitness_goal IN ('strength','aesthetic','fat_loss')),
  has_completed_intro BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BMI RECORDS
CREATE TABLE IF NOT EXISTS bmi_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bmi FLOAT NOT NULL,
  category VARCHAR(20) NOT NULL,
  ideal_weight_kg FLOAT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NUTRITION TARGETS (one per user, upserted)
CREATE TABLE IF NOT EXISTS nutrition_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bmr FLOAT NOT NULL,
  tdee FLOAT NOT NULL,
  daily_calories INTEGER NOT NULL,
  protein_g FLOAT NOT NULL,
  fat_g FLOAT NOT NULL,
  carbs_g FLOAT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WORKOUT PLANS
CREATE TABLE IF NOT EXISTS workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal VARCHAR(20) NOT NULL,
  days_per_week INTEGER NOT NULL,
  plan_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MACHINE SESSIONS
CREATE TABLE IF NOT EXISTS machine_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  machine_id VARCHAR(50),
  exercise_name VARCHAR(100) NOT NULL,
  rep_count INTEGER NOT NULL DEFAULT 0,
  resistance_kg FLOAT NOT NULL DEFAULT 0,
  time_under_tension_s FLOAT NOT NULL DEFAULT 0,
  duration_s INTEGER NOT NULL DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FORM ANALYSES
CREATE TABLE IF NOT EXISTS form_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES machine_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joint_angles_json JSONB,
  errors_json JSONB,
  avg_form_score FLOAT CHECK (avg_form_score >= 0 AND avg_form_score <= 100),
  rep_scores_json JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI RECOMMENDATIONS
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES machine_sessions(id) ON DELETE SET NULL,
  recommendation_text TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FOOD LOGS
CREATE TABLE IF NOT EXISTS food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type VARCHAR(20) NOT NULL DEFAULT 'snack' CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  items_json JSONB NOT NULL DEFAULT '[]',
  total_calories FLOAT NOT NULL DEFAULT 0,
  total_protein FLOAT NOT NULL DEFAULT 0,
  total_fat FLOAT NOT NULL DEFAULT 0,
  total_carbs FLOAT NOT NULL DEFAULT 0,
  image_url TEXT
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_bmi_user ON bmi_records(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON machine_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_form_session ON form_analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_recs_user ON ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_food_user_date ON food_logs(user_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_plans_user ON workout_plans(user_id);
