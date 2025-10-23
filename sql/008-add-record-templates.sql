-- Migration: Create record_templates table for reusable record templates
-- Created: 2025-09-XX
-- Description: Store per-user record templates mirroring records structure without occurred_at

CREATE TABLE IF NOT EXISTS public.record_templates (
  template_id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id BIGINT REFERENCES public.resources(resource_id) ON DELETE SET NULL,
  form_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  body_md TEXT,
  duration_min INTEGER CHECK (duration_min >= 0),
  effective_duration_min INTEGER CHECK (
    effective_duration_min >= 0 AND
    (duration_min IS NULL OR effective_duration_min <= duration_min)
  ),
  mood TEXT,
  difficulty SMALLINT CHECK (difficulty BETWEEN 1 AND 5),
  focus SMALLINT CHECK (focus BETWEEN 1 AND 5),
  energy SMALLINT CHECK (energy BETWEEN 1 AND 5),
  privacy privacy_level NOT NULL DEFAULT 'private',
  auto_confidence NUMERIC(4, 2) CHECK (auto_confidence BETWEEN 0 AND 1),
  assets JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.record_templates IS 'Reusable per-user learning record templates';
COMMENT ON COLUMN public.record_templates.form_type IS '学习形式类型代码 - 与 user_form_types.type_code 对齐';

-- Indexes for user-scoped access and search
CREATE INDEX IF NOT EXISTS idx_record_templates_user_created
  ON public.record_templates (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_record_templates_title_trgm
  ON public.record_templates
  USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_record_templates_body_trgm
  ON public.record_templates
  USING GIN (body_md gin_trgm_ops);

-- Updated-at trigger
DROP TRIGGER IF EXISTS trg_record_templates_updated ON public.record_templates;
CREATE TRIGGER trg_record_templates_updated
BEFORE UPDATE ON public.record_templates
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Row Level Security (templates are private to their owners)
ALTER TABLE public.record_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "record_templates_owner_rw"
  ON public.record_templates
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
