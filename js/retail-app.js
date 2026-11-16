// ==================== بداية ملف js/retail-app.js ====================
const RETAIL_SUPABASE_URL = 'https://qavdmizccaltsggwrdkk.supabase.co';
const RETAIL_ANON_KEY = 'PASTE_YOUR_ANON_KEY_HERE';

const retailSupabase = window.supabase.createClient(RETAIL_SUPABASE_URL, RETAIL_ANON_KEY);

let currentUser = null;
let currentSession = null;
let catalogItems = [];
let pendingOrderRefs = [];
let activeAppView = 'store'; // 'store' | 'favorites'
let activePlatformFilter = 'ALL';
let activeSearchQuery = '';
let activeSortOrder = 'default';
let favoriteIds = new Set(JSON.parse(localStorage.getItem('shiiftx_retail_favs') || '[]'));

function saveFavoritesStorage() {
    localStorage.setItem('shiiftx_retail_favs', JSON.stringify([...favoriteIds]));
}

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

function resolveCardImageUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const clean = rawUrl.trim();
    const pageMatch = clean.match(/^https?:\/\/(?:www\.)?imgur\.com\/([a-zA-Z0-9]{5,10})(?:\.[a-zA-Z]+)?$/i);
    if (pageMatch && pageMatch[1]) {
        return 'https://i.imgur.com/' + pageMatch[1] + '.png';
    }
    return clean;
}

// أيقونة مخصصة لكل منصة في القائمة الجانبية
function getPlatformIconClass(platformName) {
    const p = (platformName || '').toLowerCase();
    if (p.includes('pubg') || p.includes('free fire') || p.includes('call of duty') || p.includes('valorant') || p.includes('mobile legends')) {
        return 'ph-fill ph-game-controller';
    }
    if (p.includes('google')) return 'ph-fill ph-google-play-logo';
    if (p.includes('apple') || p.includes('itunes')) return 'ph-fill ph-apple-logo';
    if (p.includes('playstation') || p.includes('psn')) return 'ph-fill ph-playstation-logo';
    if (p.includes('xbox')) return 'ph-fill ph-xbox-logo';
    if (p.includes('steam')) return 'ph-fill ph-steam-logo';
    if (p.includes('razer')) return 'ph-fill ph-coin-vertical';
    if (p.includes('netflix') || p.includes('spotify') || p.includes('shahid') || p.includes('watch')) return 'ph-fill ph-television-simple';
    if (p.includes('likee') || p.includes('tiktok') || p.includes('bigo') || p.includes('discord')) return 'ph-fill ph-chats-circle';
    if (p.includes('windows') || p.includes('office') || p.includes('outlook') || p.includes('microsoft')) return 'ph-fill ph-windows-logo';
    return 'ph-fill ph-credit-card';
}

// إشعارات الكبسولة العائمة بأسلوب Revolut (Pill Toasts)
function showRetailToast(message, type = 'info') {
    const container = document.getElementById('retail-toast-container');
    if (!container) return;

    const styles = {
        success: {
            bg: 'bg-[#191c1f]/95 dark:bg-emerald-600/95 border border-emerald-400/30 text-white',
            icon: 'ph-fill ph-check-circle text-emerald-400 dark:text-white'
        },
        error: {
            bg: 'bg-rose-600/95 border border-rose-400/30 text-white',
            icon: 'ph-fill ph-warning-circle text-white'
        },
        warning: {
            bg: 'bg-amber-500/95 border-amber-300/40 text-[#191c1f]',
            icon: 'ph-fill ph-warning text-[#191c1f]'
        },
        info: {
            bg: 'bg-[#191c1f]/95 dark:bg-[#181c25]/95 border border-white/15 text-white',
            icon: 'ph-fill ph-info text-[#5CE1E6]'
        }
    };

    const currentStyle = styles[type] || styles.info;
    const toast = document.createElement('div');
    toast.className = `rev-toast pointer-events-auto inline-flex items-center justify-between gap-3 text-xs font-extrabold max-w-full ${currentStyle.bg}`;
    toast.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="${currentStyle.icon} text-base shrink-0"></i>
            <span class="leading-snug">${escapeHTML(message)}</span>
        </div>
        <button type="button" onclick="this.parentElement.remove()" class="opacity-70 hover:opacity-100 p-0.5 cursor-pointer">
            <i class="ph-bold ph-x text-xs"></i>
        </button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px) scale(0.96)';
        toast.style.transition = 'all 0.22s ease';
        setTimeout(() => toast.remove(), 240);
    }, 4000);
}

// =========================================================================
// 1. التهيئة ومراقبة جلسة المستخدم
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    updateFavoritesCounter();
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
        await checkPendingOrdersStatus();
    }

    retailSupabase.auth.onAuthStateChange(async (_event, session) => {
        currentSession = session;
        currentUser = session ? session.user : null;
        if (currentUser) {
            await refreshUserWallet();
            await checkPendingOrdersStatus();
        } else {
            syncAuthUIState(false, 0);
            const pendingBanner = document.getElementById('pending-order-banner');
            if (pendingBanner) pendingBanner.classList.add('hidden');
        }
    });
});

function syncAuthUIState(isLoggedIn, balance = 0) {
    const formatted = `$${Number(balance || 0).toFixed(2)}`;
    const navPanel = document.getElementById('user-nav-panel');
    const guestBtn = document.getElementById('guest-login-btn');
    const navBal = document.getElementById('nav-wallet-balance');

    const sbGuest = document.getElementById('sidebar-guest-box');
    const sbUser = document.getElementById('sidebar-user-box');
    const sbBal = document.getElementById('sidebar-wallet-balance');
    const sbLogout = document.getElementById('sidebar-logout-btn');

    if (isLoggedIn) {
        if (guestBtn) guestBtn.classList.add('hidden');
        if (navPanel) {
            navPanel.classList.remove('hidden');
            navPanel.classList.add('flex');
        }
        if (navBal) navBal.textContent = formatted;

        if (sbGuest) sbGuest.classList.add('hidden');
        if (sbUser) sbUser.classList.remove('hidden');
        if (sbBal) sbBal.textContent = formatted;
        if (sbLogout) sbLogout.classList.remove('hidden');
    } else {
        if (navPanel) {
            navPanel.classList.add('hidden');
            navPanel.classList.remove('flex');
        }
        if (guestBtn) guestBtn.classList.remove('hidden');

        if (sbGuest) sbGuest.classList.remove('hidden');
        if (sbUser) sbUser.classList.add('hidden');
        if (sbLogout) sbLogout.classList.add('hidden');
    }
}

async function refreshUserWallet() {
    if (!currentUser) return;
    const { data } = await retailSupabase
        .from('retail_users')
        .select('wallet_balance')
        .eq('id', currentUser.id)
        .single();

    syncAuthUIState(true, data ? data.wallet_balance : 0);
}

// =========================================================================
// 2. القائمة الجانبية، التبديل بين المتجر والمفضلة، والبحث والفرز
// =========================================================================
window.toggleMobileSidebar = function(forceOpen) {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;

    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', shouldOpen);
    if (backdrop) backdrop.classList.toggle('hidden', !shouldOpen);
};

window.switchAppView = function(view) {
    activeAppView = view === 'favorites' ? 'favorites' : 'store';

    const btnStore = document.getElementById('nav-btn-store');
    const btnFav = document.getElementById('nav-btn-favorites');
    const hero = document.getElementById('store-hero-banner');

    if (btnStore) btnStore.classList.toggle('active', activeAppView === 'store' && activePlatformFilter === 'ALL');
    if (btnFav) btnFav.classList.toggle('active', activeAppView === 'favorites');
    if (hero) hero.classList.toggle('hidden', activeAppView === 'favorites');

    if (activeAppView === 'favorites') {
        document.querySelectorAll('.sidebar-platform-btn').forEach(b => b.classList.remove('active'));
    } else {
        renderSidebarPlatforms();
    }

    window.toggleMobileSidebar(false);
    renderCatalogGrid();
};

function updateFavoritesCounter() {
    const validFavs = [...favoriteIds].filter(id => catalogItems.length === 0 || catalogItems.some(i => String(i.id) === String(id)));
    const el = document.getElementById('sidebar-fav-count');
    if (el) el.textContent = String(validFavs.length);
}

window.toggleFavoritePackage = function(itemId) {
    const key = String(itemId);
    if (favoriteIds.has(key)) {
        favoriteIds.delete(key);
        showRetailToast('تمت الإزالة من المفضلة', 'info');
    } else {
        favoriteIds.add(key);
        showRetailToast('تمت الإضافة إلى المفضلة ❤️', 'success');
    }
    saveFavoritesStorage();
    updateFavoritesCounter();
    syncDrawerFavoriteBtn(key);
    renderCatalogGrid();
};

function syncDrawerFavoriteBtn(itemId) {
    const btn = document.getElementById('pkg-detail-fav-btn');
    if (!btn) return;
    btn.dataset.id = String(itemId);
    btn.classList.toggle('is-fav', favoriteIds.has(String(itemId)));
}

async function loadRetailCatalog() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;

    const { data, error } = await retailSupabase
        .from('retail_catalog')
        .select('id, platform, package_name, product_type, retail_price, image_url, instructions, is_active')
        .eq('is_active', true)
        .order('platform', { ascending: true })
        .order('retail_price', { ascending: true });

    if (error) {
        grid.innerHTML = `<div class="col-span-full rev-panel py-12 text-center text-rose-500 text-xs font-bold">تعذر تحميل المنتجات: ${escapeHTML(error.message)}</div>`;
        return;
    }

    catalogItems = data || [];
    const totalEl = document.getElementById('sidebar-total-count');
    if (totalEl) totalEl.textContent = String(catalogItems.length);

    updateFavoritesCounter();
    renderSidebarPlatforms();
    renderCatalogGrid();
}

function renderSidebarPlatforms() {
    const container = document.getElementById('sidebar-platform-list');
    if (!container) return;

    const platforms = [...new Set(catalogItems.map(i => i.platform).filter(Boolean))];
    const btnStore = document.getElementById('nav-btn-store');
    if (btnStore) {
        btnStore.classList.toggle('active', activeAppView === 'store' && activePlatformFilter === 'ALL');
    }

    if (platforms.length === 0) {
        container.innerHTML = `<div class="px-3 py-2 text-xs text-[#68707d]">لا توجد منصات متاحة</div>`;
        return;
    }

    container.innerHTML = platforms.map(pl => {
        const count = catalogItems.filter(i => i.platform === pl).length;
        const isSel = (activeAppView === 'store' && activePlatformFilter === pl);
        const iconClass = getPlatformIconClass(pl);
        return `
            <button type="button" onclick="filterRetailCatalog('${escapeHTML(pl)}')" data-platform="${escapeHTML(pl)}" class="sidebar-platform-btn rev-nav-item ${isSel ? 'active' : ''}">
                <span class="flex items-center gap-2.5 truncate">
                    <span class="rev-nav-icon"><i class="${iconClass}"></i></span>
                    <span class="truncate">${escapeHTML(pl)}</span>
                </span>
                <span class="text-[11px] font-extrabold opacity-70 shrink-0">${count}</span>
            </button>
        `;
    }).join('');
}

function filterRetailCatalog(platform) {
    activeAppView = 'store';
    activePlatformFilter = platform || 'ALL';

    const btnFav = document.getElementById('nav-btn-favorites');
    const hero = document.getElementById('store-hero-banner');
    if (btnFav) btnFav.classList.remove('active');
    if (hero) hero.classList.remove('hidden');

    renderSidebarPlatforms();
    window.toggleMobileSidebar(false);
    renderCatalogGrid();
}

function handleCatalogSearch(query) {
    activeSearchQuery = (query || '').trim().toLowerCase();
    const clearBtn = document.getElementById('clear-search-btn');
    if (clearBtn) {
        clearBtn.classList.toggle('hidden', activeSearchQuery.length === 0);
        clearBtn.classList.toggle('flex', activeSearchQuery.length > 0);
    }
    renderCatalogGrid();
}

function clearCatalogSearch() {
    const input = document.getElementById('catalog-search-input');
    if (input) input.value = '';
    handleCatalogSearch('');
}

function handleCatalogSort(sortOrder) {
    activeSortOrder = sortOrder || 'default';
    renderCatalogGrid();
}

function renderCatalogGrid() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;

    let items = [...catalogItems];
    let viewTitle = 'جميع الباقات';

    if (activeAppView === 'favorites') {
        items = items.filter(i => favoriteIds.has(String(i.id)));
        viewTitle = 'الباقات المفضلة';
    } else if (activePlatformFilter && activePlatformFilter !== 'ALL') {
        items = items.filter(i => i.platform === activePlatformFilter);
        viewTitle = activePlatformFilter;
    }

    if (activeSearchQuery) {
        items = items.filter(i => {
            const p = (i.platform || '').toLowerCase();
            const n = (i.package_name || '').toLowerCase();
            const pr = String(i.retail_price || '');
            return p.includes(activeSearchQuery) || n.includes(activeSearchQuery) || pr.includes(activeSearchQuery);
        });
    }

    if (activeSortOrder === 'price_asc') {
        items.sort((a, b) => Number(a.retail_price || 0) - Number(b.retail_price || 0));
    } else if (activeSortOrder === 'price_desc') {
        items.sort((a, b) => Number(b.retail_price || 0) - Number(a.retail_price || 0));
    }

    const bcTitle = document.getElementById('breadcrumb-current');
    const bcCount = document.getElementById('breadcrumb-count');
    if (bcTitle) bcTitle.textContent = viewTitle;
    if (bcCount) bcCount.textContent = `${items.length} باقة`;

    if (items.length === 0) {
        const isFavEmpty = activeAppView === 'favorites' && !activeSearchQuery;
        grid.innerHTML = `
            <div class="col-span-full rev-panel py-16 px-4 text-center space-y-3">
                <i class="ph-duotone ${isFavEmpty ? 'ph-heart-break' : 'ph-magnifying-glass'} text-4xl text-[#68707d]"></i>
                <p class="text-sm font-black">${isFavEmpty ? 'قائمة المفضلة فارغة حالياً' : 'لم يتم العثور على باقات مطابقة لبحثك'}</p>
                <p class="text-xs text-[#68707d] dark:text-slate-400">${isFavEmpty ? 'اضغط على أيقونة القلب أعلى أي بطاقة لحفظها هنا للوصول السريع.' : 'جرّب البحث بكلمة أخرى أو تصفّح جميع الأقسام.'}</p>
                <div class="pt-1">
                    <button type="button" onclick="clearCatalogSearch(); switchAppView('store'); filterRetailCatalog('ALL');" class="rev-btn-primary px-6 py-2.5 text-xs">
                        تصفّح جميع الباقات
                    </button>
                </div>
            </div>`;
        return;
    }

    grid.className = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6';

    grid.innerHTML = items.map(item => {
        const safeId = escapeHTML(item.id);
        const platformName = escapeHTML(item.platform || 'بطاقة رقمية');
        const pkgName = escapeHTML(item.package_name || 'باقة شحن');
        const price = Number(item.retail_price || 0).toFixed(2);
        const isID = (item.product_type && item.product_type.toUpperCase() === 'ID');
        const isFav = favoriteIds.has(String(item.id));

        const badgeText = isID ? 'شحن مباشر ID' : 'كود فوري';
        const badgeDot = isID ? 'bg-amber-400' : 'bg-emerald-400';

        const imgUrl = resolveCardImageUrl(item.image_url);

        const visualBlock = imgUrl
            ? `<img src="${escapeHTML(imgUrl)}" alt="${pkgName}" loading="lazy" referrerpolicy="no-referrer"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                    class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500">
               <div style="display:none;" class="w-full h-full bg-gradient-to-br from-[#0b1324] via-[#102544] to-[#005ba3] flex-col items-center justify-center p-6 text-center">
                   <i class="ph-duotone ph-gift text-5xl text-[#5CE1E6]/85 mb-2"></i>
                   <span class="text-xs font-extrabold text-white/85 tracking-wide">${platformName}</span>
               </div>`
            : `<div class="w-full h-full bg-gradient-to-br from-[#0b1324] via-[#102544] to-[#005ba3] flex flex-col items-center justify-center p-6 text-center">
                   <i class="ph-duotone ph-credit-card text-5xl text-[#5CE1E6]/85 mb-2"></i>
                   <span class="text-xs font-extrabold text-white/85 tracking-wide">${platformName}</span>
               </div>`;

        return `
            <article data-id="${safeId}" onclick="openPackageDetailsModal(this.dataset.id)" class="rev-product-card group">
                <div class="relative w-full aspect-[16/11] min-h-[215px] bg-[#0b1324] overflow-hidden">
                    ${visualBlock}
                    <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none"></div>

                    <span class="absolute top-3.5 right-3.5 px-3 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full ${badgeDot}"></span>
                        <span>${badgeText}</span>
                    </span>

                    <button type="button" data-id="${safeId}" onclick="event.stopPropagation(); toggleFavoritePackage(this.dataset.id);"
                            class="rev-fav-btn ${isFav ? 'is-fav' : ''} absolute top-3.5 left-3.5 w-9 h-9 rounded-full bg-black/55 hover:bg-rose-500 text-white backdrop-blur-md border border-white/15 flex items-center justify-center transition cursor-pointer"
                            title="${isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}">
                        <i class="ph-fill ph-heart text-base"></i>
                    </button>

                    <span class="absolute bottom-3 right-4 text-[11px] font-extrabold text-white/95 tracking-wide">
                        ${platformName}
                    </span>
                </div>

                <div class="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div class="space-y-1">
                        <h3 class="text-base font-black leading-snug line-clamp-2 group-hover:text-[#005ba3] dark:group-hover:text-[#5CE1E6] transition-colors">
                            ${pkgName}
                        </h3>
                        <p class="text-[11px] font-semibold text-[#68707d] dark:text-slate-400 flex items-center gap-1">
                            <i class="ph-bold ph-info text-[#005ba3] dark:text-[#5CE1E6]"></i>
                            <span>انقر للتفاصيل والتعليمات</span>
                        </p>
                    </div>

                    <div class="pt-3 border-t border-black/6 dark:border-white/8 flex items-center justify-between gap-3">
                        <div>
                            <span class="block text-[10px] font-bold text-[#68707d] dark:text-slate-400">السعر النهائي</span>
                            <span class="financial-amount text-xl font-black" dir="ltr">$${price}</span>
                        </div>

                        <button type="button" data-id="${safeId}" onclick="event.stopPropagation(); handleCardDirectBuy(this.dataset.id);"
                                class="rev-btn-primary px-5 py-2.5 text-xs shrink-0">
                            <span>شراء</span>
                            <i class="ph-bold ph-arrow-left text-xs"></i>
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

// =========================================================================
// 2.1 الأدراج الجانبية: تفاصيل الباقة + شحن الرصيد
// =========================================================================
window.openPackageDetailsModal = function(itemId) {
    const item = catalogItems.find(i => String(i.id) === String(itemId));
    if (!item) return;

    const modal = document.getElementById('package-details-modal');
    if (!modal) {
        openBuyModal(item.id);
        return;
    }

    syncDrawerFavoriteBtn(item.id);

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

window.openTopupModal = function() {
    if (!currentUser) {
        showRetailToast('يرجى تسجيل الدخول أولاً لشحن محفظتك', 'info');
        openAuthModal('login');
        return;
    }
    const emailEl = document.getElementById('topup-user-email');
    if (emailEl) emailEl.textContent = currentUser.email || '---';
    const modal = document.getElementById('topup-modal');
    if (modal) modal.classList.remove('hidden');
};

window.copyTopupEmail = function() {
    if (!currentUser || !currentUser.email) return;
    navigator.clipboard.writeText(currentUser.email);
    showRetailToast('تم نسخ بريد حسابك بنجاح', 'success');
};

// =========================================================================
// 3. تنفيذ الشراء عبر دالة Vercel الآمنة (/api/buy)
// =========================================================================
function openBuyModal(catalogId, prefillPlayerId = '') {
    if (!currentUser || !currentSession) {
        showRetailToast('يرجى تسجيل الدخول لإتمام الطلب', 'info');
        openAuthModal('login');
        return;
    }

    const item = catalogItems.find(i => String(i.id) === String(catalogId));
    if (!item) {
        showRetailToast('هذه الباقة غير متوفرة حالياً', 'warning');
        return;
    }

    const waiver = document.getElementById('eu-withdrawal-waiver');
    if (waiver) waiver.checked = false;

    document.getElementById('buy-catalog-id').value = item.id;
    document.getElementById('buy-product-type').value = item.product_type;
    document.getElementById('buy-modal-platform').textContent = item.platform;
    document.getElementById('buy-modal-package').textContent = item.package_name;
    document.getElementById('buy-modal-price').textContent = `$${Number(item.retail_price).toFixed(2)}`;
    document.getElementById('buy-player-id').value = prefillPlayerId || '';

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
        showRetailToast('يرجى إدخال معرّف اللاعب (Player ID)', 'warning');
        return;
    }

    const waiverChecked = document.getElementById('eu-withdrawal-waiver')?.checked;
    if (!waiverChecked) {
        showRetailToast('يرجى الموافقة على شرط التنفيذ الفوري الأوروبي', 'warning');
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
                syncAuthUIState(true, result.remaining_balance);
            }
            showRetailToast(result.error || 'تعذر إتمام عملية الشراء', 'error');
            return;
        }

        syncAuthUIState(true, result.remaining_balance);

        document.getElementById('buy-confirm-step').classList.add('hidden');
        document.getElementById('buy-result-step').classList.remove('hidden');
        document.getElementById('buy-result-ref').textContent = result.order_ref;

        if (result.fulfillment_status === 'pending') {
            document.getElementById('buy-result-title').textContent = 'تم استلام طلب الشحن المباشر';
            document.getElementById('buy-code-box').classList.add('hidden');
            document.getElementById('buy-pending-box').classList.remove('hidden');
            showRetailToast('تم إرسال طلب الشحن المباشر بنجاح', 'success');
            await checkPendingOrdersStatus();
        } else {
            document.getElementById('buy-result-title').textContent = 'تم الشراء بنجاح! إليك الكود';
            document.getElementById('buy-delivered-code').value = result.card_code;
            document.getElementById('buy-code-box').classList.remove('hidden');
            document.getElementById('buy-pending-box').classList.add('hidden');
            showRetailToast('تم الشراء وتسليم الكود الرقمي بنجاح', 'success');
        }

    } catch (err) {
        showRetailToast('خطأ في الاتصال بالخادم: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="ph-fill ph-lock-key text-base"></i><span>تأكيد الدفع من المحفظة</span>`;
    }
}

function copyDeliveredCode() {
    const input = document.getElementById('buy-delivered-code');
    navigator.clipboard.writeText(input.value);
    showRetailToast('تم نسخ الكود الرقمي إلى الحافظة', 'success');
}

// =========================================================================
// 4. متتبع الطلبات الحية + سجل طلبات الزبون + إعادة الشراء السريع
// =========================================================================
async function checkPendingOrdersStatus() {
    const banner = document.getElementById('pending-order-banner');
    const countEl = document.getElementById('pending-orders-count');
    if (!currentUser || !banner) return;

    const { data, error } = await retailSupabase
        .from('retail_orders')
        .select('local_order_ref')
        .eq('status', 'pending');

    if (!error && data && data.length > 0) {
        pendingOrderRefs = data.map(r => r.local_order_ref);
        if (countEl) countEl.textContent = String(pendingOrderRefs.length);
        banner.classList.remove('hidden');
    } else {
        pendingOrderRefs = [];
        banner.classList.add('hidden');
    }
}

window.syncAllPendingOrders = async function() {
    if (pendingOrderRefs.length === 0) return;
    showRetailToast('جاري التحقق من حالة الطلبات...', 'info');
    for (const ref of pendingOrderRefs) {
        await syncPendingOrder(ref, true);
    }
    await checkPendingOrdersStatus();
};

async function openOrdersModal() {
    if (!currentUser) {
        showRetailToast('يرجى تسجيل الدخول لعرض طلباتك', 'info');
        openAuthModal('login');
        return;
    }
    document.getElementById('orders-modal').classList.remove('hidden');
    await loadUserOrdersHistory();
}

async function loadUserOrdersHistory() {
    const tbody = document.getElementById('retail-orders-tbody');
    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-[#68707d]">جاري جلب طلباتك...</td></tr>`;

    const { data, error } = await retailSupabase
        .from('retail_orders')
        .select('catalog_id, local_order_ref, retail_price, player_id, delivered_code, status, rejection_reason, created_at, retail_catalog(platform, package_name)')
        .order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-rose-500">${escapeHTML(error.message)}</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-[#68707d]">لا توجد مشتريات سابقة في حسابك.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(o => {
        const pkgTitle = o.retail_catalog ? `${o.retail_catalog.platform} - ${o.retail_catalog.package_name}` : 'باقة رقمية';
        const deliveryInfo = o.delivered_code
            ? `<span class="font-mono font-bold text-[#005ba3] dark:text-[#5CE1E6] select-all" dir="ltr">${escapeHTML(o.delivered_code)}</span>`
            : `<span class="font-mono text-[#68707d]" dir="ltr">ID: ${escapeHTML(o.player_id || '---')}</span>`;

        const reorderBtn = o.catalog_id
            ? `<button type="button" onclick="closeModal('orders-modal'); openBuyModal('${escapeHTML(o.catalog_id)}', '${escapeHTML(o.player_id || '')}');" class="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/8 hover:bg-[#005ba3] hover:text-white text-[10px] font-extrabold transition cursor-pointer">
                   <i class="ph-bold ph-arrow-counter-clockwise"></i>
                   <span>إعادة الشراء</span>
               </button>`
            : '';

        let statusHtml = '';
        if (o.status === 'completed') {
            statusHtml = `
                <div class="flex flex-col items-center">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">مكتمل ✓</span>
                    ${reorderBtn}
                </div>`;
        } else if (o.status === 'pending') {
            statusHtml = `
                <div class="flex flex-col items-center gap-1">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400">قيد التنفيذ</span>
                    <button onclick="syncPendingOrder('${escapeHTML(o.local_order_ref)}')" class="text-[10px] text-[#005ba3] dark:text-[#5CE1E6] hover:underline font-extrabold cursor-pointer">تحديث</button>
                </div>`;
        } else {
            statusHtml = `
                <div class="flex flex-col items-center">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-600">مرفوض (مسترجع)</span>
                    ${o.rejection_reason ? `<div class="text-[9px] text-rose-400 mt-0.5">${escapeHTML(o.rejection_reason)}</div>` : ''}
                    ${reorderBtn}
                </div>`;
        }

        return `
            <tr class="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                <td class="py-3.5 px-2 font-mono font-bold">${escapeHTML(o.local_order_ref)}</td>
                <td class="py-3.5 px-2 font-bold">${escapeHTML(pkgTitle)}</td>
                <td class="py-3.5 px-2">${deliveryInfo}</td>
                <td class="py-3.5 px-2 financial-amount font-extrabold text-emerald-600 dark:text-emerald-400" dir="ltr">$${Number(o.retail_price).toFixed(2)}</td>
                <td class="py-3.5 px-2 text-center">${statusHtml}</td>
            </tr>
        `;
    }).join('');
}

async function syncPendingOrder(localOrderRef, silent = false) {
    try {
        const res = await fetch('/api/sync-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ local_order_ref: localOrderRef })
        });
        const data = await res.json();
        if (data.status === 'rejected') {
            showRetailToast(`تم رفض الطلب (${data.rejection_reason || 'سبب غير محدد'}) وأُعيد المبلغ لمحفظتك`, 'warning');
            await refreshUserWallet();
        } else if (data.status === 'completed') {
            showRetailToast('اكتمل شحن الطلب بنجاح', 'success');
        } else if (!silent) {
            showRetailToast('الطلب لا يزال قيد المعالجة لدى المزود', 'info');
        }
        await checkPendingOrdersStatus();
        if (!silent) await loadUserOrdersHistory();
    } catch (err) {
        if (!silent) showRetailToast('تعذر تحديث الحالة حالياً', 'error');
    }
}

// =========================================================================
// 5. إدارة المصادقة والمظهر وحذف الحساب GDPR
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
    document.getElementById('auth-modal-title').textContent = isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول إلى حسابك';
    document.getElementById('auth-name-group').classList.toggle('hidden', !isRegister);
    document.getElementById('auth-submit-btn').textContent = isRegister ? 'إنشاء الحساب' : 'متابعة';
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
            showRetailToast('تم إنشاء حسابك بنجاح', 'success');
        } else {
            const { error } = await retailSupabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            showRetailToast('مرحباً بعودتك', 'success');
        }
        closeModal('auth-modal');
    } catch (err) {
        showRetailToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        updateAuthModalUI();
    }
}

async function handleRetailLogout() {
    await retailSupabase.auth.signOut();
    showRetailToast('تم تسجيل الخروج', 'info');
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
            showRetailToast(data.error || 'تعذر حذف الحساب حالياً', 'error');
            return;
        }
        await retailSupabase.auth.signOut();
        closeModal('orders-modal');
        showRetailToast('تم حذف حسابك وبياناتك بنجاح وفق لائحة GDPR', 'success');
    } catch (err) {
        showRetailToast('خطأ في الاتصال بالخادم: ' + err.message, 'error');
    }
};
// ==================== نهاية ملف js/retail-app.js ====================
