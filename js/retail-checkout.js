// ==================== 3. ملف الدفع والمحفظة والقسائم والطلبات: js/retail-checkout.js ====================

// =========================================================================
// معرّفات اللاعبين المحفوظة
// =========================================================================
function getSavedPlayerIdsMap() {
    try {
        return JSON.parse(localStorage.getItem('shiiftx_saved_player_ids') || '{}');
    } catch (_e) {
        return {};
    }
}

function getSavedPlayerIdsForPlatform(platform) {
    const key = (platform || 'GENERAL').trim().toUpperCase();
    const map = getSavedPlayerIdsMap();
    return Array.isArray(map[key]) ? map[key] : [];
}

function savePlayerIdForPlatform(platform, playerId) {
    const cleanId = (playerId || '').trim();
    if (!cleanId) return;
    const key = (platform || 'GENERAL').trim().toUpperCase();
    const map = getSavedPlayerIdsMap();
    const existing = Array.isArray(map[key]) ? map[key].filter(id => id !== cleanId) : [];
    existing.unshift(cleanId);
    map[key] = existing.slice(0, 4);
    localStorage.setItem('shiiftx_saved_player_ids', JSON.stringify(map));
}

window.removeSavedPlayerId = function(platform, playerId) {
    const key = (platform || 'GENERAL').trim().toUpperCase();
    const map = getSavedPlayerIdsMap();
    if (!Array.isArray(map[key])) return;
    map[key] = map[key].filter(id => id !== playerId);
    localStorage.setItem('shiiftx_saved_player_ids', JSON.stringify(map));
    renderSavedPlayerIdsBar(platform);
};

window.selectSavedPlayerId = function(playerId) {
    const input = document.getElementById('buy-player-id');
    if (input) {
        input.value = playerId;
        input.focus();
    }
};

function renderSavedPlayerIdsBar(platform) {
    const bar = document.getElementById('saved-player-ids-bar');
    if (!bar) return;

    const savedList = getSavedPlayerIdsForPlatform(platform);
    if (savedList.length === 0) {
        bar.innerHTML = '';
        bar.classList.add('hidden');
        bar.classList.remove('flex');
        return;
    }

    bar.classList.remove('hidden');
    bar.classList.add('flex');
    bar.innerHTML = `<span class="text-[10px] font-extrabold text-[#68707d] dark:text-slate-400">${escapeHTML(t('checkout_saved_ids_label'))}</span>` +
        savedList.map(pid => `
            <div class="inline-flex items-center rounded-full bg-[#eef0f4] dark:bg-[#181c25] border border-black/8 dark:border-white/10 overflow-hidden">
                <button type="button" onclick="selectSavedPlayerId('${escapeHTML(pid)}')" class="px-2.5 py-1 text-[11px] font-mono font-bold text-[#005ba3] dark:text-[#5CE1E6] hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer" dir="ltr">
                    ${escapeHTML(pid)}
                </button>
                <button type="button" onclick="removeSavedPlayerId('${escapeHTML(platform)}', '${escapeHTML(pid)}')" class="px-1.5 py-1 text-[10px] text-[#68707d] hover:text-rose-500 transition cursor-pointer">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>
        `).join('');
}

// =========================================================================
// درج تفاصيل الباقة وشحن المحفظة وتفعيل القسائم
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

    const region = detectPackageRegion(item.platform, item.package_name);
    const platEl = document.getElementById('pkg-detail-platform');
    const regEl = document.getElementById('pkg-detail-region');
    const titleEl = document.getElementById('pkg-detail-title');
    const priceEl = document.getElementById('pkg-detail-price');
    const instEl = document.getElementById('pkg-detail-instructions');
    const buyBtn = document.getElementById('pkg-detail-buy-btn');

    if (platEl) platEl.textContent = item.platform || 'Digital Card';
    if (regEl) regEl.textContent = `${region.flag} ${region.label}`;
    if (titleEl) titleEl.textContent = item.package_name || 'Package';
    if (priceEl) priceEl.textContent = formatRetailMoney(item.retail_price);

    const isID = (item.product_type && item.product_type.toUpperCase() === 'ID');
    const defaultNote = isID ? t('default_inst_id') : t('default_inst_code');

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

function renderTopupAmountChips() {
    document.querySelectorAll('.topup-amt-btn').forEach(btn => {
        const usdAmt = Number(btn.getAttribute('data-amt') || 25);
        btn.textContent = formatRetailMoney(usdAmt);
        btn.classList.toggle('active', usdAmt === selectedTopupAmount);
    });
}

window.selectTopupAmount = function(usdAmt) {
    selectedTopupAmount = Number(usdAmt || 25);
    renderTopupAmountChips();
};

window.selectTopupMethod = function(method) {
    selectedTopupMethod = method === 'PAYPAL' ? 'PAYPAL' : 'CARD';
    const cardEl = document.getElementById('pay-method-card');
    const ppEl = document.getElementById('pay-method-paypal');
    if (cardEl) cardEl.classList.toggle('active', selectedTopupMethod === 'CARD');
    if (ppEl) ppEl.classList.toggle('active', selectedTopupMethod === 'PAYPAL');
};

window.proceedTopupRequest = function() {
    showRetailToast(
        activeLang === 'ar'
            ? 'بوابة الدفع بالبطاقات وPayPal قيد الربط النهائي. يمكنك حالياً تفعيل قسيمة شحن SHIIFT X في الأعلى.'
            : 'Card & PayPal gateway integration is being finalized. You can currently redeem a SHIIFT X voucher above.',
        'info'
    );
};

window.openTopupModal = function() {
    if (!currentUser) {
        showRetailToast(activeLang === 'ar' ? 'يرجى تسجيل الدخول أولاً لإضافة رصيد المتجر' : 'Please sign in first to add store credit', 'info');
        openAuthModal('login');
        return;
    }
    const emailEl = document.getElementById('topup-user-email');
    if (emailEl) emailEl.textContent = currentUser.email || '---';
    renderTopupAmountChips();
    const modal = document.getElementById('topup-modal');
    if (modal) modal.classList.remove('hidden');
};

window.copyTopupEmail = function() {
    if (!currentUser || !currentUser.email) return;
    navigator.clipboard.writeText(currentUser.email);
    showRetailToast(activeLang === 'ar' ? 'تم نسخ بريد حسابك بنجاح' : 'Account email copied', 'success');
};

window.redeemStoreVoucher = async function() {
    if (!currentUser) {
        closeModal('topup-modal');
        openAuthModal('login');
        return;
    }

    const input = document.getElementById('redeem-voucher-input');
    const btn = document.getElementById('btn-redeem-voucher');
    const code = (input?.value || '').trim();

    if (!code || code.length < 4) {
        showRetailToast('يرجى إدخال كود القسيمة بشكل صحيح', 'warning');
        return;
    }

    btn.disabled = true;
    try {
        const { data: addedAmount, error } = await retailSupabase.rpc('redeem_retail_voucher', {
            p_code: code
        });
        if (error) throw error;

        input.value = '';
        await refreshUserWallet();
        closeModal('topup-modal');
        showRetailToast(`تم تفعيل القسيمة بنجاح وإضافة $${Number(addedAmount).toFixed(2)} إلى رصيدك!`, 'success');
    } catch (err) {
        showRetailToast(err.message || 'تعذر تفعيل القسيمة', 'error');
    } finally {
        btn.disabled = false;
    }
};

// =========================================================================
// تنفيذ الشراء الذكي عبر (/api/buy) وسجل الطلبات
// =========================================================================
function updateCheckoutWalletPreview(price) {
    const itemPrice = Number(price || 0);
    const currentEl = document.getElementById('checkout-current-balance');
    const afterLabel = document.getElementById('checkout-after-label');
    const afterEl = document.getElementById('checkout-after-balance');
    const shortfallBox = document.getElementById('checkout-shortfall-box');
    const confirmBtn = document.getElementById('btn-confirm-purchase');

    if (currentEl) currentEl.textContent = formatRetailMoney(currentWalletBalance);

    const diff = currentWalletBalance - itemPrice;
    if (diff >= -0.0001) {
        const remaining = Math.max(0, diff);
        if (afterLabel) afterLabel.textContent = t('checkout_remaining_after');
        if (afterEl) {
            afterEl.textContent = formatRetailMoney(remaining);
            afterEl.className = 'financial-amount font-black text-emerald-600 dark:text-emerald-400';
        }
        if (shortfallBox) shortfallBox.classList.add('hidden');
        if (confirmBtn) confirmBtn.disabled = false;
    } else {
        const needed = Math.abs(diff);
        if (afterLabel) afterLabel.textContent = t('checkout_shortfall_needed');
        if (afterEl) {
            afterEl.textContent = `-${formatRetailMoney(needed)}`;
            afterEl.className = 'financial-amount font-black text-rose-600 dark:text-rose-400';
        }
        if (shortfallBox) shortfallBox.classList.remove('hidden');
        if (confirmBtn) confirmBtn.disabled = true;
    }
}

async function openBuyModal(catalogId, prefillPlayerId = '') {
    if (!currentUser || !currentSession) {
        showRetailToast(activeLang === 'ar' ? 'يرجى تسجيل الدخول لإتمام الطلب' : 'Please sign in to complete your order', 'info');
        openAuthModal('login');
        return;
    }

    const item = catalogItems.find(i => String(i.id) === String(catalogId));
    if (!item) return;

    await refreshUserWallet();

    const waiver = document.getElementById('eu-withdrawal-waiver');
    if (waiver) waiver.checked = false;

    const region = detectPackageRegion(item.platform, item.package_name);
    document.getElementById('buy-catalog-id').value = item.id;
    document.getElementById('buy-product-type').value = item.product_type;
    document.getElementById('buy-modal-platform').textContent = item.platform;
    document.getElementById('buy-modal-package').textContent = item.package_name;
    document.getElementById('buy-modal-price').textContent = formatRetailMoney(item.retail_price);

    const regEl = document.getElementById('buy-modal-region');
    if (regEl) regEl.textContent = `${region.flag} ${region.label}`;

    updateCheckoutWalletPreview(item.retail_price);

    const pidGroup = document.getElementById('buy-playerid-group');
    const pidInput = document.getElementById('buy-player-id');
    const isID = (item.product_type && item.product_type.toUpperCase() === 'ID');

    if (isID) {
        pidGroup.classList.remove('hidden');
        const savedIds = getSavedPlayerIdsForPlatform(item.platform);
        pidInput.value = prefillPlayerId || (savedIds[0] || '');
        renderSavedPlayerIdsBar(item.platform);
    } else {
        pidGroup.classList.add('hidden');
        pidInput.value = '';
    }

    document.getElementById('buy-confirm-step').classList.remove('hidden');
    document.getElementById('buy-result-step').classList.add('hidden');
    document.getElementById('buy-modal').classList.remove('hidden');
    const consentBox = document.getElementById('eu-withdrawal-waiver');
if (consentBox) consentBox.checked = false;
toggleCheckoutSubmitState();
}

async function executeRetailPurchase() {
    const catalogId = document.getElementById('buy-catalog-id').value;
    const productType = document.getElementById('buy-product-type').value;
    const platformName = document.getElementById('buy-modal-platform').textContent;
    const playerId = document.getElementById('buy-player-id').value.trim();
    const btn = document.getElementById('btn-confirm-purchase');
    const isID = (productType && productType.toUpperCase() === 'ID');

    if (isID && !playerId) {
        showRetailToast(activeLang === 'ar' ? 'يرجى إدخال معرّف اللاعب (Player ID)' : 'Please enter your Player ID', 'warning');
        return;
    }

    const waiverChecked = document.getElementById('eu-withdrawal-waiver')?.checked;
    if (!waiverChecked) {
        showRetailToast(activeLang === 'ar' ? 'يرجى الموافقة على شرط التنفيذ الفوري الأوروبي' : 'Please accept the EU immediate execution waiver', 'warning');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span>...</span>`;

    try {
        const response = await fetch('/api/buy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentSession.access_token}`
            },
            body: JSON.stringify({
                catalog_id: catalogId,
                player_id: isID ? playerId : null
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            if (result.remaining_balance !== undefined) {
                syncAuthUIState(true, result.remaining_balance);
            }
            showRetailToast(result.error || 'Checkout error', 'error');
            return;
        }

        if (isID && playerId) {
            savePlayerIdForPlatform(platformName, playerId);
        }

        syncAuthUIState(true, result.remaining_balance);

        document.getElementById('buy-confirm-step').classList.add('hidden');
        document.getElementById('buy-result-step').classList.remove('hidden');
        document.getElementById('buy-result-ref').textContent = result.order_ref;

        if (result.fulfillment_status === 'pending') {
            document.getElementById('buy-code-box').classList.add('hidden');
            document.getElementById('buy-pending-box').classList.remove('hidden');
            showRetailToast(activeLang === 'ar' ? 'تم إرسال طلب الشحن المباشر بنجاح' : 'Direct top-up order submitted', 'success');
            await checkPendingOrdersStatus();
        } else {
            document.getElementById('buy-delivered-code').value = result.card_code;
            document.getElementById('buy-code-box').classList.remove('hidden');
            document.getElementById('buy-pending-box').classList.add('hidden');
            showRetailToast(activeLang === 'ar' ? 'تم الشراء وتسليم الكود الرقمي بنجاح' : 'Purchase completed & code delivered', 'success');
        }
    } catch (err) {
        showRetailToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="ph-fill ph-lock-key text-base"></i><span>${escapeHTML(t('btn_confirm_pay'))}</span>`;
    }
}

function copyDeliveredCode() {
    const input = document.getElementById('buy-delivered-code');
    navigator.clipboard.writeText(input.value);
    showRetailToast(activeLang === 'ar' ? 'تم نسخ الكود الرقمي إلى الحافظة' : 'Digital code copied to clipboard', 'success');
}

async function checkPendingOrdersStatus() {
    const banner = document.getElementById('pending-order-banner');
    const countEl = document.getElementById('pending-orders-count');
    if (!currentUser || !banner) return;

    const { data, error } = await retailSupabase
        .from('retail_orders')
        .select('local_order_ref')
        .eq('user_id', currentUser.id)
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
    for (const ref of pendingOrderRefs) {
        await syncPendingOrder(ref, true);
    }
    await checkPendingOrdersStatus();
};

async function openOrdersModal() {
    if (!currentUser) {
        openAuthModal('login');
        return;
    }
    document.getElementById('orders-modal').classList.remove('hidden');
    await loadUserOrdersHistory();
}

async function loadUserOrdersHistory() {
    if (!currentUser) return;
    const tbody = document.getElementById('retail-orders-tbody');
    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-[#68707d]">...</td></tr>`;

    const { data, error } = await retailSupabase
        .from('retail_orders')
        .select('catalog_id, local_order_ref, retail_price, player_id, delivered_code, status, rejection_reason, created_at, retail_catalog(platform, package_name)')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-rose-500">${escapeHTML(error.message)}</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-[#68707d]">---</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(o => {
        const pkgTitle = o.retail_catalog ? `${o.retail_catalog.platform} - ${o.retail_catalog.package_name}` : 'Digital Package';
        const deliveryInfo = o.delivered_code
            ? `<span class="font-mono font-bold text-[#005ba3] dark:text-[#5CE1E6] select-all" dir="ltr">${escapeHTML(o.delivered_code)}</span>`
            : `<span class="font-mono text-[#68707d]" dir="ltr">ID: ${escapeHTML(o.player_id || '---')}</span>`;

        const reorderBtn = o.catalog_id
            ? `<button type="button" onclick="closeModal('orders-modal'); openBuyModal('${escapeHTML(o.catalog_id)}', '${escapeHTML(o.player_id || '')}');" class="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/8 hover:bg-[#005ba3] hover:text-white text-[10px] font-extrabold transition cursor-pointer">
                   <i class="ph-bold ph-arrow-counter-clockwise"></i>
                   <span>${escapeHTML(t('btn_reorder'))}</span>
               </button>`
            : '';

        let statusHtml = '';
        if (o.status === 'completed') {
            statusHtml = `
                <div class="flex flex-col items-center">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">${escapeHTML(t('status_completed'))}</span>
                    ${reorderBtn}
                </div>`;
        } else if (o.status === 'pending') {
            statusHtml = `
                <div class="flex flex-col items-center gap-1">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400">${escapeHTML(t('status_pending'))}</span>
                    <button onclick="syncPendingOrder('${escapeHTML(o.local_order_ref)}')" class="text-[10px] text-[#005ba3] dark:text-[#5CE1E6] hover:underline font-extrabold cursor-pointer">${escapeHTML(t('btn_update_short'))}</button>
                </div>`;
        } else {
            statusHtml = `
                <div class="flex flex-col items-center">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-600">${escapeHTML(t('status_rejected'))}</span>
                    ${o.rejection_reason ? `<div class="text-[9px] text-rose-400 mt-0.5">${escapeHTML(o.rejection_reason)}</div>` : ''}
                    ${reorderBtn}
                </div>`;
        }

        return `
            <tr class="hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                <td class="py-3.5 px-2 font-mono font-bold">${escapeHTML(o.local_order_ref)}</td>
                <td class="py-3.5 px-2 font-bold">${escapeHTML(pkgTitle)}</td>
                <td class="py-3.5 px-2">${deliveryInfo}</td>
                <td class="py-3.5 px-2 financial-amount font-extrabold text-emerald-600 dark:text-emerald-400" dir="ltr">${formatRetailMoney(o.retail_price)}</td>
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
            showRetailToast(activeLang === 'ar' ? 'تم رفض الطلب وإعادة المبلغ لمحفظتك' : 'Order rejected and refunded to wallet', 'warning');
            await refreshUserWallet();
        } else if (data.status === 'completed') {
            showRetailToast(activeLang === 'ar' ? 'اكتمل شحن الطلب بنجاح' : 'Order completed successfully', 'success');
        }
        await checkPendingOrdersStatus();
        if (!silent) await loadUserOrdersHistory();
    } catch (_err) {
        if (!silent) showRetailToast('Error syncing order', 'error');
    }
}

function toggleCheckoutSubmitState() {
    const checkbox = document.getElementById('eu-withdrawal-waiver');
    const submitBtn = document.getElementById('btn-confirm-purchase');
    if (!checkbox || !submitBtn) return;

    submitBtn.disabled = !checkbox.checked;
    submitBtn.classList.toggle('opacity-50', !checkbox.checked);
    submitBtn.classList.toggle('cursor-not-allowed', !checkbox.checked);
}
// ==================== نهاية ملف js/retail-checkout.js ====================
