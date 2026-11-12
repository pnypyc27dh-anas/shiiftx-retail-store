import { createClient } from '@supabase/supabase-js';

const retailAdmin = createClient(
  process.env.RETAIL_SUPABASE_URL,
  process.env.RETAIL_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return res.status(401).json({ success: false, error: 'جلسة غير صالحة' });
    }

    const { data: { user }, error: authErr } = await retailAdmin.auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).json({ success: false, error: 'تعذر التحقق من هوية الحساب' });
    }

    const { data: pendingOrders } = await retailAdmin
      .from('retail_orders')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (pendingOrders && pendingOrders.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'لديك طلبات شحن قيد التنفيذ حالياً، يرجى انتظار اكتمالها قبل حذف الحساب.'
      });
    }

    await retailAdmin.from('retail_users').delete().eq('id', user.id);

    const { error: delErr } = await retailAdmin.auth.admin.deleteUser(user.id);
    if (delErr) {
      return res.status(500).json({ success: false, error: delErr.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'حدث خطأ أثناء حذف الحساب: ' + err.message });
  }
}
