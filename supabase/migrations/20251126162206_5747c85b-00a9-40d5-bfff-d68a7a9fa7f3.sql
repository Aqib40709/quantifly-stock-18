-- Add user_id columns to tables for data isolation
ALTER TABLE public.products ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.suppliers ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.customers ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make user_id NOT NULL for new records (existing records will remain null)
ALTER TABLE public.products ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.suppliers ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.customers ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Staff can manage products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Staff can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can manage customers" ON public.customers;

-- Create new user-scoped RLS policies for products
CREATE POLICY "Users can view their own products" 
ON public.products FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own products" 
ON public.products FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" 
ON public.products FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" 
ON public.products FOR DELETE 
USING (auth.uid() = user_id);

-- Create new user-scoped RLS policies for suppliers
CREATE POLICY "Users can view their own suppliers" 
ON public.suppliers FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own suppliers" 
ON public.suppliers FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suppliers" 
ON public.suppliers FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suppliers" 
ON public.suppliers FOR DELETE 
USING (auth.uid() = user_id);

-- Create new user-scoped RLS policies for customers
CREATE POLICY "Users can view their own customers" 
ON public.customers FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own customers" 
ON public.customers FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers" 
ON public.customers FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers" 
ON public.customers FOR DELETE 
USING (auth.uid() = user_id);

-- Update inventory policies to check product ownership
DROP POLICY IF EXISTS "Authenticated users can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Staff can update inventory" ON public.inventory;

CREATE POLICY "Users can view their own inventory" 
ON public.inventory FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = inventory.product_id 
  AND products.user_id = auth.uid()
));

CREATE POLICY "Users can manage their own inventory" 
ON public.inventory FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = inventory.product_id 
  AND products.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = inventory.product_id 
  AND products.user_id = auth.uid()
));

-- Update sales policies to check product ownership
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Admins and managers can manage sales" ON public.sales;
DROP POLICY IF EXISTS "Staff can create sales" ON public.sales;

CREATE POLICY "Users can view their own sales" 
ON public.sales FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own sales" 
ON public.sales FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own sales" 
ON public.sales FOR UPDATE 
USING (auth.uid() = created_by);

-- Update purchases policies
DROP POLICY IF EXISTS "Authenticated users can view purchases" ON public.purchases;
DROP POLICY IF EXISTS "Staff can manage purchases" ON public.purchases;

CREATE POLICY "Users can view their own purchases" 
ON public.purchases FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own purchases" 
ON public.purchases FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own purchases" 
ON public.purchases FOR UPDATE 
USING (auth.uid() = created_by);

-- Update sales_items and purchase_items policies
DROP POLICY IF EXISTS "Authenticated users can view sales items" ON public.sales_items;
DROP POLICY IF EXISTS "Staff can manage sales items" ON public.sales_items;

CREATE POLICY "Users can view their own sales items" 
ON public.sales_items FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.sales 
  WHERE sales.id = sales_items.sale_id 
  AND sales.created_by = auth.uid()
));

CREATE POLICY "Users can manage their own sales items" 
ON public.sales_items FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.sales 
  WHERE sales.id = sales_items.sale_id 
  AND sales.created_by = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.sales 
  WHERE sales.id = sales_items.sale_id 
  AND sales.created_by = auth.uid()
));

DROP POLICY IF EXISTS "Authenticated users can view purchase items" ON public.purchase_items;
DROP POLICY IF EXISTS "Staff can manage purchase items" ON public.purchase_items;

CREATE POLICY "Users can view their own purchase items" 
ON public.purchase_items FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.purchases 
  WHERE purchases.id = purchase_items.purchase_id 
  AND purchases.created_by = auth.uid()
));

CREATE POLICY "Users can manage their own purchase items" 
ON public.purchase_items FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.purchases 
  WHERE purchases.id = purchase_items.purchase_id 
  AND purchases.created_by = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.purchases 
  WHERE purchases.id = purchase_items.purchase_id 
  AND purchases.created_by = auth.uid()
));

-- Update alerts policies
DROP POLICY IF EXISTS "Authenticated users can view alerts" ON public.inventory_alerts;
DROP POLICY IF EXISTS "Staff can update alerts" ON public.inventory_alerts;

CREATE POLICY "Users can view their own alerts" 
ON public.inventory_alerts FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = inventory_alerts.product_id 
  AND products.user_id = auth.uid()
));

CREATE POLICY "Users can update their own alerts" 
ON public.inventory_alerts FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = inventory_alerts.product_id 
  AND products.user_id = auth.uid()
));