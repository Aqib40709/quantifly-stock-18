-- Fix the foreign key constraint for sales table
-- The issue is that sales.created_by should reference auth.users, not profiles
-- First drop the existing constraint
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_created_by_fkey;

-- Add the correct foreign key constraint to auth.users
ALTER TABLE public.sales 
ADD CONSTRAINT sales_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Do the same for purchases table
ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS purchases_created_by_fkey;

ALTER TABLE public.purchases 
ADD CONSTRAINT purchases_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;