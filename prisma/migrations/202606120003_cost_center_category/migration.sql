-- Centro de custo vinculado à categoria (budget_categories)
ALTER TABLE public.cost_centers ADD COLUMN category_id UUID NOT NULL;

ALTER TABLE public.cost_centers
  ADD CONSTRAINT cost_centers_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.budget_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.cost_centers ALTER COLUMN company_id DROP NOT NULL;

DROP INDEX IF EXISTS public.cost_centers_company_id_code_key;
CREATE UNIQUE INDEX cost_centers_category_id_code_key ON public.cost_centers(category_id, code);

CREATE INDEX cost_centers_category_id_idx ON public.cost_centers(category_id);
