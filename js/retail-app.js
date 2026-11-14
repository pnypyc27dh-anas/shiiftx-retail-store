// =========================================================================
// إعدادات مشروع Supabase المستقل لمتجر التجزئة
// =========================================================================
const RETAIL_SUPABASE_URL = 'https://qavdmizccaltsggwrdkk.supabase.co';
const RETAIL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhdmRtaXpjY2FsdHNnZ3dyZGtrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDQ0NTMxOCwiZXhwIjoyMTEwMDIxMzE4fQ.rPu37w2SV5_hnURIE_SSBh7RdQSegcY4UF8r9-sP3bI';

const retailSupabase = window.supabase.createClient(RETAIL_SUPABASE_URL, RETAIL_ANON_KEY);

let currentUser = null;
let currentSession = null;
let catalogItems = [];

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

// محوّل ذكي لروابط Imgur (يحوّل رابط الصفحة العادي إلى رابط صورة مباشر تلقائياً)
function resolveCardImageUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const clean = rawUrl.trim();
    const pageMatch = clean.match(/^https?:\/\/(?:www\.)?imgur\.com\/([a-zA-Z0-9]{5,10})(?:\.[a-zA-Z]+)?$/i);
    if (pageMatch && pageMatch[1]) {
        return 'https://i.imgur.com/' + pageMatch[1] + '.png';
    }
    return clean;
}

// =========================================================================
// 1. التهيئة ومراقبة جلسة المستخدم
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadRetailCatalog();

    if (!localStorage.getItem('shiiftx_eu_consent')) {
        const banner = document.getElementById('eu-cookie-banner');
        if (banner) banner.classList.remove('hidden');
    }

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
            const navPanel = document.getElementById('user-nav-panel');
            const guestBtn = document.getElementById('guest-login-btn');
            if (navPanel) {
                navPanel.classList.add('hidden');
                navPanel.classList.remove('flex');
            }
            if (guestBtn) guestBtn.classList.remove('hidden');
        }
    });
});

async function refreshUserWallet() {
    if (!currentUser) return;
    const guestBtn = document.getElementById('guest-login-btn');
    const panel = document.getElementById('user-nav-panel');
    if (guestBtn) guestBtn.classList.add('hidden');
    if (panel) {
        panel.classList.remove('hidden');
        panel.classList.add('flex');
    }

    const { data } = await retailSupabase
        .from('retail_users')
        .select('wallet_balance')
        .eq('id', currentUser.id)
        .single();

    if (data) {
        const balEl = document.getElementById('nav-wallet-balance');
        if (balEl) balEl.textContent = `$${Number(data.wallet_balance || 0).toFixed(2)}`;
    }
}

// =========================================================================
// 2. جلب وعرض كتالوج الباقات (البطاقات الكبيرة + صور Imgur + نافذة التعليمات)
// =========================================================================
async function loadRetailCatalog() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;
    grid.innerHTML = `<div class="col-span-full py-14 text-center text-slate-400 text-xs font-bold">جاري تحديث الكتالوج...</div>`;

    const { data, error } = await retailSupabase
        .from('retail_catalog')
        .select('id, platform, package_name, product_type, retail_price, image_url, instructions, is_active')
        .eq('is_active', true)
        .order('platform', { ascending: true })
        .order('retail_price', { ascending: true });

    if (error) {
        grid.innerHTML = `<div class="col-span-full py-10 text-center text-rose-500 text-xs font-bold">تعذر تحميل المنتجات: ${escapeHTML(error.message)}</div>`;
        return;
    }

    catalogItems = data || [];
    renderPlatformPills();
    renderCatalogGrid('ALL');
}

function renderPlatformPills() {
    const container = document.getElementById('platform-filters');
    if (!container) return;
    const platforms = [...new Set(catalogItems.map(i => i.platform).filter(Boolean))];

    container.innerHTML = `
        <button type="button" onclick="filterRetailCatalog('ALL')" data-platform="ALL" class="filter-pill px-4 py-2 rounded-xl bg-[#005ba3] text-white shadow-sm whitespace-nowrap transition cursor-pointer">
            جميع الباقات
        </button>
    ` + platforms.map(pl => `
        <button type="button" onclick="filterRetailCatalog('${escapeHTML(pl)}')" data-platform="${escapeHTML(pl)}" class="filter-pill px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap transition cursor-pointer">
            ${escapeHTML(pl)}
        </button>
    `).join('');
}

function filterRetailCatalog(platform) {
    document.querySelectorAll('.filter-pill').forEach(btn => {
        const isSelected = btn.getAttribute('data-platform') === platform;
        btn.className = isSelected
            ? 'filter-pill px-4 py-2 rounded-xl bg-[#005ba3] text-white shadow-sm whitespace-nowrap transition cursor-pointer'
            : 'filter-pill px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap transition cursor-pointer';
    });
    renderCatalogGrid(platform);
}

function renderCatalogGrid(platform) {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;

    const items = (!platform || platform === 'ALL')
        ? catalogItems
        : catalogItems.filter(i => i.platform === platform);

    if (items.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-16 text-center text-slate-400 text-sm font-bold">لا توجد باقات متوفرة في هذا القسم حالياً.</div>`;
        return;
    }

    grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';

    grid.innerHTML = items.map(item => {
        const safeId = escapeHTML(item.id);
        const platformName = escapeHTML(item.platform || 'بطاقة رقمية');
        const pkgName = escapeHTML(item.package_name || 'باقة شحن');
        const price = Number(item.retail_price || 0).toFixed(2);
        const isID = (item.product_type && item.product_type.toUpperCase() === 'ID');

        const badgeText = isID ? 'شحن مباشر (ID)' : 'كود فوري ⚡';
        const badgeClass = isID
            ? 'bg-amber-500/95 text-slate-950'
            : 'bg-emerald-500/95 text-slate-950';

        const imgUrl = resolveCardImageUrl(item.image_url);
        const hasInstructions = Boolean(item.instructions && item.instructions.trim());

        const visualBlock = imgUrl
            ? `<img src="${escapeHTML(imgUrl)}" alt="${pkgName}" loading="lazy"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                    class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500">
               <div style="display:none;" class="w-full h-full bg-gradient-to-br from-[#0b1120] via-[#132238] to-[#005ba3] flex-col items-center justify-center p-6 text-center">
                   <i class="ph-duotone ph-gift text-5xl text-[#5CE1E6]/85 mb-2"></i>
                   <span class="text-xs font-extrabold text-white/80 tracking-wide">${platformName}</span>
               </div>`
            : `<div class="w-full h-full bg-gradient-to-br from-[#0b1120] via-[#132238] to-[#005ba3] flex flex-col items-center justify-center p-6 text-center">
                   <i class="ph-duotone ph-credit-card text-5xl text-[#5CE1E6]/85 mb-2"></i>
                   <span class="text-xs font-extrabold text-white/80 tracking-wide">${platformName}</span>
               </div>`;

        return `
            <article data-id="${safeId}" onclick="openPackageDetailsModal(this.dataset.id)"
                     class="group cursor-pointer rounded-[28px] overflow-hidden bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/10 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_40px_-12px_rgba(0,91,163,0.28)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col">

                <!-- الجزء العلوي الكبير (~65% من البطاقة لصورة Imgur والفراغ البصري) -->
                <div class="relative w-full aspect-[16/11] min-h-[220px] bg-slate-900 overflow-hidden">
                    ${visualBlock}
                    <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none"></div>

                    <!-- شارة نوع التسليم -->
                    <span class="absolute top-3.5 right-3.5 px-3 py-1 rounded-full text-[11px] font-black shadow-md backdrop-blur-md ${badgeClass}">
                        ${badgeText}
                    </span>

                    <!-- زر نافذة التعليمات والملاحظات -->
                    <button type="button" data-id="${safeId}" onclick="event.stopPropagation(); openPackageDetailsModal(this.dataset.id);"
                            class="absolute top-3.5 left-3.5 w-9 h-9 rounded-full bg-slate-950/65 hover:bg-[#005ba3] text-white backdrop-blur-md border border-white/15 flex items-center justify-center transition shadow-md cursor-pointer"
                            title="تعليمات وملاحظات الباقة">
                        <i class="ph-bold ${hasInstructions ? 'ph-info text-[#5CE1E6]' : 'ph-eye'} text-base"></i>
                    </button>

                    <!-- اسم المنصة أسفل الصورة -->
                    <span class="absolute bottom-3 right-4 text-[11px] font-extrabold text-white/95 tracking-wide">
                        ${platformName}
                    </span>
                </div>

                <!-- الجزء السفلي المدمج (اسم الباقة + التعليمات + السعر + زر الشراء) -->
                <div class="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div class="space-y-1">
                        <h3 class="text-base font-black text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#005ba3] dark:group-hover:text-[#5CE1E6] transition-colors">
                            ${pkgName}
                        </h3>
                        <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <i class="ph-bold ph-book-open-text text-[#005ba3] dark:text-[#5CE1E6]"></i>
                            <span>انقر لعرض تعليمات الشحن وملاحظات الباقة</span>
                        </p>
                    </div>

                    <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                        <div>
                            <span class="block text-[10px] font-bold text-slate-400">السعر النهائي</span>
                            <span class="financial-amount text-xl font-black text-slate-900 dark:text-white" dir="ltr">$${price}</span>
                        </div>

                        <button type="button" data-id="${safeId}" onclick="event.stopPropagation(); handleCardDirectBuy(this.dataset.id);"
                                class="btn-primary px-5 py-3 rounded-2xl text-white text-xs font-black flex items-center gap-2 shrink-0 cursor-pointer">
                            <i class="ph-bold ph-shopping-cart-simple text-base"></i>
                            <span>شراء الآن</span>
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

// =========================================================================
// 2.1 نافذة تعليمات الشحن وملاحظات الباقة
// =========================================================================
window.openPackageDetailsModal = function(itemId) {
    const item = catalogItems.find(i => String(i.id) === String(itemId));
    if (!item) return;

    const modal = document.getElementById('package-details-modal');
    if (!modal) {
        openBuyModal(item.id);
        return;
    }

    const imgEl = document.getElementById('pkg-detail-img');
    const fallbackEl = document.getElementById('pkg-detail-fallback');
    const imgUrl = resolveCardImageUrl(item.image_url);

    if (imgUrl && imgEl) {
        imgEl.src = imgUrl;
        imgEl.classList.remove('hidden');
        if (fallbackEl) fallbackEl.classList.add('hidden');
    } else if (imgEl) {
        imgEl.classList.add('hidden');
        if (fallbackEl) fallbackEl.classList.remove('hidden');
    }

    const platEl = document.getElementById('pkg-detail-platform');
    const titleEl = document.getElementById('pkg-detail-title');
    const priceEl = document.getElementById('pkg-detail-price');
    const instEl = document.getElementById('pkg-detail-instructions');
    const buyBtn = document.getElementById('pkg-detail-buy-btn');

    if (platEl) platEl.textContent = item.platform || 'بطاقة رقمية';
    if (titleEl) titleEl.textContent = item.package_name || 'باقة شحن';
    if (priceEl) priceEl.textContent = `$${Number(item.retail_price || 0).toFixed(2)}`;

    const isID = (item.product_type && item.product_type.toUpperCase() === 'ID');
    const defaultNote = isID
        ? 'يتم شحن هذه الباقة مباشرة إلى معرّف اللاعب (Player ID) الخاص بك خلال دقائق. يرجى التأكد من كتابة المعرّف بدقة قبل تأكيد الطلب.'
        : 'يتم تسليم الكود الرقمي فوراً داخل حسابك فور إتمام عملية الدفع. يرجى التأكد من توافق منطقة الحساب (Region) مع البطاقة قبل الشراء.';

    if (instEl) {
        instEl.textContent = (item.instructions && item.instructions.trim()) ? item.instructions.trim() : defaultNote;
    }
    if (buyBtn) buyBtn.dataset.id = String(item.id);

    modal.classList.remove('hidden');
};

window.closePackageDetailsModal = function() {
    const modal = document.getElementById('package-details-modal');
    if (modal) modal.classList.add('hidden');
};

window.handleCardDirectBuy = function(itemId) {
    window.closePackageDetailsModal();
    openBuyModal(itemId);
};

// =========================================================================
// 3. تنفيذ الشراء عبر دالة Vercel الآمنة (/api/buy)
// =========================================================================
function openBuyModal(catalogId) {
    if (!currentUser || !currentSession) {
        openAuthModal('login');
        return;
    }

    const item = catalogItems.find(i => String(i.id) === String(catalogId));
    if (!item) return;

    const waiver = document.getElementById('eu-withdrawal-waiver');
    if (waiver) waiver.checked = false;

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

    const waiverChecked = document.getElementById('eu-withdrawal-waiver')?.checked;
    if (!waiverChecked) {
        alert('يرجى الموافقة على شرط التنفيذ الفوري والتنازل عن حق العدول الأوروبي قبل إتمام الدفع.');
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

        document.getElementById('nav-wallet-balance').textContent = `$${Number(result.remaining_balance).toFixed(2)}`;

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
        btn.innerHTML = `<i class="ph-fill ph-check-circle text-lg"></i><span>شراء وتأكيد الدفع الملزم</span>`;
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
                    <button onclick="syncPendingOrder('${escapeHTML(o.local_order_ref)}')" class="text-[10px] text-[#005ba3] dark:text-[#5CE1E6] hover:underline font-bold">تحديث الحالة</button>
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
// 5. إدارة المصادقة (تسجيل الدخول / إنشاء حساب) والمظهر وحذف الحساب GDPR
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
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

function toggleRetailTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('retail_theme', isDark ? 'dark' : 'light');
}

window.acceptEuCookies = function(level) {
    localStorage.setItem('shiiftx_eu_consent', level);
    const banner = document.getElementById('eu-cookie-banner');
    if (banner) banner.classList.add('hidden');
};

window.deleteMyRetailAccount = async function() {
    if (!currentUser || !currentSession) return;
    const confirmed = confirm('تحذير نهائي: سيتم حذف حسابك وبياناتك الشخصية نهائياً ولا يمكن التراجع عن هذه الخطوة. هل تريد المتابعة؟');
    if (!confirmed) return;

    try {
        const res = await fetch('/api/delete-account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + currentSession.access_token
            }
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            alert(data.error || 'تعذر حذف الحساب حالياً');
            return;
        }
        await retailSupabase.auth.signOut();
        closeModal('orders-modal');
        alert('تم حذف حسابك وبياناتك بنجاح وفق لائحة GDPR.');
    } catch (err) {
        alert('خطأ في الاتصال بالخادم: ' + err.message);
    }
};
