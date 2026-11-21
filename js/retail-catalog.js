// ==================== 2. ملف الكتالوج والفلترة والمفضلة: js/retail-catalog.js ====================

// =========================================================================
// العارض التفاعلي والأسئلة الشائعة
// =========================================================================
function initHeroCarousel() {
    const carousel = document.getElementById('hero-carousel');
    if (!carousel) return;

    startHeroAutoPlay();
    carousel.addEventListener('mouseenter', stopHeroAutoPlay);
    carousel.addEventListener('mouseleave', startHeroAutoPlay);
}

function startHeroAutoPlay() {
    stopHeroAutoPlay();
    heroAutoTimer = setInterval(() => window.stepHeroSlide(1), 6000);
}

function stopHeroAutoPlay() {
    if (heroAutoTimer) {
        clearInterval(heroAutoTimer);
        heroAutoTimer = null;
    }
}

window.goToHeroSlide = function(index) {
    const slides = document.querySelectorAll('#hero-carousel .rev-slide');
    const dots = document.querySelectorAll('#hero-carousel-dots .rev-carousel-dot');
    if (!slides.length) return;

    currentHeroSlide = ((index % slides.length) + slides.length) % slides.length;
    slides.forEach((s, idx) => s.classList.toggle('active', idx === currentHeroSlide));
    dots.forEach((d, idx) => d.classList.toggle('active', idx === currentHeroSlide));
};

window.stepHeroSlide = function(delta) {
    window.goToHeroSlide(currentHeroSlide + delta);
};

window.toggleFaqItem = function(triggerBtn) {
    if (!triggerBtn) return;
    const item = triggerBtn.closest('.rev-faq-item');
    if (!item) return;

    const isOpen = item.classList.contains('open');
    document.querySelectorAll('#faq-section .rev-faq-item.open').forEach(other => {
        if (other !== item) other.classList.remove('open');
    });
    item.classList.toggle('open', !isOpen);
};

// =========================================================================
// التصنيفات والمفضلة والمنصات
// =========================================================================
function normalizeCategoryValue(rawCat) {
    const clean = String(rawCat || '').trim();
    if (!clean) return 'CARDS';
    const upper = clean.toUpperCase();
    return ['GAMES', 'CARDS', 'STREAMING', 'SUBSCRIPTIONS'].includes(upper) ? upper : clean;
}

function getCategoryMeta(catValue) {
    const raw = normalizeCategoryValue(catValue);
    const upper = raw.toUpperCase();
    const lower = raw.toLowerCase();

    if (upper === 'ALL') return { key: 'ALL', label: t('cat_all'), icon: 'ph-fill ph-grid-four' };
    if (upper === 'GAMES' || lower.includes('العاب') || lower.includes('ألعاب') || lower.includes('game')) {
        return { key: raw, label: upper === 'GAMES' ? t('cat_games') : raw, icon: 'ph-fill ph-game-controller' };
    }
    if (upper === 'CARDS' || lower.includes('بطاقات') || lower.includes('هدايا') || lower.includes('متاجر') || lower.includes('card')) {
        return { key: raw, label: upper === 'CARDS' ? t('cat_cards') : raw, icon: 'ph-fill ph-gift' };
    }
    if (upper === 'STREAMING' || lower.includes('بث') || lower.includes('دردشة') || lower.includes('تطبيقات') || lower.includes('stream')) {
        return { key: raw, label: upper === 'STREAMING' ? t('cat_streaming') : raw, icon: 'ph-fill ph-chats-circle' };
    }
    if (upper === 'SUBSCRIPTIONS' || lower.includes('اشتراكات') || lower.includes('برامج') || lower.includes('sub')) {
        return { key: raw, label: upper === 'SUBSCRIPTIONS' ? t('cat_subscriptions') : raw, icon: 'ph-fill ph-desktop' };
    }
    return { key: raw, label: raw, icon: 'ph-fill ph-tag' };
}

function getActiveDatabaseCategories() {
    const seen = new Set();
    const dbList = [];
    catalogItems.forEach(item => {
        const cat = normalizeCategoryValue(item.category);
        if (!seen.has(cat)) {
            seen.add(cat);
            dbList.push(cat);
        }
    });
    const preferredOrder = ['GAMES', 'CARDS', 'STREAMING', 'SUBSCRIPTIONS'];
    return [
        ...preferredOrder.filter(c => dbList.includes(c)),
        ...dbList.filter(c => !preferredOrder.includes(c))
    ];
}

function getBusinessCategoryTitle(catKey) {
    return getCategoryMeta(catKey).label;
}

function renderBusinessCategoryTabs() {
    const tabsContainer = document.getElementById('business-category-tabs');
    if (!tabsContainer) return;

    const allTabs = ['ALL', ...getActiveDatabaseCategories()];
    tabsContainer.innerHTML = allTabs.map(catKey => {
        const meta = getCategoryMeta(catKey);
        const isActive = (activeBusinessCategory === catKey);
        return `
            <button type="button" onclick="setBusinessCategoryFilter('${escapeHTML(catKey)}')" data-cat="${escapeHTML(catKey)}" class="rev-cat-tab ${isActive ? 'active' : ''}">
                <i class="${meta.icon}"></i>
                <span>${escapeHTML(meta.label)}</span>
            </button>
        `;
    }).join('');
}

window.setBusinessCategoryFilter = function(catKey) {
    activeBusinessCategory = (!catKey || String(catKey).trim().toUpperCase() === 'ALL')
        ? 'ALL'
        : normalizeCategoryValue(catKey);
    activePlatformFilter = 'ALL';

    renderBusinessCategoryTabs();
    renderSidebarPlatforms();
    renderBrandHubTiles();
    renderCatalogGrid();
};

function saveFavoritesStorage() {
    localStorage.setItem('shiiftx_retail_favs', JSON.stringify([...favoriteIds]));
}

function updateFavoritesCounter() {
    const validFavs = [...favoriteIds].filter(id => catalogItems.length === 0 || catalogItems.some(i => String(i.id) === String(id)));
    const el = document.getElementById('sidebar-fav-count');
    if (el) el.textContent = String(validFavs.length);
}

window.toggleFavoritePackage = function(itemId) {
    const key = String(itemId);
    if (favoriteIds.has(key)) {
        favoriteIds.delete(key);
        showRetailToast(activeLang === 'ar' ? 'تمت الإزالة من المفضلة' : 'Removed from favorites', 'info');
    } else {
        favoriteIds.add(key);
        showRetailToast(activeLang === 'ar' ? 'تمت الإضافة إلى المفضلة ❤️' : 'Added to favorites ❤️', 'success');
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

function getPlatformFirstImageUrl(platformName) {
    const match = catalogItems.find(i => i.platform === platformName && i.image_url && String(i.image_url).trim() !== '');
    return match ? resolveCardImageUrl(match.image_url) : '';
}

function detectPackageRegion(platform, packageName) {
    const text = `${platform || ''} ${packageName || ''}`.toLowerCase();
    if (text.includes('امريكي') || text.includes('أمريكي') || text.includes('usa') || /\bus\b/.test(text) || text.includes('united states')) {
        return { flag: '🇺🇸', label: t('region_us') };
    }
    if (text.includes('اوروبي') || text.includes('أوروبي') || /\beu\b/.test(text) || text.includes('europe') || text.includes('euro')) {
        return { flag: '🇪🇺', label: t('region_eu') };
    }
    if (text.includes('سعودي') || /\bsa\b/.test(text) || text.includes('saudi') || text.includes('ksa')) {
        return { flag: '🇸🇦', label: t('region_sa') };
    }
    if (text.includes('اماراتي') || text.includes('إماراتي') || /\buae\b/.test(text) || text.includes('emirates')) {
        return { flag: '🇦🇪', label: t('region_ae') };
    }
    if (text.includes('تركي') || /\btr\b/.test(text) || text.includes('turkey') || text.includes('turkish')) {
        return { flag: '🇹🇷', label: t('region_tr') };
    }
    if (text.includes('بريطاني') || /\buk\b/.test(text) || text.includes('united kingdom')) {
        return { flag: '🇬🇧', label: t('region_uk') };
    }
    return { flag: '🌍', label: t('region_global') };
}

window.switchAppView = function(view) {
    activeAppView = view === 'favorites' ? 'favorites' : 'store';

    const btnStore = document.getElementById('nav-btn-store');
    const btnFav = document.getElementById('nav-btn-favorites');
    const carousel = document.getElementById('hero-carousel');
    const brandHub = document.getElementById('brand-hub-section');

    if (btnStore) btnStore.classList.toggle('active', activeAppView === 'store' && activePlatformFilter === 'ALL');
    if (btnFav) btnFav.classList.toggle('active', activeAppView === 'favorites');
    if (carousel) carousel.classList.toggle('hidden', activeAppView === 'favorites');
    if (brandHub) brandHub.classList.toggle('hidden', activeAppView === 'favorites');

    if (activeAppView === 'favorites') {
        document.querySelectorAll('.sidebar-platform-btn').forEach(b => b.classList.remove('active'));
    } else {
        renderSidebarPlatforms();
    }

    window.toggleMobileSidebar(false);
    renderCatalogGrid();
};

// =========================================================================
// تحميل الباقات وعرض القائمة الجانبية والشبكة
// =========================================================================
async function loadRetailCatalog() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;

    const { data, error } = await retailSupabase
        .from('retail_catalog')
        .select('id, category, platform, package_name, product_type, retail_price, image_url, instructions, is_active')
        .eq('is_active', true)
        .order('platform', { ascending: true })
        .order('retail_price', { ascending: true });

    if (error) {
        grid.innerHTML = `<div class="col-span-full rev-panel py-12 text-center text-rose-500 text-xs font-bold">${escapeHTML(error.message)}</div>`;
        return;
    }

    catalogItems = data || [];
    const totalEl = document.getElementById('sidebar-total-count');
    if (totalEl) totalEl.textContent = String(catalogItems.length);

    updateFavoritesCounter();
    renderBusinessCategoryTabs();
    renderSidebarPlatforms();
    renderBrandHubTiles();
    renderCatalogGrid();
}

function renderSidebarPlatforms() {
    const container = document.getElementById('sidebar-platform-list');
    if (!container) return;

    const btnStore = document.getElementById('nav-btn-store');
    if (btnStore) {
        btnStore.classList.toggle('active', activeAppView === 'store' && activePlatformFilter === 'ALL');
    }

    const dbCategories = getActiveDatabaseCategories();
    if (dbCategories.length === 0) {
        container.innerHTML = `<div class="px-3 py-2 text-xs text-[#68707d]">---</div>`;
        return;
    }

    container.innerHTML = dbCategories.map(catKey => {
        const catMeta = getCategoryMeta(catKey);
        const catItems = catalogItems.filter(i => normalizeCategoryValue(i.category) === catKey);
        const catPlatforms = [...new Set(catItems.map(i => i.platform).filter(Boolean))];

        return `
            <div class="space-y-1">
                <div class="rev-sidebar-cat-header sidebar-hide-collapsed">
                    <span>${escapeHTML(catMeta.label)}</span>
                    <span>${catPlatforms.length}</span>
                </div>
                ${catPlatforms.map(pl => {
                    const count = catItems.filter(i => i.platform === pl).length;
                    const isSel = (activeAppView === 'store' && activePlatformFilter === pl);
                    const firstImg = getPlatformFirstImageUrl(pl);

                    return `
                        <button type="button" onclick="filterRetailCatalog('${escapeHTML(pl)}')" data-platform="${escapeHTML(pl)}" title="${escapeHTML(pl)}" class="sidebar-platform-btn rev-nav-item ${isSel ? 'active' : ''}">
                            <span class="flex items-center gap-2.5 truncate">
                                <span class="w-8 h-8 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 shrink-0 flex items-center justify-center">
                                    ${firstImg ? `<img src="${escapeHTML(firstImg)}" alt="${escapeHTML(pl)}" loading="lazy" referrerpolicy="no-referrer" class="w-full h-full object-cover object-center">` : ''}
                                </span>
                                <span class="sidebar-hide-collapsed truncate">${escapeHTML(pl)}</span>
                            </span>
                            <span class="sidebar-hide-collapsed text-[11px] font-extrabold opacity-70 shrink-0">${count}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    }).join('');
}

function renderBrandHubTiles() {
    const grid = document.getElementById('brand-hub-grid');
    const resetBtn = document.getElementById('brand-reset-btn');
    if (!grid) return;

    if (resetBtn) {
        resetBtn.classList.toggle('hidden', activePlatformFilter === 'ALL' && activeBusinessCategory === 'ALL');
    }

    const filteredByCat = activeBusinessCategory === 'ALL'
        ? catalogItems
        : catalogItems.filter(i => normalizeCategoryValue(i.category) === activeBusinessCategory);

    const platforms = [...new Set(filteredByCat.map(i => i.platform).filter(Boolean))];

    if (platforms.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-4 text-xs text-[#68707d] px-1">${escapeHTML(t('empty_search_title'))}</div>`;
        return;
    }

    grid.innerHTML = platforms.map(pl => {
        const plItems = filteredByCat.filter(i => i.platform === pl);
        const minPrice = Math.min(...plItems.map(i => Number(i.retail_price || 0)));
        const isSel = (activeAppView === 'store' && activePlatformFilter === pl);

        const firstPkgWithImg = plItems.find(i => i.image_url && String(i.image_url).trim() !== '');
        const firstImg = firstPkgWithImg ? resolveCardImageUrl(firstPkgWithImg.image_url) : getPlatformFirstImageUrl(pl);

        return `
            <button type="button" onclick="filterRetailCatalog('${escapeHTML(pl)}')" class="rev-brand-tile ${isSel ? 'active' : ''}">
                <div class="w-12 h-12 rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/10 shrink-0 flex items-center justify-center">
                    ${firstImg ? `<img src="${escapeHTML(firstImg)}" alt="${escapeHTML(pl)}" loading="lazy" referrerpolicy="no-referrer" class="w-full h-full object-cover object-center">` : ''}
                </div>
                <div class="min-w-0 flex-1">
                    <div class="text-xs font-black truncate">${escapeHTML(pl)}</div>
                    <div class="text-[11px] font-bold text-[#68707d] dark:text-slate-400 mt-0.5">
                        ${plItems.length} ${escapeHTML(t('brand_tile_packages_word'))} <span class="financial-amount font-extrabold text-[#191c1f] dark:text-white" dir="ltr">${formatRetailMoney(minPrice)}</span>
                    </div>
                </div>
            </button>
        `;
    }).join('');
}

function filterRetailCatalog(platform) {
    activeAppView = 'store';
    activePlatformFilter = platform || 'ALL';
    if (activePlatformFilter === 'ALL') activeBusinessCategory = 'ALL';

    const btnFav = document.getElementById('nav-btn-favorites');
    const carousel = document.getElementById('hero-carousel');
    const brandHub = document.getElementById('brand-hub-section');
    if (btnFav) btnFav.classList.remove('active');
    if (carousel) carousel.classList.remove('hidden');
    if (brandHub) brandHub.classList.remove('hidden');

    renderBusinessCategoryTabs();
    renderSidebarPlatforms();
    renderBrandHubTiles();
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

function handleDeliveryTypeFilter(typeVal) {
    activeDeliveryTypeFilter = typeVal || 'ALL';
    document.querySelectorAll('#delivery-type-pills .rev-type-pill').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-type') === activeDeliveryTypeFilter);
    });
    renderCatalogGrid();
}

function handleCatalogSort(sortOrder) {
    activeSortOrder = sortOrder || 'default';
    renderCatalogGrid();
}

function renderCatalogGrid() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;

    let items = [...catalogItems];
    let viewTitle = t('breadcrumb_all_packages');

    if (activeAppView === 'favorites') {
        items = items.filter(i => favoriteIds.has(String(i.id)));
        viewTitle = t('breadcrumb_favorites');
    } else if (activePlatformFilter && activePlatformFilter !== 'ALL') {
        items = items.filter(i => i.platform === activePlatformFilter);
        viewTitle = activePlatformFilter;
    } else if (activeBusinessCategory && activeBusinessCategory !== 'ALL') {
        items = items.filter(i => normalizeCategoryValue(i.category) === activeBusinessCategory);
        viewTitle = getBusinessCategoryTitle(activeBusinessCategory);
    }

    if (activeDeliveryTypeFilter === 'ID') {
        items = items.filter(i => i.product_type && i.product_type.toUpperCase() === 'ID');
    } else if (activeDeliveryTypeFilter === 'CODE') {
        items = items.filter(i => !i.product_type || i.product_type.toUpperCase() !== 'ID');
    }

    if (activeSearchQuery) {
        items = items.filter(i => {
            const p = (i.platform || '').toLowerCase();
            const n = (i.package_name || '').toLowerCase();
            const c = (i.category || '').toLowerCase();
            const pr = String(i.retail_price || '');
            const reg = detectPackageRegion(i.platform, i.package_name).label.toLowerCase();
            return p.includes(activeSearchQuery) || n.includes(activeSearchQuery) || c.includes(activeSearchQuery) || pr.includes(activeSearchQuery) || reg.includes(activeSearchQuery);
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
    if (bcCount) bcCount.textContent = `${items.length} ${t('packages_count_suffix')}`;

    if (items.length === 0) {
        const isFavEmpty = activeAppView === 'favorites' && !activeSearchQuery;
        grid.innerHTML = `
            <div class="col-span-full rev-panel py-14 px-4 text-center space-y-3">
                <i class="ph-fill ${isFavEmpty ? 'ph-heart-break' : 'ph-magnifying-glass'} text-3xl text-[#68707d]"></i>
                <p class="text-sm font-black">${escapeHTML(isFavEmpty ? t('empty_fav_title') : t('empty_search_title'))}</p>
                <p class="text-xs text-[#68707d] dark:text-slate-400">${escapeHTML(isFavEmpty ? t('empty_fav_desc') : t('empty_search_desc'))}</p>
                <div class="pt-1">
                    <button type="button" onclick="clearCatalogSearch(); handleDeliveryTypeFilter('ALL'); switchAppView('store'); filterRetailCatalog('ALL');" class="rev-btn-primary px-5 py-2 text-xs">
                        ${escapeHTML(t('breadcrumb_all_packages'))}
                    </button>
                </div>
            </div>`;
        return;
    }

    grid.className = 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4';

    grid.innerHTML = items.map(item => {
        const safeId = escapeHTML(item.id);
        const platformName = escapeHTML(item.platform || 'Digital Card');
        const pkgName = escapeHTML(item.package_name || 'Package');
        const priceFormatted = formatRetailMoney(item.retail_price);
        const isID = (item.product_type && item.product_type.toUpperCase() === 'ID');
        const isFav = favoriteIds.has(String(item.id));
        const region = detectPackageRegion(item.platform, item.package_name);

        const badgeText = isID ? t('badge_direct_id') : t('badge_instant_code');
        const badgeDot = isID ? 'bg-amber-400' : 'bg-emerald-400';
        const imgUrl = resolveCardImageUrl(item.image_url);

        const visualBlock = imgUrl
            ? `<img src="${escapeHTML(imgUrl)}" alt="${pkgName}" loading="lazy" referrerpolicy="no-referrer"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                    class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500">
               <div style="display:none;" class="w-full h-full bg-gradient-to-br from-[#0b1324] via-[#102544] to-[#005ba3] flex-col items-center justify-center p-4 text-center">
                   <span class="text-xs font-extrabold text-white/85 tracking-wide">${platformName}</span>
               </div>`
            : `<div class="w-full h-full bg-gradient-to-br from-[#0b1324] via-[#102544] to-[#005ba3] flex flex-col items-center justify-center p-4 text-center">
                   <span class="text-xs font-extrabold text-white/85 tracking-wide">${platformName}</span>
               </div>`;

        return `
            <article data-id="${safeId}" onclick="openPackageDetailsModal(this.dataset.id)" class="rev-product-card group rounded-[20px]">
                <div class="relative w-full h-32 sm:h-36 bg-[#0b1324] overflow-hidden">
                    ${visualBlock}
                    <div class="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none"></div>

                    <span class="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white text-[10px] font-extrabold inline-flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full ${badgeDot}"></span>
                        <span>${escapeHTML(badgeText)}</span>
                    </span>

                    <button type="button" data-id="${safeId}" aria-label="إضافة إلى المفضلة" onclick="event.stopPropagation(); toggleFavoritePackage(this.dataset.id);"
                            class="rev-fav-btn ${isFav ? 'is-fav' : ''} absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-black/55 hover:bg-rose-500 text-white backdrop-blur-md border border-white/15 flex items-center justify-center transition cursor-pointer">
                        <i class="ph-fill ph-heart text-xs"></i>
                    </button>

                    <span class="absolute bottom-2 right-3 text-[10px] font-extrabold text-white/95 tracking-wide truncate max-w-[85%]">
                        ${platformName}
                    </span>
                </div>

                <div class="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                    <div class="space-y-1.5">
                        <div class="rev-region-badge text-[10px] px-2 py-0.5">
                            <span>${region.flag}</span>
                            <span class="truncate">${escapeHTML(region.label)}</span>
                        </div>
                        <h3 class="text-xs sm:text-sm font-black leading-snug line-clamp-2 group-hover:text-[#005ba3] dark:group-hover:text-[#5CE1E6] transition-colors">
                            ${pkgName}
                        </h3>
                    </div>

                    <div class="pt-2.5 border-t border-black/6 dark:border-white/8 flex items-center justify-between gap-2">
                        <div class="min-w-0">
                            <span class="block text-[9px] font-bold text-[#68707d] dark:text-slate-400 truncate">${escapeHTML(t('label_tax_included'))}</span>
                            <span class="financial-amount text-sm sm:text-base font-black" dir="ltr">${priceFormatted}</span>
                        </div>

                        <button type="button" data-id="${safeId}" onclick="event.stopPropagation(); handleCardDirectBuy(this.dataset.id);"
                                class="rev-btn-primary px-3.5 py-2 text-[11px] shrink-0">
                            <span>${escapeHTML(t('btn_buy'))}</span>
                            <i class="ph-bold ph-arrow-left text-[10px]"></i>
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}
// ==================== نهاية ملف js/retail-catalog.js ====================
