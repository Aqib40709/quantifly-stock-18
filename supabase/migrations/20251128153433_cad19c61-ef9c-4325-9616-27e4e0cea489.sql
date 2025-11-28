-- Add DELETE policy for purchases table
CREATE POLICY "Users can delete their own purchases" 
ON public.purchases 
FOR DELETE 
USING (auth.uid() = created_by);

-- Add CASCADE delete for purchase_items when purchase is deleted
ALTER TABLE public.purchase_items DROP CONSTRAINT IF EXISTS purchase_items_purchase_id_fkey;
ALTER TABLE public.purchase_items 
ADD CONSTRAINT purchase_items_purchase_id_fkey 
FOREIGN KEY (purchase_id) 
REFERENCES public.purchases(id) 
ON DELETE CASCADE;