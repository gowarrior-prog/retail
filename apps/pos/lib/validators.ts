import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Product name is required'),
  price: z.number().nonnegative('Price must be non-negative'),
  cost_price: z.number().nullable().optional().default(0),
  profit_margin: z.number().nullable().optional().default(0),
  category: z.string().nullable().optional().default('General'),
  image_url: z.string().nullable().optional(),
  stock: z.number().nullable().optional().default(0),
  barcode: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  odoo_id: z.number().nullable().optional(),
  store_id: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const ProductCreateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Product name is required'),
  price: z.number().nonnegative('Price must be non-negative').default(0),
  cost_price: z.number().nonnegative().optional().default(0),
  profit_margin: z.number().optional().default(0),
  category: z.string().optional().default('General'),
  image_url: z.string().nullable().optional(),
  stock: z.number().int().nonnegative().optional().default(0),
  barcode: z.string().optional(),
  sku: z.string().optional(),
});

export const EmployeeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Employee name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  cnic: z.string().nullable().optional(),
  role: z.string().default('SALES_EXECUTIVE'),
  base_salary: z.number().nonnegative('Base salary must be non-negative'),
  is_deleted: z.boolean().optional().default(false),
  attendance_status: z.string().nullable().optional().default('PRESENT'),
  attendance_notes: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

export const EmployeeCreateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(10, 'Valid phone number required'),
  cnic: z.string().optional(),
  role: z.string().optional().default('SALES_EXECUTIVE'),
  base_salary: z.number().positive('Base salary must be positive'),
  attendance_status: z.string().optional().default('PRESENT'),
});

export const POSOrderItemSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  price: z.number().nonnegative(),
  unit_price: z.number().nonnegative().optional(),
  cost_price: z.number().nonnegative().optional().default(0),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  discount_percentage: z.number().min(0).max(100).optional().default(0),
});

export const POSCheckoutSchema = z.object({
  store_id: z.string().nullable().optional().default('store-1'),
  cashier_name: z.string().nullable().optional().default('Cashier'),
  customer_phone: z.string().nullable().optional(),
  customer_name: z.string().nullable().optional().default('Customer'),
  payment_mode: z.string().default('CASH'),
  tax_percentage: z.number().optional().default(0),
  amount_paid: z.number().nonnegative(),
  amount_tendered: z.number().nonnegative().optional(),
  order_note: z.string().nullable().optional(),
  items: z.array(POSOrderItemSchema).min(1, 'Cart cannot be empty'),
});

export const BillingRecordSchema = z.object({
  id: z.string(),
  invoice_number: z.string(),
  customer_phone: z.string().nullable().optional(),
  total_amount: z.number(),
  discount: z.number().default(0),
  tax: z.number().default(0),
  payment_mode: z.string(),
  cashier_name: z.string().nullable().optional(),
  item_details_json: z.string(),
  billing_date: z.string().nullable().optional(),
});

export const OdooSettingsSchema = z.object({
  company_name: z.string().default('Bilal Cloth and Silk Center'),
  phone: z.string().default('0301-0606643'),
  email: z.string().default('bchnarowal@gmail.com'),
  address: z.string().default('Main Bazar Railway Road, Narowal.'),
  currency: z.string().default('PKR'),
  currency_symbol: z.string().default('Rs.'),
});

export type ProductInput = z.infer<typeof ProductCreateSchema>;
export type EmployeeInput = z.infer<typeof EmployeeCreateSchema>;
export type POSCheckoutInput = z.infer<typeof POSCheckoutSchema>;
