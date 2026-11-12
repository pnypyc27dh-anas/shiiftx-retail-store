// =========================================================================
// إعدادات مشروع Supabase المستقل لمتجر التجزئة (المفاتيح العامة فقط)
// =========================================================================
const RETAIL_SUPABASE_URL = 'https://qavdmizccaltsggwrdkk.supabase.co';
const RETAIL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhdmRtaXpjY2FsdHNnZ3dyZGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0NDUzMTgsImV4cCI6MjExMDAyMTMxOH0.RUqkSQggtLrpfFGcr8Y2RUyD6RoJLqzKD3CVc5fo4KI';

const retailSupabase = window.supabase.createClient(RETAIL_SUPABASE_URL, RETAIL_ANON_KEY);

let currentUser = null;
let currentSession = null;
let catalogItems = [];

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, ''');
}

// =========================================================================
// 1. التهيئة ومراقبة جلسة المستخدم
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadRetailCatalog();

    const { data: { session } } = await retailSupabase.auth.getSession();
    if (session) {
        currentSession = session;
        currentUser = session.user;
        await refreshUserWallet();
    }

    retailSupabase.auth.onAuthStateChange(async (_event, session) => {
        currentSession = session;
        currentUser = session ? session.user : null;
        if (currentUser) {
            await refreshUserWallet();
        } else {
            document.getElementById('user-nav-panel').classList.add('hidden');
            document.getElementById('user-nav-panel').classList.remove('flex');
            document.getElementById('guest-login-btn').classList.remove('hidden');
        }
    });
});

async function refreshUserWallet() {
    if (!currentUser) return;
    document.getElementById('guest-login-btn').classList.add('hidden');
    const panel = document.getElementById('user-nav-panel');
    panel.classList.remove('hidden');
    panel.classList.add('flex');

    const { data } = await retailSupabase
        .from('retail_users')
        .select('wallet_balance')
        .eq('id', currentUser.id)
        .single();

    if (data) {
        document.getElementById('nav-wallet-balance').textContent = `$${Number(data.wallet_balance || 0).toFixed(2)}`;
    }
}

// =========================================================================
// 2. جلب وعرض كتالوج الباقات
// =========================================================================
async function loadRetailCatalog() {
    const grid = document.getElementById('catalog-grid');
    grid.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400 text-xs">جاري تحديث الكتالوج...</div>`;

    const { data, error } = await retailSupabase
        .from('retail_catalog')
        .select('id, platform, package_name, product_type, retail_price, image_url, is_active')
        .eq('is_active', true)
        .order('platform', { ascending: true });

    if (error) {
        grid.innerHTML = `<div class="col-span-full py-8 text-center text-rose-500 text-xs font-bold">تعذر تحميل المنتجات: ${escapeHTML(error.message)}</div>`;
        return;
    }

    catalogItems = data || [];
    renderPlatformPills();
    renderCatalogGrid('ALL');
}

function renderPlatformPills() {
    const container = document.getElementById('platform-filters');
    const platforms = [...new Set(catalogItems.map(i => i.platform))];

    container.innerHTML = `
        <button onclick="filterRetailCatalog('ALL')" data-platform="ALL" class="filter-pill px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 whitespace-nowrap transition">
            جميع الباقات
        </button>
    ` + platforms.map(pl => `
        <button onclick="filterRetailCatalog('${escapeHTML(pl)}')" data-platform="${escapeHTML(pl)}" class="filter-pill px-4 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 whitespace-nowrap transition">
            ${escapeHTML(pl)}
        </button>
    `).join('');
}

function filterRetailCatalog(platform) {
    document.querySelectorAll('.filter-pill').forEach(btn => {
        const isSelected = btn.getAttribute('data-platform') === platform;
        btn.className = isSelected
            ? 'filter-pill px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 whitespace-nowrap transition'
            : 'filter-pill px-4 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 whitespace-nowrap transition';
    });
    renderCatalogGrid(platform);
}

function renderCatalogGrid(platform) {
    const grid = document.getElementById('catalog-grid');
    const items = platform === 'ALL' ? catalogItems : catalogItems.filter(i => i.platform === platform);

    if (items.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400 text-xs">لا توجد باقات متاحة حالياً.</div>`;
        return;
    }

    grid.innerHTML = items.map(item => {
        const isID = item.product_type === 'ID';
        return `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-sm hover:border-indigo-500/50 transition">
                <div class="space-y-2">
                    <div class="flex items-center justify-between gap-2">
                        <span class="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            ${escapeHTML(item.platform)}
                        </span>
                        <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${isID ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}">
                            ${isID ? 'شحن بالمعرّف ID' : 'كود فوري ⚡'}
                        </span>
                    </div>
                    <h3 class="text-sm font-black text-slate-900 dark:text-white leading-snug">${escapeHTML(item.package_name)}</h3>
                </div>

                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <span class="text-[10px] text-slate-400 block">السعر</span>
                        <span class="font-mono font-black text-base text-emerald-600 dark:text-emerald-400" dir="ltr">$${Number(item.retail_price).toFixed(2)}</span>
                    </div>
                    <button onclick="openBuyModal('${item.id}')" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm">
                        شراء الآن
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// =========================================================================
// 3. تنفيذ الشراء عبر دالة Vercel الآمنة (/api/buy)
// =========================================================================
function openBuyModal(catalogId) {
    if (!currentUser || !currentSession) {
        openAuthModal('login');
        return;
    }

    const item = catalogItems.find(i => i.id === catalogId);
    if (!item) return;

    document.getElementById('buy-catalog-id').value = item.id;
    document.getElementById('buy-product-type').value = item.product_type;
    document.getElementById('buy-modal-platform').textContent = item.platform;
    document.getElementById('buy-modal-package').textContent = item.package_name;
    document.getElementById('buy-modal-price').textContent = `$${Number(item.retail_price).toFixed(2)}`;
    document.getElementById('buy-player-id').value = '';

    const pidGroup = document.getElementById('buy-playerid-group');
    if (item.product_type === 'ID') {
        pidGroup.classList.remove('hidden');
    } else {
        pidGroup.classList.add('hidden');
    }

    document.getElementById('buy-confirm-step').classList.remove('hidden');
    document.getElementById('buy-result-step').classList.add('hidden');
    document.getElementById('buy-modal').classList.remove('hidden');
}

async function executeRetailPurchase() {
    const catalogId = document.getElementById('buy-catalog-id').value;
    const productType = document.getElementById('buy-product-type').value;
    const playerId = document.getElementById('buy-player-id').value.trim();
    const btn = document.getElementById('btn-confirm-purchase');

    if (productType === 'ID' && !playerId) {
        alert('يرجى إدخال معرّف اللاعب (Player ID) لإتمام الشحن');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span>جاري تنفيذ الطلب...</span>`;

    try {
        const response = await fetch('/api/buy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentSession.access_token}`
            },
            body: JSON.stringify({
                catalog_id: catalogId,
                player_id: productType === 'ID' ? playerId : null
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            if (result.remaining_balance !== undefined) {
                document.getElementById('nav-wallet-balance').textContent = `$${Number(result.remaining_balance).toFixed(2)}`;
            }
            alert(result.error || 'تعذر إتمام عملية الشراء');
            return;
        }

        // تحديث الرصيد المعروض
        document.getElementById('nav-wallet-balance').textContent = `$${Number(result.remaining_balance).toFixed(2)}`;

        // الانتقال لشاشة النتيجة
        document.getElementById('buy-confirm-step').classList.add('hidden');
        document.getElementById('buy-result-step').classList.remove('hidden');
        document.getElementById('buy-result-ref').textContent = result.order_ref;

        if (result.fulfillment_status === 'pending') {
            document.getElementById('buy-result-title').textContent = 'تم استلام طلب الشحن المباشر';
            document.getElementById('buy-code-box').classList.add('hidden');
            document.getElementById('buy-pending-box').classList.remove('hidden');
        } else {
            document.getElementById('buy-result-title').textContent = 'تم الشراء بنجاح! إليك الكود الرقمي';
            document.getElementById('buy-delivered-code').value = result.card_code;
            document.getElementById('buy-code-box').classList.remove('hidden');
            document.getElementById('buy-pending-box').classList.add('hidden');
        }

    } catch (err) {
        alert('خطأ في الاتصال بالخادم: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="ph-bold ph-check-circle text-base"></i><span>تأكيد الدفع من المحفظة</span>`;
    }
}

function copyDeliveredCode() {
    const input = document.getElementById('buy-delivered-code');
    navigator.clipboard.writeText(input.value);
    alert('تم نسخ الكود بنجاح!');
}

// =========================================================================
// 4. سجل طلبات الزبون ومزامنة حالة طلبات الـ ID (/api/sync-order)
// =========================================================================
async function openOrdersModal() {
    if (!currentUser) return;
    document.getElementById('orders-modal').classList.remove('hidden');
    await loadUserOrdersHistory();
}

async function loadUserOrdersHistory() {
    const tbody = document.getElementById('retail-orders-tbody');
    tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400">جاري جلب طلباتك...</td></tr>`;

    const { data, error } = await retailSupabase
        .from('retail_orders')
        .select('local_order_ref, retail_price, player_id, delivered_code, status, rejection_reason, created_at, retail_catalog(platform, package_name)')
        .order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-rose-500">${escapeHTML(error.message)}</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400">لا توجد مشتريات سابقة في حسابك.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(o => {
        const pkgTitle = o.retail_catalog ? `${o.retail_catalog.platform} - ${o.retail_catalog.package_name}` : 'باقة رقمية';
        const deliveryInfo = o.delivered_code
            ? `<span class="font-mono font-bold text-amber-600 dark:text-amber-400 select-all" dir="ltr">${escapeHTML(o.delivered_code)}</span>`
            : `<span class="font-mono text-slate-500" dir="ltr">ID: ${escapeHTML(o.player_id || '---')}</span>`;

        let statusHtml = '';
        if (o.status === 'completed') {
            statusHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">مكتمل ✓</span>`;
        } else if (o.status === 'pending') {
            statusHtml = `
                <div class="flex flex-col items-center gap-1">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">قيد التنفيذ</span>
                    <button onclick="syncPendingOrder('${escapeHTML(o.local_order_ref)}')" class="text-[10px] text-indigo-500 hover:underline font-bold">تحديث الحالة</button>
                </div>`;
        } else {
            statusHtml = `
                <div class="text-center">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600">مرفوض (مسترجع)</span>
                    ${o.rejection_reason ? `<div class="text-[9px] text-rose-400 mt-0.5">${escapeHTML(o.rejection_reason)}</div>` : ''}
                </div>`;
        }

        return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td class="py-3 px-2 font-mono font-bold">${escapeHTML(o.local_order_ref)}</td>
                <td class="py-3 px-2 font-bold">${escapeHTML(pkgTitle)}</td>
                <td class="py-3 px-2">${deliveryInfo}</td>
                <td class="py-3 px-2 font-mono font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">$${Number(o.retail_price).toFixed(2)}</td>
                <td class="py-3 px-2 text-center">${statusHtml}</td>
            </tr>
        `;
    }).join('');
}

async function syncPendingOrder(localOrderRef) {
    try {
        const res = await fetch('/api/sync-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ local_order_ref: localOrderRef })
        });
        const data = await res.json();
        if (data.status === 'rejected') {
            alert(`تم رفض الطلب (${data.rejection_reason || 'سبب غير محدد'}) وأُعيد المبلغ إلى محفظتك.`);
            await refreshUserWallet();
        } else if (data.status === 'completed') {
            alert('اكتمل شحن الطلب بنجاح!');
        } else {
            alert('الطلب لا يزال قيد المعالجة لدى المزود.');
        }
        await loadUserOrdersHistory();
    } catch (err) {
        alert('تعذر تحديث الحالة حالياً');
    }
}

// =========================================================================
// 5. إدارة المصادقة (تسجيل الدخول / إنشاء حساب) والمظهر
// =========================================================================
function openAuthModal(mode = 'login') {
    document.getElementById('auth-mode').value = mode;
    updateAuthModalUI();
    document.getElementById('auth-modal').classList.remove('hidden');
}

function toggleAuthMode() {
    const current = document.getElementById('auth-mode').value;
    document.getElementById('auth-mode').value = current === 'login' ? 'register' : 'login';
    updateAuthModalUI();
}

function updateAuthModalUI() {
    const isRegister = document.getElementById('auth-mode').value === 'register';
    document.getElementById('auth-modal-title').textContent = isRegister ? 'إنشاء حساب زبون جديد' : 'تسجيل الدخول إلى حسابك';
    document.getElementById('auth-name-group').classList.toggle('hidden', !isRegister);
    document.getElementById('auth-submit-btn').textContent = isRegister ? 'إنشاء الحساب' : 'دخول';
    document.getElementById('auth-switch-text').textContent = isRegister ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟';
    document.getElementById('auth-switch-btn').textContent = isRegister ? 'تسجيل الدخول' : 'إنشاء حساب جديد';
}

async function handleRetailAuthSubmit(e) {
    e.preventDefault();
    const mode = document.getElementById('auth-mode').value;
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const fullName = document.getElementById('auth-fullname').value.trim();
    const btn = document.getElementById('auth-submit-btn');

    btn.disabled = true;
    btn.textContent = 'جاري المعالجة...';

    try {
        if (mode === 'register') {
            const { error } = await retailSupabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName } }
            });
            if (error) throw error;
            alert('تم إنشاء حسابك بنجاح!');
        } else {
            const { error } = await retailSupabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        }
        closeModal('auth-modal');
    } catch (err) {
        alert('خطأ: ' + err.message);
    } finally {
        btn.disabled = false;
        updateAuthModalUI();
    }
}

async function handleRetailLogout() {
    await retailSupabase.auth.signOut();
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function toggleRetailTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('retail_theme', isDark ? 'dark' : 'light');
}
