// scripts/create-coupons-table.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createTable() {
  // Supabase 不支援直接執行 SQL，需用 REST API 或 SQL Editor 建表
  // 這裡用 REST API 建表（PostgREST）
  // 若無法執行，請用 SQL Editor 執行建表語法
  console.log('請在 Supabase SQL Editor 執行以下 SQL 建表語法：');
  console.log(`\ncreate table public.coupons (
  id integer primary key,
  title text,
  merchant_name text,
  description text,
  tracking_url text,
  code text,
  start_date text,
  end_date text,
  image_url text,
  is_active boolean
);\n`);
}

createTable();
