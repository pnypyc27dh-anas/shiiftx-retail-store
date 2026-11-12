export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { local_order_ref } = req.body;
  if (!local_order_ref) {
    return res.status(400).json({ error: 'رقم الطلب مطلوب' });
  }

  const RETAIL_URL = process.env.RETAIL_SUPABASE_URL;
  const RETAIL_SERVICE = process.env.RETAIL_SERVICE_ROLE_KEY;
  const SHIIFTX_STATUS_URL = process.env.SHIIFTX_STATUS_URL;
  const SHIIFTX_ANON = process.env.SHIIFTX_ANON_KEY;
  const SHIIFTX_KEY = process.env.SHIIFTX_PARTNER_KEY;
  const SHIIFTX_SECRET = process.env.SHIIFTX_PARTNER_SECRET;

  try {
    // 1. جلب الطلب المحلي المعلق
    const orderRes = await fetch(`${RETAIL_URL}/rest/v1/retail_orders?local_order_ref=eq.${local_order_ref}`, {
      headers: { 'apikey': RETAIL_SERVICE, 'Authorization': `Bearer ${RETAIL_SERVICE}` }
    });
    const orders = await orderRes.json();
    const order = orders[0];

    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (order.status !== 'pending') {
      return res.status(200).json({ status: order.status, rejection_reason: order.rejection_reason });
    }

    // 2. الاستعلام من SHIIFT X عن الحالة الأخيرة
    const checkRes = await fetch(SHIIFTX_STATUS_URL, {
      method: 'POST',
      headers: { 'apikey': SHIIFTX_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_api_key: SHIIFTX_KEY,
        p_api_secret: SHIIFTX_SECRET,
        p_order_ref: order.shiiftx_order_ref
      })
    });

    const checkData = await checkRes.json();
    if (!checkRes.ok || checkData.status !== 'success') {
      return res.status(502).json({ error: 'تعذر التحقق من الحالة حالياً' });
    }

    // 3. تحديث الحالة محلياً إذا اكتمل الطلب أو رُفض
    if (checkData.fulfillment_status === 'completed') {
      await fetch(`${RETAIL_URL}/rest/v1/retail_orders?id=eq.${order.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': RETAIL_SERVICE,
          'Authorization': `Bearer ${RETAIL_SERVICE}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'completed' })
      });
      return res.status(200).json({ status: 'completed' });
    }

    if (checkData.fulfillment_status === 'rejected') {
      // تحديث الطلب إلى مرفوض وتصفير الربح
      await fetch(`${RETAIL_URL}/rest/v1/retail_orders?id=eq.${order.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': RETAIL_SERVICE,
          'Authorization': `Bearer ${RETAIL_SERVICE}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'rejected',
          rejection_reason: checkData.rejection_reason || 'تم رفض الطلب من المزود',
          net_profit: 0
        })
      });

      // إرجاع سعر التجزئة كاملاً إلى محفظة الزبون
      await fetch(`${RETAIL_URL}/rest/v1/rpc/retail_refund_wallet`, {
        method: 'POST',
        headers: {
          'apikey': RETAIL_SERVICE,
          'Authorization': `Bearer ${RETAIL_SERVICE}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_user_id: order.user_id, p_amount: Number(order.retail_price) })
      });

      return res.status(200).json({
        status: 'rejected',
        rejection_reason: checkData.rejection_reason
      });
    }

    return res.status(200).json({ status: 'pending' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
