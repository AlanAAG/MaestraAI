-- New materials generated after the provider migration should carry the correct source.
ALTER TABLE public.materials ALTER COLUMN generated_by SET DEFAULT 'openai';
