// ========================================================================
// SHIIFT X — وحدة المتجر والشراء والتمويل (Store & Checkout Controller)
// ========================================================================

// دالة مساعدة مركزية: التحقق مما إذا كانت الباقة مخصصة لشحن رصيد الهاتف
function isPhoneProduct(product) {
    if (!product) return false;
    
    // 1. التحقق المباشر من المعرف التقني الموحد
    if ((product.input_type || '').toUpperCase() === 'PHONE') return true;

    // 2. فحص احتياطي ذكي لكلمات وتصنيفات رصيد الجوال واللهجة المحلية
    const cat = (product.category || '').toLowerCase();
    const plat = (product.platform || '').toLowerCase();
    const syrianKeywords = [
    // --- شركة سيريتل ومشتقاتها (Syriatel) ---
    'سيريتل', 'سيرياتيل', 'سريتل', 'سيرياتل', 'سيريا تل', 'سرياتل',
    'syriatel', 'syria tel', 'syriatelecom', 'syria-tel', 'syratel',
    'عبيلي', 'عبي لي', 'يا هلا', 'ياهلا', 'سيرف',

    // --- شركة MTN سوريا ومشتقاتها ---
    'ام تي ان', 'إم تي إن', 'امتيان', 'ام تى ان', 'ام تيان', 'ام تي ان سوريا',
    'mtn', 'mtn syria', 'mtnsyria', 'mtn-syria', 'm.t.n',
    'حوللي', 'حول لي', 'يلا ام تي ان',

    // --- المشغل الثالث: وفا تلكوم (Wafa Telecom) ---
    'وفا', 'وفا تلكوم', 'وفا تليكوم', 'وفا تيليكوم', 'شبكة وفا', 'وفا تيل',
    'wafa', 'wafa telecom', 'wafatelecom', 'wafa-telecom', 'wafatel', 'stc',


    // --- المصطلحات الشعبية واللهجة السورية للرصيد والوحدات ---
    'وحدات', 'وحدة', 'وحده',
    'تعبئة', 'تعبئه', 'تعباية', 'تعبايه',
    'رصيد', 'رصيد جوال', 'رصيد هاتف', 'رصيد سوري',
    'شحن خط', 'شحن خطوط', 'خط خلوي', 'خطوط خلوية',
    'كروت', 'كرت', 'كروت شحن', 'كرت شحن', 'كروت سيريتل', 'كروت ام تي ان',
    'مسبق الدفع', 'باقات نت', 'باقات اتصال',

    // --- المصطلحات التقنية والإنجليزية (Telecom / Top-Up) ---
    'telecom', 'topup', 'top-up', 'recharge', 'airtime', 'syrian units'
];
    
    return syrianKeywords.some(k => cat.includes(k) || plat.includes(k));
}

// 1. جلب المنتجات النشطة من قاعدة البيانات مباشرة
async function fetchStoreProductsDirectly() { 
    const { data: prods, error } = await supabase
        .from('products')
        .select('*')
        .in('status', ['active', 'نشط']);

    if (error) {
        console.error("Error fetching products:", error);
        return;
    }

    if (prods) {
        globalProductsRaw = prods.map(p => ({
            id: p.id, 
            category: p.category, 
            platform: p.platform, 
            package_name: p.package_name, 
            price: parseFloat(p.price), 
            type: p.product_type, 
            image_url: p.image_url,
            input_type: p.input_type || (isPhoneProduct(p) ? 'PHONE' : 'PLAYER_ID')
        }));

        const storeView = document.getElementById('view-store');
        if (storeView && !storeView.classList.contains('hidden')) {
            renderMainCategoriesView();
        }
    }
}

// 2. عرض مجموعات وتصنيفات المتجر الرئيسية
function renderMainCategoriesView() {
    const titleText = document.getElementById('store-title-text');
    if (titleText) titleText.innerHTML = `متجر المجموعات الرقمية`;
    
    const backBtn = document.getElementById('store-nested-back-btn');
    if (backBtn) backBtn.classList.add('hidden');

    const innerGrid = document.getElementById('store-interactive-box'); 
    if (!innerGrid) return;
    innerGrid.innerHTML = `<div id="dash-categories-container" class="grid grid-cols-2 gap-4"></div>`;
    
    const categories = [...new Set(globalProductsRaw.map(p => p.category))];
    const container = document.getElementById('dash-categories-container');

    categories.forEach(cat => {
        const div = document.createElement('div'); 
        div.className = "glass-panel flex flex-col items-center justify-center gap-3 h-32 cursor-pointer font-black text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/80 hover:border-blue-500/50 transition";
        div.innerHTML = `<span>${cat}</span>`; 
        div.onclick = () => renderNestedPlatformsView(cat); 
        container.appendChild(div);
    });
}

// 3. عرض المنصات التابعة لتصنيف محدد
function renderNestedPlatformsView(categoryName) {
    const titleText = document.getElementById('store-title-text');
    if (titleText) titleText.innerHTML = `منصات: ${categoryName}`;
    
    const backBtn = document.getElementById('store-nested-back-btn');
    if (backBtn) backBtn.classList.remove('hidden');

    const innerList = document.getElementById('store-interactive-box');
    if (!innerList) return;
    innerList.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right"></div>`;
    
    const platforms = [...new Set(globalProductsRaw.filter(p => p.category === categoryName).map(p => p.platform))];
    const container = innerList.querySelector('div');

    platforms.forEach(pName => {
        const platformItem = globalProductsRaw.find(p => p.category === categoryName && p.platform === pName);
        const iconUrl = platformItem && platformItem.image_url ? platformItem.image_url : '';

        const div = document.createElement('div');
        div.className = "card-lift bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex justify-between items-center cursor-pointer shadow-sm";
        div.onclick = () => openPlansModal(pName, categoryName);
        
        div.innerHTML = `
            <div class="flex items-center gap-3.5">
                ${iconUrl ? `<img src="${iconUrl}" alt="${pName}" referrerpolicy="no-referrer" class="w-12 h-12 rounded-xl object-contain bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/10 p-1.5 shadow-sm">` : `<div class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base">${pName[0]}</div>`}
                <div>
                    <span class="font-black text-sm text-slate-800 dark:text-slate-100 block">${pName}</span>
                    <span class="text-[10px] text-slate-400 font-bold">باقات وشحن فوري</span>
                </div>
            </div>
            <span class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm transition"><i class="ph ph-caret-left font-bold"></i></span>
        `;
        container.appendChild(div);
    });
}

// 4. فتح نافذة الباقات للمنصة المختارة
function openPlansModal(platformName, categoryName) { 
    document.getElementById('plans-modal-title').innerText = `باقات منصة ${platformName}`; 
    const container = document.getElementById('plans-container'); 
    container.innerHTML = ""; 
    
    const plans = globalProductsRaw.filter(p => p.category === categoryName && p.platform === platformName); 
    
    plans.forEach(plan => { 
        const isCode = plan.type === 'CODE';
        const isPhone = isPhoneProduct(plan);
        const card = document.createElement('div'); 
        card.className = "card-lift bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-[22px] flex justify-between items-center gap-3 text-right shadow-sm"; 
        
        let badgeHtml = '';
        if (isCode) {
            badgeHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"><i class="ph-fill ph-lightning"></i> كود فوري</span>`;
        } else if (isPhone) {
            badgeHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"><i class="ph-fill ph-phone-call"></i> شحن رصيد</span>`;
        } else {
            badgeHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"><i class="ph-fill ph-user-circle"></i> شحن بالمعرف</span>`;
        }

        card.innerHTML = `
            <div class="flex items-center gap-3.5">
                ${plan.image_url ? `<img src="${plan.image_url}" alt="${plan.package_name}" referrerpolicy="no-referrer" class="w-12 h-12 rounded-xl object-contain bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/10 p-1 shrink-0 shadow-inner">` : ''}
                <div class="flex flex-col gap-1">
                    <span class="text-xs font-black text-slate-800 dark:text-slate-100 leading-snug">${plan.package_name}</span>
                    <div>${badgeHtml}</div>
                </div>
            </div>
            <div class="flex flex-col items-end gap-1.5 shrink-0">
                <span class="text-base font-black text-blue-600 dark:text-blue-400 tabular-numeric financial-amount">$${plan.price.toFixed(2)}</span>
                <button onclick="openAccountInputsModal('${plan.id}', '${plan.package_name}', ${plan.price})" class="btn-primary text-white text-[11px] font-bold px-4 py-2 rounded-xl transition shadow-sm active:scale-95">شراء</button>
            </div>
        `; 
        container.appendChild(card); 
    }); 
    toggleView('plans-modal', true); 
}

// 5. فتح نافذة إدخال المعرف (ID) أو رقم الهاتف أو إشعار الكود
function openAccountInputsModal(productId, fullName, price) { 
    selectedProductId = productId; 
    selectedItemName = fullName; 
    selectedItemPrice = price; 
    
    const inputMain = document.getElementById('target-player-id');
    const inputConfirm = document.getElementById('target-player-id-confirm');
    if (inputMain) inputMain.value = "";
    if (inputConfirm) inputConfirm.value = "";
    
    const prod = globalProductsRaw.find(p => p.id === productId);
    const isIdFlow = prod && (prod.type || '').trim().toUpperCase() === "ID"; 
    const isPhone = isPhoneProduct(prod);

    // البحث المرن عن التسميات النصية (عبر الـ ID أو بالـ querySelector)
    const mainLabel = document.getElementById('target-id-label') || document.querySelector('#id-fields-container > div:first-child label');
    const confirmLabel = document.getElementById('target-id-confirm-label') || document.querySelector('#id-fields-container > div:last-child label');

    if (isPhone) {
        if (mainLabel) mainLabel.innerText = "أدخل رقم الهاتف";
        if (confirmLabel) confirmLabel.innerText = "تأكيد رقم الهاتف";
        if (inputMain) {
            inputMain.placeholder = "09xxxxxxxx";
            inputMain.type = "tel";
            inputMain.maxLength = 10;
        }
        if (inputConfirm) {
            inputConfirm.placeholder = "أعد إدخال رقم الهاتف للتأكيد";
            inputConfirm.type = "tel";
            inputConfirm.maxLength = 10;
        }
    } else {
        if (mainLabel) mainLabel.innerText = "أدخل معرف العميل (ID)";
        if (confirmLabel) confirmLabel.innerText = "تأكيد معرف العميل (ID)";
        if (inputMain) {
            inputMain.placeholder = "مثال: 123456789";
            inputMain.type = "text";
            inputMain.removeAttribute('maxLength');
        }
        if (inputConfirm) {
            inputConfirm.placeholder = "أعد إدخال المعرف للتأكيد";
            inputConfirm.type = "text";
            inputConfirm.removeAttribute('maxLength');
        }
    }
    
    toggleView('id-fields-container', isIdFlow); 
    toggleView('code-fields-notice', !isIdFlow); 
    toggleView('account-inputs-modal', true); 
} 

// 6. المتابعة إلى شاشة مراجعة الفاتورة النهائية مع التحقق الصارم
function proceedToReview() { 
    const prod = globalProductsRaw.find(p => p.id === selectedProductId);
    const isIdFlow = prod && (prod.type || '').trim().toUpperCase() === "ID";
    const isPhone = isPhoneProduct(prod);

    if (isIdFlow) { 
        inputPlayerId = document.getElementById('target-player-id').value.trim(); 
        inputPlayerIdConfirm = document.getElementById('target-player-id-confirm').value.trim(); 
        
        if (!inputPlayerId) {
            return showCustomAlert(isPhone ? "يرجى إدخال رقم الهاتف للمتابعة." : "يرجى إدخال معرف الحساب (ID)."); 
        }

        if (inputPlayerId !== inputPlayerIdConfirm) {
            return showCustomAlert(isPhone ? "رقم الهاتف وتأكيده غير متطابقين." : "معرف الحساب غير متطابق."); 
        }

        // فحص صيغة أرقام الهواتف السورية (يبدأ بـ 09 ويتألف من 10 أرقام تماماً)
        if (isPhone) {
            const syrianPhoneRegex = /^09\d{8}$/;
            if (!syrianPhoneRegex.test(inputPlayerId)) {
                return showCustomAlert("رقم الهاتف غير صالح! يجب أن يبدأ بـ 09 ويتكون من 10 أرقام تماماً (مثال: 0933222111).");
            }
        }

        // تحديث عنوان الصف في بطاقة الفاتورة
        const reviewIdLabel = document.querySelector('#review-id-row span:first-child');
        if (reviewIdLabel) {
            reviewIdLabel.innerText = isPhone ? "رقم الهاتف المطلوب:" : "معرف الشحن (ID):";
        }

        document.getElementById('review-item-player-id').innerText = inputPlayerId; 
        document.getElementById('review-item-delivery-type').innerText = isPhone ? `شحن فوري للرصيد` : `شحن مباشر`; 
        toggleView('review-id-row', true);
    } else { 
        inputPlayerId = "";
        inputPlayerIdConfirm = "";
        toggleView('review-id-row', false); 
        document.getElementById('review-item-delivery-type').innerText = `تسليم الكود فوراً`; 
    } 
    
    // تصفير بيانات الكوبون عند كل فتح جديد
    activeCoupon = null;
    discountedPrice = selectedItemPrice;
    const cInput = document.getElementById('coupon-code-input'); if (cInput) cInput.value = "";
    const cMsg = document.getElementById('coupon-status-msg'); if (cMsg) { cMsg.className = "text-[10px] mt-1.5 hidden font-bold"; cMsg.innerText = ""; }
    const dRow = document.getElementById('discount-breakdown-row'); if (dRow) { dRow.classList.add('hidden'); dRow.classList.remove('flex'); }

    toggleView('account-inputs-modal', false); 
    document.getElementById('review-item-name').innerText = selectedItemName; 
    document.getElementById('review-item-price').innerText = "$" + selectedItemPrice.toFixed(2); 
    toggleView('purchase-modal', true); 
}

// 7. تطبيق وفحص كود الخصم الترويجي (مع منع الوكلاء والشركاء)
async function applyCouponCode() {
    const input = document.getElementById('coupon-code-input');
    const statusMsg = document.getElementById('coupon-status-msg');
    const btn = document.getElementById('apply-coupon-btn');
    const code = input ? input.value.trim().toUpperCase() : '';

    if (currentUserRole === 'agent' || currentUserRole === 'marketing_partner') {
        const discountRow = document.getElementById('discount-breakdown-row');
        if (discountRow) {
            discountRow.classList.add('hidden');
            discountRow.classList.remove('flex');
        }
        document.getElementById('review-item-price').innerText = "$" + selectedItemPrice.toFixed(2);
        
        if (statusMsg) {
            statusMsg.classList.remove('hidden');
            statusMsg.className = "text-[10px] mt-1.5 text-rose-500 font-bold block";
            statusMsg.innerText = "✕ حسابات الشركاء والوكلاء غير مخولة باستخدام أي كود خصم.";
        }
        return;
    }

    if (!code) {
        activeCoupon = null;
        discountedPrice = selectedItemPrice;
        const discountRow = document.getElementById('discount-breakdown-row');
        if (discountRow) {
            discountRow.classList.add('hidden');
            discountRow.classList.remove('flex');
        }
        document.getElementById('review-item-price').innerText = "$" + selectedItemPrice.toFixed(2);
        if (statusMsg) statusMsg.classList.add('hidden');
        return;
    }

    btn.disabled = true;
    btn.innerText = "...";

    try {
        const { data: coupon, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code)
            .eq('is_active', true)
            .single();

        if (error || !coupon) {
            activeCoupon = null;
            discountedPrice = selectedItemPrice;
            const discountRow = document.getElementById('discount-breakdown-row');
            if (discountRow) {
                discountRow.classList.add('hidden');
                discountRow.classList.remove('flex');
            }
            document.getElementById('review-item-price').innerText = "$" + selectedItemPrice.toFixed(2);
            
            if (statusMsg) {
                statusMsg.classList.remove('hidden');
                statusMsg.className = "text-[10px] mt-1.5 text-rose-500 font-bold block";
                statusMsg.innerText = "✕ رمز القسيمة غير صالح أو منتهي الصلاحية.";
            }
        } else {
            activeCoupon = coupon;
            const discountAmt = (selectedItemPrice * (coupon.discount_percent / 100.0));
            discountedPrice = Math.max(0, selectedItemPrice - discountAmt);

            document.getElementById('discount-label-text').innerText = `خصم القسيمة (${coupon.discount_percent}%):`;
            document.getElementById('discount-val-text').innerText = `-$${discountAmt.toFixed(2)}`;
            
            const discountRow = document.getElementById('discount-breakdown-row');
            if (discountRow) {
                discountRow.classList.remove('hidden');
                discountRow.classList.add('flex');
            }
            document.getElementById('review-item-price').innerText = "$" + discountedPrice.toFixed(2);

            if (statusMsg) {
                statusMsg.classList.remove('hidden');
                statusMsg.className = "text-[10px] mt-1.5 text-emerald-600 dark:text-emerald-400 font-bold block";
                statusMsg.innerText = `✓ تم تطبيق الخصم بنجاح! وفرت $${discountAmt.toFixed(2)}`;
            }
        }
    } catch (err) {
        console.error("Coupon check error:", err);
    } finally {
        btn.disabled = false;
        btn.innerText = "تطبيق";
    }
}

// 8. تنفيذ عملية الدفع والشراء الذرية
async function executeSubscriptionPurchase() { 
    const finalDuePrice = (activeCoupon && discountedPrice !== undefined) ? discountedPrice : selectedItemPrice;

    if (currentWalletBalance < finalDuePrice) {
        return showCustomAlert("الرصيد غير كافٍ لإتمام الشراء."); 
    }
    
    const btn = document.getElementById('confirm-purchase-btn'); 
    btn.disabled = true; 
    btn.innerHTML = `<span class="flex items-center justify-center gap-2">${BRAND_LOADER_SVG} <span>جاري تنفيذ الشحن...</span></span>`; 
    
    try {
        const { data: r, error } = await supabase.rpc('buy_product', {
            p_user_id: currentUser.id, 
            p_product_id: selectedProductId, 
            p_player_id: inputPlayerId || null, 
            p_player_id_confirm: inputPlayerIdConfirm || null,
            p_coupon_code: activeCoupon ? activeCoupon.code : null
        }); 
        
        if (error) throw error;

        if (r && r.status === "success") { 
            closeAllModals(); 
            if (typeof silentSyncData === 'function') await silentSyncData(); 
            
            if (r.mode === "CODE") {
                showCodeDeliveryModal(r.code, selectedItemName);
            } else {
                const prod = globalProductsRaw.find(p => p.id === selectedProductId);
                showDirectIdSuccessModal({
                    itemName: selectedItemName,
                    playerId: inputPlayerId,
                    price: finalDuePrice,
                    txRef: r.tx_ref || '',
                    isPhone: isPhoneProduct(prod)
                });
            }
        } else { 
            showCustomAlert("فشلت العملية: " + (r ? r.message : "حدث خطأ غير متوقع")); 
        }
    } catch (err) {
        console.error("Purchase Error:", err);
        showCustomAlert(err.message || "فشلت معالجة الطلب");
    } finally {
        btn.disabled = false; 
        btn.innerHTML = `
            <i class="ph-fill ph-check-circle text-xl"></i>
            <span class="tracking-wide">تأكيد ودفع</span>
        `; 
    }
}

// 9. نافذة تأكيد طلب شحن المعرف المباشر أو رصيد الهاتف
function showDirectIdSuccessModal(data) {
    const oldModal = document.getElementById('direct-id-success-modal');
    if (oldModal) oldModal.remove();

    const recipientLabel = data.isPhone ? 'رقم الهاتف المستلم:' : 'المعرف المستلم (ID):';

    const modalHtml = `
    <div id="direct-id-success-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[99]">
        <div class="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[28px] p-6 text-center space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div class="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-full flex items-center justify-center mx-auto text-3xl">
                <i class="ph-fill ph-hourglass-medium animate-pulse"></i>
            </div>

            <div class="space-y-1">
                <h3 class="text-base font-black text-slate-800 dark:text-slate-100">تم استلام طلب الشحن بنجاح!</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">طلبك قيد المراجعة والشحن المباشر لحسابك الآن.</p>
            </div>

            <div class="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-xs space-y-2.5 text-right border border-slate-200/60 dark:border-slate-700/60">
                <div class="flex justify-between items-center">
                    <span class="text-slate-400">المنتج:</span>
                    <span class="font-bold text-slate-800 dark:text-slate-200">${data.itemName}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-slate-400">${recipientLabel}</span>
                    <span class="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded" dir="ltr">${data.playerId}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-slate-400">المبلغ المدفوع:</span>
                    <span class="font-black text-slate-800 dark:text-slate-200">$${Number(data.price).toFixed(2)}</span>
                </div>
                <div class="flex justify-between items-center border-t border-slate-200/60 dark:border-slate-700/60 pt-2 text-amber-600 dark:text-amber-400 font-bold">
                    <span class="flex items-center gap-1"><i class="ph ph-clock"></i> وقت التنفيذ المتوقع:</span>
                    <span>5 - 15 دقيقة</span>
                </div>
            </div>

            <p class="text-[11px] text-slate-400">يمكنك متابعة حالة الطلب في أي وقت عبر <b>سجل المعاملات والطلبات</b>.</p>

            <button onclick="document.getElementById('direct-id-success-modal').remove()" class="btn-spring w-full bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-xs transition shadow-md cursor-pointer">
                فهمت، شكراً لك
            </button>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 10. نافذة تسليم الكود الرقمي ومشاركته
let currentDeliveredCode = "";

function showCodeDeliveryModal(code, itemName) {
    currentDeliveredCode = code;
    document.getElementById('delivered-code-text').innerText = code;
    document.getElementById('delivery-item-name').innerText = itemName || "البطاقة الرقمية";
    
    const codeBox = document.getElementById('delivered-code-text').parentElement;
    if (codeBox) {
        codeBox.classList.add('code-shimmer-box');
    }
    
    toggleView('code-delivery-modal', true);
}

function copyDeliveredCode() {
    if (!currentDeliveredCode) return;
    navigator.clipboard.writeText(currentDeliveredCode).then(() => {
        showCustomAlert("تم نسخ كود البطاقة بنجاح!", false);
    });
}

async function shareDeliveredCode() {
    if (!currentDeliveredCode) return;
    const shareData = {
        title: 'كود البطاقة الرقمية - SHIIFTX',
        text: `كود البطاقة الخاص بك: ${currentDeliveredCode}\nتم الشراء عبر تطبيق SHIIFTX.`
    };
    if (navigator.share) {
        try { await navigator.share(shareData); } catch (err) {}
    } else {
        copyDeliveredCode();
    }
}

// 11. دوال شحن الرصيد المباشر (Deposit)
function updateDirectWalletInfo() {
    const select = document.getElementById('sub-payment-method');
    const walletBox = document.getElementById('direct-official-wallet-num');
    const labelBox = document.getElementById('direct-gateway-name-label');
    if (!select || !walletBox) return;

    const selectedOpt = select.options[select.selectedIndex];
    const walletNum = selectedOpt.getAttribute('data-wallet') || '---';
    const gatewayName = selectedOpt.value;

    walletBox.innerText = walletNum;
    if (labelBox) labelBox.innerText = `رقم حساب ${gatewayName}:`;
}

function setPresetAmount(val, btnEl) {
    const input = document.getElementById('sub-form-amount-select');
    if (input) input.value = val;

    document.querySelectorAll('.amount-preset-btn').forEach(btn => {
        btn.className = "amount-preset-btn py-2 rounded-xl text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-500 transition btn-spring";
    });

    if (btnEl) {
        btnEl.className = "amount-preset-btn py-2 rounded-xl text-xs font-mono font-bold border border-blue-600 bg-blue-600 text-white shadow-sm transition btn-spring";
    }
}

function onCustomAmountTyped() {
    document.querySelectorAll('.amount-preset-btn').forEach(btn => {
        btn.className = "amount-preset-btn py-2 rounded-xl text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-500 transition btn-spring";
    });
}

async function submitSubFinalDeposit() { 
    const amtInput = document.getElementById('sub-form-amount-select');
    const rawAmt = amtInput ? amtInput.value.trim().replace(/[،,]/g, '.').replace(/[^0-9.]/g, '') : "";
    const finalAmt = parseFloat(rawAmt);
    const txNum = document.getElementById('sub-form-tx-number').value.trim();
    const method = document.getElementById('sub-payment-method').value;
    const btn = document.getElementById('sub-deposit-final-btn'); 

    if (!rawAmt || isNaN(finalAmt) || finalAmt <= 0) {
        return showCustomAlert("يرجى إدخال مبلغ صحيح للشحن.");
    }
    if (!txNum) {
        return showCustomAlert("يرجى إدخال رقم إشعار الحوالة لتأكيد العملية."); 
    }
    
    btn.disabled = true; 
    btn.innerHTML = `<span class="flex items-center justify-center gap-2">${BRAND_LOADER_SVG} <span>جاري رفع الإشعار...</span></span>`;

    try {
        const { data: res, error } = await supabase.rpc('submit_deposit_request', {
            p_amount: finalAmt,
            p_payment_method: method,
            p_receipt_num: txNum
        });

        if (error) throw error;

        if (res && res.status === 'success') {
            showCustomAlert("تم رفع طلب الشحن بنجاح وهو قيد المراجعة لدى الإدارة.", false); 
            if (amtInput) amtInput.value = "";
            document.getElementById('sub-form-tx-number').value = "";
            onCustomAmountTyped();
            switchTab('home'); 
            if (typeof silentSyncData === 'function') silentSyncData(); 
        } else {
            showCustomAlert(res ? res.message : "فشل رفع الطلب، يرجى المحاولة لاحقاً.");
        }
    } catch (err) {
        console.error("Supabase Deposit RPC Error:", err);
        showCustomAlert("فشل رفع الطلب: " + (err.message || "خطأ في الاتصال بالخادم"));
    } finally {
        btn.disabled = false; 
        btn.innerHTML = `<i class="ph-fill ph-check-circle text-lg"></i> تأكيد وإرسال طلب الشحن`;
    }
}
