const RETAIL_SUPABASE_URL = "https://qavdmizccaltsggwrdkk.supabase.co";
const RETAIL_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhdmRtaXpjY2FsdHNnZ3dyZGtrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDQ0NTMxOCwiZXhwIjoyMTEwMDIxMzE4fQ.rPu37w2SV5_hnURIE_SSBh7RdQSegcY4UF8r9-sP3bI";

const retailSupabase = window.supabase.createClient(RETAIL_SUPABASE_URL, RETAIL_ANON_KEY);

let currentUser = null;
let currentSession = null;
let catalogItems = [];

function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", async () => {
    await window.loadRetailCatalog();

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
            const panel = document.getElementById("user-nav-panel");
            if (panel) {
                panel.classList.add("hidden");
                panel.classList.remove("flex");
            }
            const loginBtn = document.getElementById("guest-login-btn");
            if (loginBtn) loginBtn.classList.remove("hidden");
        }
    });
});

async function refreshUserWallet() {
    if (!currentUser) return;
    const loginBtn = document.getElementById("guest-login-btn");
    if (loginBtn) loginBtn.classList.add("hidden");

    const panel = document.getElementById("user-nav-panel");
    if (panel) {
        panel.classList.remove("hidden");
        panel.classList.add("flex");
    }

    const { data } = await retailSupabase
        .from("retail_users")
        .select("wallet_balance")
        .eq("id", currentUser.id)
        .single();

    if (data) {
        const balEl = document.getElementById("nav-wallet-balance");
        if (balEl) balEl.textContent = "$" + Number(data.wallet_balance || 0).toFixed(2);
    }
}

window.loadRetailCatalog = async function() {
    const grid = document.getElementById("catalog-grid");
    if (!grid) return;
    grid.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400 text-xs">جاري تحديث الكتالوج...</div>';

    const { data, error } = await retailSupabase
        .from("retail_catalog")
        .select("id, platform, package_name, product_type, retail_price, image_url, is_active")
        .eq("is_active", true)
        .order("platform", { ascending: true });

    if (error) {
        grid.innerHTML = '<div class="col-span-full py-8 text-center text-rose-500 text-xs font-bold">تعذر تحميل المنتجات: ' + escapeHTML(error.message) + '</div>';
        return;
    }

    catalogItems = data || [];
    renderPlatformPills();
    renderCatalogGrid("ALL");
};

function renderPlatformPills() {
    const container = document.getElementById("platform-filters");
    if (!container) return;
    const platforms = [...new Set(catalogItems.map(i => i.platform))];
    const activeCls = "filter-pill px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 whitespace-nowrap transition";
    const idleCls = "filter-pill px-4 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 whitespace-nowrap transition";

    let html = '<button type="button" onclick="filterRetailCatalog(this.dataset.platform)" data-platform="ALL" class="' + activeCls + '">جميع الباقات</button>';
    platforms.forEach(pl => {
        const safePl = escapeHTML(pl);
        html += '<button type="button" onclick="filterRetailCatalog(this.dataset.platform)" data-platform="' + safePl + '" class="' + idleCls + '">' + safePl + '</button>';
    });
    container.innerHTML = html;
}

window.filterRetailCatalog = function(platform) {
    const activeCls = "filter-pill px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 whitespace-nowrap transition";
    const idleCls = "filter-pill px-4 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 whitespace-nowrap transition";

    document.querySelectorAll(".filter-pill").forEach(btn => {
        btn.className = btn.dataset.platform === platform ? activeCls : idleCls;
    });
    renderCatalogGrid(platform);
};

function renderCatalogGrid(platform) {
    const grid = document.getElementById("catalog-grid");
    if (!grid) return;
    const items = platform === "ALL" ? catalogItems : catalogItems.filter(i => i.platform === platform);

    if (items.length === 0) {
        grid.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400 text-xs">لا توجد باقات متاحة حالياً.</div>';
        return;
    }

    grid.innerHTML = items.map(item => {
        const isID = item.product_type === "ID";
        const badgeCls = isID ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
        const badgeTxt = isID ? "شحن بالمعرّف ID" : "كود فوري ⚡";
        const safeId = escapeHTML(item.id);
        return '<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-sm hover:border-indigo-500/50 transition">' +
            '<div class="space-y-2">' +
            '<div class="flex items-center justify-between gap-2">' +
            '<span class="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">' + escapeHTML(item.platform) + '</span>' +
            '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold ' + badgeCls + '">' + badgeTxt + '</span>' +
            '</div>' +
            '<h3 class="text-sm font-black text-slate-900 dark:text-white leading-snug">' + escapeHTML(item.package_name) + '</h3>' +
            '</div>' +
            '<div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">' +
            '<div>' +
            '<span class="text-[10px] text-slate-400 block">السعر</span>' +
            '<span class="font-mono font-black text-base text-emerald-600 dark:text-emerald-400" dir="ltr">$' + Number(item.retail_price).toFixed(2) + '</span>' +
            '</div>' +
            '<button type="button" data-id="' + safeId + '" onclick="openBuyModal(this.dataset.id)" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm">شراء الآن</button>' +
            '</div>' +
            '</div>';
    }).join("");
}

window.openBuyModal = function(catalogId) {
    if (!currentUser || !currentSession) {
        window.openAuthModal("login");
        return;
    }
    const item = catalogItems.find(i => i.id === catalogId);
    if (!item) return;

    document.getElementById("buy-catalog-id").value = item.id;
    document.getElementById("buy-product-type").value = item.product_type;
    document.getElementById("buy-modal-platform").textContent = item.platform;
    document.getElementById("buy-modal-package").textContent = item.package_name;
    document.getElementById("buy-modal-price").textContent = "$" + Number(item.retail_price).toFixed(2);
    document.getElementById("buy-player-id").value = "";

    document.getElementById("buy-playerid-group").classList.toggle("hidden", item.product_type !== "ID");
    document.getElementById("buy-confirm-step").classList.remove("hidden");
    document.getElementById("buy-result-step").classList.add("hidden");
    document.getElementById("buy-modal").classList.remove("hidden");
};

window.executeRetailPurchase = async function() {
    const catalogId = document.getElementById("buy-catalog-id").value;
    const productType = document.getElementById("buy-product-type").value;
    const playerId = document.getElementById("buy-player-id").value.trim();
    const btn = document.getElementById("btn-confirm-purchase");

    if (productType === "ID" && !playerId) {
        alert("يرجى إدخال معرّف اللاعب (Player ID) لإتمام الشحن");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = "<span>جاري تنفيذ الطلب...</span>";

    try {
        const response = await fetch("/api/buy", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + currentSession.access_token
            },
            body: JSON.stringify({
                catalog_id: catalogId,
                player_id: productType === "ID" ? playerId : null
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            if (result.remaining_balance !== undefined) {
                document.getElementById("nav-wallet-balance").textContent = "$" + Number(result.remaining_balance).toFixed(2);
            }
            alert(result.error || "تعذر إتمام عملية الشراء");
            return;
        }

        document.getElementById("nav-wallet-balance").textContent = "$" + Number(result.remaining_balance).toFixed(2);
        document.getElementById("buy-confirm-step").classList.add("hidden");
        document.getElementById("buy-result-step").classList.remove("hidden");
        document.getElementById("buy-result-ref").textContent = result.order_ref;

        if (result.fulfillment_status === "pending") {
            document.getElementById("buy-result-title").textContent = "تم استلام طلب الشحن المباشر";
            document.getElementById("buy-code-box").classList.add("hidden");
            document.getElementById("buy-pending-box").classList.remove("hidden");
        } else {
            document.getElementById("buy-result-title").textContent = "تم الشراء بنجاح! إليك الكود الرقمي";
            document.getElementById("buy-delivered-code").value = result.card_code;
            document.getElementById("buy-code-box").classList.remove("hidden");
            document.getElementById("buy-pending-box").classList.add("hidden");
        }
    } catch (err) {
        alert("خطأ في الاتصال بالخادم: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph-bold ph-check-circle text-base"></i><span>تأكيد الدفع من المحفظة</span>';
    }
};

window.copyDeliveredCode = function() {
    const input = document.getElementById("buy-delivered-code");
    navigator.clipboard.writeText(input.value);
    alert("تم نسخ الكود بنجاح!");
};

window.openOrdersModal = async function() {
    if (!currentUser) return;
    document.getElementById("orders-modal").classList.remove("hidden");
    await loadUserOrdersHistory();
};

async function loadUserOrdersHistory() {
    const tbody = document.getElementById("retail-orders-tbody");
    tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-slate-400">جاري جلب طلباتك...</td></tr>';

    const { data, error } = await retailSupabase
        .from("retail_orders")
        .select("local_order_ref, retail_price, player_id, delivered_code, status, rejection_reason, created_at, retail_catalog(platform, package_name)")
        .order("created_at", { ascending: false });

    if (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-rose-500">' + escapeHTML(error.message) + '</td></tr>';
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-slate-400">لا توجد مشتريات سابقة في حسابك.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(o => {
        const pkgTitle = o.retail_catalog ? (o.retail_catalog.platform + " - " + o.retail_catalog.package_name) : "باقة رقمية";
        const deliveryInfo = o.delivered_code
            ? '<span class="font-mono font-bold text-amber-600 dark:text-amber-400 select-all" dir="ltr">' + escapeHTML(o.delivered_code) + '</span>'
            : '<span class="font-mono text-slate-500" dir="ltr">ID: ' + escapeHTML(o.player_id || "---") + '</span>';

        const safeRef = escapeHTML(o.local_order_ref);
        let statusHtml = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">مكتمل ✓</span>';
        if (o.status === "pending") {
            statusHtml = '<div class="flex flex-col items-center gap-1"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">قيد التنفيذ</span><button type="button" data-ref="' + safeRef + '" onclick="syncPendingOrder(this.dataset.ref)" class="text-[10px] text-indigo-500 hover:underline font-bold">تحديث الحالة</button></div>';
        } else if (o.status === "rejected") {
            const reasonHtml = o.rejection_reason ? '<div class="text-[9px] text-rose-400 mt-0.5">' + escapeHTML(o.rejection_reason) + '</div>' : '';
            statusHtml = '<div class="text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600">مرفوض (مسترجع)</span>' + reasonHtml + '</div>';
        }

        return '<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">' +
            '<td class="py-3 px-2 font-mono font-bold">' + safeRef + '</td>' +
            '<td class="py-3 px-2 font-bold">' + escapeHTML(pkgTitle) + '</td>' +
            '<td class="py-3 px-2">' + deliveryInfo + '</td>' +
            '<td class="py-3 px-2 font-mono font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">$' + Number(o.retail_price).toFixed(2) + '</td>' +
            '<td class="py-3 px-2 text-center">' + statusHtml + '</td>' +
            '</tr>';
    }).join("");
}

window.syncPendingOrder = async function(localOrderRef) {
    try {
        const res = await fetch("/api/sync-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ local_order_ref: localOrderRef })
        });
        const data = await res.json();
        if (data.status === "rejected") {
            alert("تم رفض الطلب (" + (data.rejection_reason || "سبب غير محدد") + ") وأُعيد المبلغ إلى محفظتك.");
            await refreshUserWallet();
        } else if (data.status === "completed") {
            alert("اكتمل شحن الطلب بنجاح!");
        } else {
            alert("الطلب لا يزال قيد المعالجة لدى المزود.");
        }
        await loadUserOrdersHistory();
    } catch (err) {
        alert("تعذر تحديث الحالة حالياً");
    }
};

window.openAuthModal = function(mode) {
    document.getElementById("auth-mode").value = mode || "login";
    updateAuthModalUI();
    document.getElementById("auth-modal").classList.remove("hidden");
};

window.toggleAuthMode = function() {
    const current = document.getElementById("auth-mode").value;
    document.getElementById("auth-mode").value = current === "login" ? "register" : "login";
    updateAuthModalUI();
};

function updateAuthModalUI() {
    const isRegister = document.getElementById("auth-mode").value === "register";
    document.getElementById("auth-modal-title").textContent = isRegister ? "إنشاء حساب زبون جديد" : "تسجيل الدخول إلى حسابك";
    document.getElementById("auth-name-group").classList.toggle("hidden", !isRegister);
    document.getElementById("auth-submit-btn").textContent = isRegister ? "إنشاء الحساب" : "دخول";
    document.getElementById("auth-switch-text").textContent = isRegister ? "لديك حساب بالفعل؟" : "ليس لديك حساب؟";
    document.getElementById("auth-switch-btn").textContent = isRegister ? "تسجيل الدخول" : "إنشاء حساب جديد";
}

window.handleRetailAuthSubmit = async function(e) {
    e.preventDefault();
    const mode = document.getElementById("auth-mode").value;
    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;
    const fullName = document.getElementById("auth-fullname").value.trim();
    const btn = document.getElementById("auth-submit-btn");

    btn.disabled = true;
    btn.textContent = "جاري المعالجة...";

    try {
        if (mode === "register") {
            const { error } = await retailSupabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName } }
            });
            if (error) throw error;
            alert("تم إنشاء حسابك بنجاح!");
        } else {
            const { error } = await retailSupabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        }
        window.closeModal("auth-modal");
    } catch (err) {
        alert("خطأ: " + err.message);
    } finally {
        btn.disabled = false;
        updateAuthModalUI();
    }
};

window.handleRetailLogout = async function() {
    await retailSupabase.auth.signOut();
};

window.closeModal = function(id) {
    document.getElementById(id).classList.add("hidden");
};

window.toggleRetailTheme = function() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("retail_theme", isDark ? "dark" : "light");
};
