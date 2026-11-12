export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'طريقة الطلب غير مسموحة' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يرجى تسجيل الدخول لإتمام عملية الشراء' });
  }
  const userToken = authHeader.split(' ')[1];

  const { catalog_id, player_id } = req.body;
  if (!catalog_id) {
    return res.status(400).json({ error: 'معرّف المنتج مطلوب' });
  }

  const RETAIL_URL = process.env.RETAIL_SUPABASE_URL;
  const RETAIL_ANON = process.env.RETAIL_ANON_KEY;
  const RETAIL_SERVICE = process.env.RETAIL_SERVICE_ROLE_KEY;
  const SHIIFTX_URL = process.env.SHIIFTX_API_URL;
  const SHIIFTX_ANON = process.env.SHIIFTX_ANON_KEY;
  const SHIIFTX_KEY = process.env.SHIIFTX_PARTNER_KEY;
  const SHIIFTX_SECRET = process.env.SHIIFTX_PARTNER_SECRET;

  try {
    // 1. التحقق من جلسة الزبون الفعلية عبر Supabase Auth
    const authRes = await fetch(`${RETAIL_URL}/auth/v1/user`, {
      headers: { 'apikey': RETAIL_ANON, 'Authorization': `Bearer ${userToken}` }
    });
    if (!authRes.ok) {
      return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول' });
    }
    const authUser = await authRes.json();
    const userId = authUser.id;

    // 2. جلب بيانات المنتج من كتالوج التجزئة
    const prodRes = await fetch(`${RETAIL_URL}/rest/v1/retail_catalog?id=eq.${catalog_id}`, {
      headers: { 'apikey': RETAIL_SERVICE, 'Authorization': `Bearer ${RETAIL_SERVICE}` }
    });
    const prods = await prodRes.json();
    const product = prods[0];

    if (!product || !product.is_active) {
      return res.status(400).json({ error: 'الباقة المطلوبة غير متوفرة حالياً' });
    }

    if (product.product_type === 'ID' && (!player_id || !String(player_id).trim())) {
      return res.status(400).json({ error: 'يرجى إدخال معرّف اللاعب (Player ID) لإتمام الطلب' });
    }

    // 3. خصم سعر التجزئة ذرّياً من محفظة الزبون قبل الاتصال بالجملة
    const deductRes = await fetch(`${RETAIL_URL}/rest/v1/rpc/retail_deduct_wallet`, {
      method: 'POST',
      headers: {
        'apikey': RETAIL_SERVICE,
        'Authorization': `Bearer ${RETAIL_SERVICE}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_user_id: userId, p_amount: Number(product.retail_price) })
    });

    if (!deductRes.ok) {
      return res.status(400).json({ error: 'رصيد المحفظة غير كافٍ لإتمام الشراء' });
    }
    let remainingBalance = await deductRes.json();

    // 4. استدعاء بوابة SHIIFT X B2B API لتنفيذ الطلب
    const localOrderRef = `RET-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const wholesaleRes = await fetch(SHIIFTX_URL, {
      method: 'POST',
      headers: {
        'apikey': SHIIFTX_ANON,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_api_key: SHIIFTX_KEY,
        p_api_secret: SHIIFTX_SECRET,
        p_product_id: product.shiiftx_product_id,
        p_idempotency_key: `IDEMP-${localOrderRef}`,
        p_player_id: product.product_type === 'ID' ? String(player_id).trim() : null
      })
    });

    const wholesaleData = await wholesaleRes.json();

    // 5. في حال فشل المزود: إرجاع المبلغ فوراً لمحفظة الزبون
    if (!wholesaleRes.ok || wholesaleData.status !== 'success') {
      const refundRes = await fetch(`${RETAIL_URL}/rest/v1/rpc/retail_refund_wallet`, {
        method: 'POST',
        headers: {
          'apikey': RETAIL_SERVICE,
          'Authorization': `Bearer ${RETAIL_SERVICE}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_user_id: userId, p_amount: Number(product.retail_price) })
      });
      remainingBalance = await refundRes.json();

      return res.status(502).json({
        error: wholesaleData.message || 'تعذر تنفيذ الطلب من المزود، تم الحفاظ على رصيد محفظتك',
        remaining_balance: remainingBalance
      });
    }

    // 6. توثيق الطلب وحساب صافي الربح في قاعدة بيانات التجزئة
    const isPending = wholesaleData.fulfillment_status === 'pending';
    const netProfit = Number(product.retail_price) - Number(product.wholesale_cost);

    await fetch(`${RETAIL_URL}/rest/v1/retail_orders`, {
      method: 'POST',
      headers: {
        'apikey': RETAIL_SERVICE,
        'Authorization': `Bearer ${RETAIL_SERVICE}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        local_order_ref: localOrderRef,
        user_id: userId,
        catalog_id: product.id,
        retail_price: product.retail_price,
        wholesale_cost: product.wholesale_cost,
        net_profit: netProfit,
        player_id: product.product_type === 'ID' ? String(player_id).trim() : null,
        delivered_code: wholesaleData.code || null,
        shiiftx_order_ref: wholesaleData.order_ref,
        status: isPending ? 'pending' : 'completed'
      })
    });

    return res.status(200).json({
      success: true,
      fulfillment_status: isPending ? 'pending' : 'completed',
      card_code: wholesaleData.code || null,
      player_id: product.product_type === 'ID' ? String(player_id).trim() : null,
      order_ref: localOrderRef,
      remaining_balance: remainingBalance
    });

  } catch (err) {
    console.error('Retail Buy Error:', err);
    return res.status(500).json({ error: 'حدث خطأ فني أثناء معالجة الطلب' });
  }
}
