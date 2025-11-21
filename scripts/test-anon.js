const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase
    .from('active_coupons_range')
    .select('*')
    .limit(5);

  console.log('error =', error);
  console.log('rows =', data?.length);
  console.log('sample =', data?.map(r => ({
    id: r.id,
    title: r.title,
    merchant_name: r.merchant_name,
  })));
}

test();
