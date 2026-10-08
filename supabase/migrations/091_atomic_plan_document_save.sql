-- Compare documents in the request body/database, not in a PostgREST URL filter:
-- a multi-page JSON document can exceed proxy URL limits. RLS remains in force.
CREATE OR REPLACE FUNCTION public.save_plan_document_if_unchanged(
  plan_id uuid,
  expected_document jsonb,
  new_document jsonb
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH saved AS (
    UPDATE public.fortnights AS f
    SET plan_document = new_document
    WHERE f.id = plan_id
      AND f.teacher_id IN (
        SELECT t.id FROM public.teachers AS t WHERE t.auth_id = auth.uid()
      )
      AND f.plan_document IS NOT DISTINCT FROM expected_document
    RETURNING f.id
  )
  SELECT EXISTS (SELECT 1 FROM saved);
$$;

REVOKE ALL ON FUNCTION public.save_plan_document_if_unchanged(uuid, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_plan_document_if_unchanged(uuid, jsonb, jsonb) TO authenticated;
