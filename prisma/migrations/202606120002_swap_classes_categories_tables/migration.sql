-- Alinha nomes físicos das tabelas com o cadastro do frontend:
--   Classes contábeis  → budget_classes
--   Categorias         → budget_categories

ALTER TABLE public.budget_categories RENAME TO budget_taxonomy_swap_tmp;
ALTER TABLE public.budget_classes RENAME TO budget_categories;
ALTER TABLE public.budget_taxonomy_swap_tmp RENAME TO budget_classes;

ALTER TABLE public.budget_categories RENAME COLUMN category_id TO class_id;

ALTER TABLE public.budget_categories
  RENAME CONSTRAINT budget_classes_category_id_fkey TO budget_categories_class_id_fkey;

ALTER INDEX public.budget_classes_category_id_code_key
  RENAME TO budget_categories_class_id_code_key;
