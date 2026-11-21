// ==================== 1. ملف النواة والعملات واللغات: js/retail-core.js ====================
const RETAIL_SUPABASE_URL = 'https://qavdmizccaltsggwrdkk.supabase.co';
const RETAIL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhdmRtaXpjY2FsdHNnZ3dyZGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0NDUzMTgsImV4cCI6MjExMDAyMTMxOH0.RUqkSQggtLrpfFGcr8Y2RUyD6RoJLqzKD3CVc5fo4KI';

const retailAuthStorage = (() => {
    const fallbackStore = new Map();
    try {
        const probeKey = '__shiiftx_ls_probe__';
        window.localStorage.setItem(probeKey, '1');
        window.localStorage.removeItem(probeKey);
        return window.localStorage;
    } catch (_err) {
        return {
            getItem: (key) => (fallbackStore.has(key) ? fallbackStore.get(key) : null),
            setItem: (key, value) => fallbackStore.set(key, String(value)),
            removeItem: (key) => fallbackStore.delete(key)
        };
    }
})();

const retailSupabase = window.supabase.createClient(RETAIL_SUPABASE_URL, RETAIL_ANON_KEY, {
    auth: {
        storage: retailAuthStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'sb-qavdmizccaltsggwrdkk-auth-token'
    }
});

// =========================================================================
// المتغيرات العامة المشتركة بين وحدات التطبيق
// =========================================================================
let CURRENCY_RATES = { USD: 1 };
let CURRENCY_LABELS = { USD: '$ USD' };

const DYNAMIC_CURRENCY_META = {
    USD: { title: '🇺🇸 US Dollar', short: '$ USD' },
    EUR: { title: '🇪🇺 Euro', short: '€ EUR' },
    SYP: { title: '🇸🇾 ليرة سورية', short: 'SYP' },
    TRY: { title: '🇹🇷 ليرة تركية', short: '₺ TRY' },
    SAR: { title: '🇸🇦 ريال سعودي', short: 'SAR' },
    AED: { title: '🇦🇪 درهم إماراتي', short: 'AED' },
    GBP: { title: '🇬🇧 British Pound', short: '£ GBP' },
    JOD: { title: '🇯🇴 دينار أردني', short: 'JOD' },
    IQD: { title: '🇮🇶 دينار عراقي', short: 'IQD' }
};

let activeCurrency = localStorage.getItem('shiiftx_retail_currency') || 'USD';
let activeLang = localStorage.getItem('shiiftx_retail_lang') || 'ar';
let isSidebarCollapsed = localStorage.getItem('shiiftx_sidebar_collapsed') === 'true';

let currentUser = null;
let currentSession = null;
let currentWalletBalance = 0;
let catalogItems = [];
let pendingOrderRefs = [];
let activeAppView = 'store';
let activeBusinessCategory = 'ALL';
let activePlatformFilter = 'ALL';
let activeDeliveryTypeFilter = 'ALL';
let activeSearchQuery = '';
let activeSortOrder = 'default';
let favoriteIds = new Set(JSON.parse(localStorage.getItem('shiiftx_retail_favs') || '[]'));

let selectedTopupAmount = 25;
let selectedTopupMethod = 'CARD';
let currentHeroSlide = 0;
let heroAutoTimer = null;

// =========================================================================
// قاموس اللغات الثلاث (AR / EN / DE)
// =========================================================================
const RETAIL_I18N = {
    ar: {
        wallet_title: 'محفظة SHIIFT X',
        wallet_guest_desc: 'سجّل الدخول لإدارة رصيدك وشراء البطاقات بضغطة واحدة.',
        btn_login_register: 'تسجيل الدخول / إنشاء حساب',
        wallet_available: 'الرصيد المتاح',
        btn_topup: 'إيداع',
        btn_my_orders: 'طلباتي',
        nav_section_browse: 'التصفح',
        nav_home_brands: 'الرئيسية والمنصات',
        nav_favorites: 'المفضلة',
        nav_orders_history: 'سجل المشتريات',
        nav_faq: 'الأسئلة الشائعة',
        nav_section_brands: 'العلامات التجارية',
        nav_live_support: 'مركز المساعدة',
        nav_logout: 'تسجيل الخروج',
        search_placeholder: 'ابحث عن لعبة، بطاقة هدايا، أو منطقة (US / EU)...',
        btn_login_short: 'دخول',
        pending_banner_prefix: 'لديك طلبات شحن مباشر قيد التنفيذ حالياً:',
        btn_refresh_status: 'تحديث الحالة',
        btn_details: 'التفاصيل',
        slide1_badge: 'تسليم آلي خلال ثوانٍ • 24/7',
        slide1_title: 'بطاقات الألعاب والمتاجر الرقمية، بتسليم فوري وأسعار نهائية.',
        slide1_desc: 'استلم كود التفعيل الرقمي فور تأكيد الطلب أو اشحن حسابك مباشرة بالمعرّف عبر PayPal أو بطاقات Visa وMastercard.',
        slide2_badge: 'تغطية شاملة للمتاجر العالمية',
        slide2_title: 'بطاقات أمريكية، أوروبية، وعالمية بشارات توافق واضحة.',
        slide2_desc: 'تحقّق من شارة المنطقة الجغرافية على كل بطاقة لضمان التوافق التام مع حسابك قبل الشراء.',
        slide3_badge: 'تاجر مسجل في النمسا — الاتحاد الأوروبي',
        slide3_title: 'حماية كاملة للمشتري وخصوصية بيانات بمعايير GDPR.',
        slide3_desc: 'دفع آمن عبر PayPal وVisa وMastercard وفواتير رقمية موثقة ودعم فني مباشر.',
        section_browse_brands: 'تصفّح حسب المنصة واللعبة',
        btn_show_all_brands: 'عرض جميع المنصات',
        cat_all: 'الكل',
        cat_games: 'الألعاب',
        cat_cards: 'بطاقات المتاجر والهدايا',
        cat_streaming: 'تطبيقات البث والدردشة',
        cat_subscriptions: 'الاشتراكات والبرامج',
        breadcrumb_store: 'المتجر',
        breadcrumb_all_packages: 'جميع الباقات',
        breadcrumb_favorites: 'الباقات المفضلة',
        packages_count_suffix: 'باقة',
        brand_tile_packages_word: 'باقات • من',
        filter_type_all: 'كل أنواع التسليم',
        filter_type_code: 'كود فوري ⚡',
        filter_type_id: 'شحن مباشر (ID)',
        sort_default: 'الترتيب الافتراضي',
        sort_price_asc: 'السعر: من الأقل للأعلى',
        sort_price_desc: 'السعر: من الأعلى للأقل',
        badge_direct_id: 'شحن مباشر ID',
        badge_instant_code: 'كود فوري',
        label_tax_included: 'شامل الضريبة',
        btn_buy: 'شراء',
        region_us: 'المتجر الأمريكي (US)',
        region_eu: 'المتجر الأوروبي (EU)',
        region_sa: 'المتجر السعودي (KSA)',
        region_ae: 'المتجر الإماراتي (UAE)',
        region_tr: 'المتجر التركي (TR)',
        region_uk: 'المتجر البريطاني (UK)',
        region_global: 'حساب عالمي (Global)',
        faq_heading: 'الأسئلة الشائعة',
        faq_subheading: 'كل ما تحتاج معرفته حول التسليم الفوري، توافق المناطق، والدفع عبر PayPal وبطاقات Visa / Mastercard.',
        btn_contact_support: 'تحدث مع فريق الدعم',
        faq_q1: 'متى أستلم الكود الرقمي أو الشحن بعد الدفع؟',
        faq_a1: 'باقات الكود الفوري تظهر لك فوراً على الشاشة في نفس اللحظة بعد تأكيد الدفع وتحفظ دائماً في قسم «طلباتي». أما باقات الشحن المباشر بالمعرّف (Player ID) فيتم إرسالها آلياً إلى حسابك داخل اللعبة خلال دقائق معدودة.',
        faq_q2: 'ما هي وسائل الدفع المعتمدة في المتجر؟',
        faq_a2: 'يمكنك شحن محفظتك والدفع بسهولة وأمان عبر حساب PayPal أو باستخدام بطاقات الدفع العالمية Visa وMastercard، مع إمكانية عرض الأسعار بالعملة التي تفضلها.',
        faq_q3: 'كيف أتأكد من توافق منطقة البطاقة (Region) مع حسابي؟',
        faq_a3: 'تحمل كل بطاقة في متجرنا شارة واضحة للمنطقة الجغرافية (مثل 🇺🇸 المتجر الأمريكي أو 🇪🇺 المتجر الأوروبي أو 🌍 عالمي). تأكد دائماً من مطابقة شارة البطاقة لبلد حسابك قبل إتمام الشراء.',
        faq_q4: 'ماذا يحدث إذا تم رفض طلب الشحن بمعرّف اللاعب (ID)؟',
        faq_a4: 'في حال تعذر إتمام الشحن المباشر بسبب خطأ في رقم المعرّف (Player ID) أو صيانة لدى ناشر اللعبة، يقوم نظامنا تلقائياً بإلغاء الطلب وإعادة كامل المبلغ فوراً إلى رصيد محفظتك في المتجر.',
        footer_payment_methods: 'وسائل الدفع المعتمدة والآمنة:',
        footer_copyright: '© 2026 — جميع الحقوق محفوظة',
        footer_privacy: 'سياسة الخصوصية',
        footer_terms: 'الشروط والأحكام',
        footer_refund: 'سياسة الاسترجاع',
        footer_acceptableuse: 'سياسة الاستخدام',
        footer_impressum: 'الاشعار القانوني',
        drawer_instructions_title: 'تعليمات الشحن وملاحظات هامة',
        label_final_price_tax: 'السعر النهائي شامل الضريبة',
        btn_proceed_checkout: 'المتابعة للدفع',
        topup_drawer_title: 'إضافة رصيد متجر (Store Credit)',
        topup_account_email_label: 'معرّف حسابك (البريد الإلكتروني):',
        btn_copy: 'نسخ',
        topup_select_amount: '1. اختر فئة رصيد المتجر:',
        topup_select_method: '2. اختر وسيلة الدفع الآمنة:',
        pay_card_desc: 'دفع فوري موثق بمعيار الحماية الأوروبي 3D Secure',
        pay_paypal_desc: 'دفع إلكتروني معتمد مع حماية المشتري',
        btn_proceed_topup: 'الانتقال إلى بوابة الدفع الآمنة',
        btn_email_support: 'مراسلة الدعم الرسمي',
        label_fullname: 'الاسم الكامل',
        label_email: 'البريد الإلكتروني',
        label_password: 'كلمة المرور',
        auth_title_login: 'تسجيل الدخول إلى حسابك',
        auth_title_register: 'إنشاء حساب جديد',
        auth_btn_login: 'متابعة',
        auth_btn_register: 'إنشاء الحساب',
        auth_switch_have_acc: 'لديك حساب بالفعل؟',
        auth_switch_no_acc: 'ليس لديك حساب؟',
        auth_link_login: 'تسجيل الدخول',
        auth_link_register: 'إنشاء حساب جديد',
        checkout_drawer_title: 'إتمام الطلب',
        checkout_total_tax: 'الإجمالي (شامل الضريبة)',
        checkout_current_wallet: 'رصيد محفظتك الحالي:',
        checkout_remaining_after: 'المتبقي بعد الدفع:',
        checkout_shortfall_needed: 'المبلغ الناقص لإتمام الطلب:',
        btn_insufficient_topup: 'الرصيد غير كافٍ — اضغط للشحن',
        checkout_playerid_label: 'معرّف اللاعب (Player ID) *',
        checkout_autosave_note: 'يُحفظ تلقائياً',
        checkout_saved_ids_label: 'معرّفات محفوظة:',
        checkout_playerid_hint: 'يتم إرسال الشحن مباشرة إلى الحساب المرتبط بهذا المعرّف.',
        checkout_eu_waiver: 'أوافق على شروط الاستخدام وسياسة الاسترجاع، وأطلب التنفيذ الفوري وتسليم الكود الرقمي أو بدء الشحن قبل انقضاء مهلة الـ 14 يوماً، مع إقراري بفقدان حق العدول الأوروبي بمجرد بدء التنفيذ وفق المادة 16(m).',
        btn_confirm_pay: 'تأكيد الدفع من المحفظة',
        label_your_digital_code: 'الكود الرقمي الخاص بك:',
        msg_pending_topup_box: 'تم إرسال طلب الشحن لمعرّف اللاعب بنجاح وهو الآن قيد التنفيذ. يمكنك متابعة اكتمال الشحن من درج «طلباتي».',
        btn_done_close: 'تم، إغلاق',
        orders_drawer_title: 'سجل مشترياتي',
        th_order_ref: 'رقم الطلب',
        th_package: 'الباقة',
        th_code_id: 'الكود / المعرّف',
        th_price: 'السعر',
        th_status_action: 'الحالة والإجراء',
        status_completed: 'مكتمل ✓',
        status_pending: 'قيد التنفيذ',
        status_rejected: 'مرفوض (مسترجع)',
        btn_reorder: 'إعادة الشراء',
        btn_update_short: 'تحديث',
        gdpr_delete_note: 'يحق لك حذف حسابك وبياناتك الشخصية نهائياً وفق لائحة حماية البيانات الأوروبية (GDPR).',
        btn_delete_account: 'حذف حسابي نهائياً',
        cookie_banner_text: 'نستخدم التخزين المحلي الأساسي فقط لحفظ جلستك وتفضيل المظهر دون أي ملفات تتبع إعلانية (GDPR).',
        btn_accept_cookie: 'موافق',
        empty_fav_title: 'قائمة المفضلة فارغة حالياً',
        empty_fav_desc: 'اضغط على أيقونة القلب أعلى أي بطاقة لحفظها هنا للوصول السريع.',
        empty_search_title: 'لم يتم العثور على باقات مطابقة',
        empty_search_desc: 'جرّب تغيير القسم أو إعادة ضبط الفلاتر.',
        default_inst_id: 'يتم شحن هذه الباقة مباشرة إلى معرّف اللاعب (Player ID) الخاص بك خلال دقائق. يرجى التأكد من كتابة المعرّف بدقة قبل تأكيد الطلب.',
        default_inst_code: 'يتم تسليم الكود الرقمي فوراً داخل حسابك فور إتمام عملية الدفع. يرجى التأكد من توافق منطقة الحساب (Region) مع البطاقة قبل الشراء.'
    },
    en: {
        wallet_title: 'SHIIFT X Wallet',
        wallet_guest_desc: 'Sign in to manage your balance and buy digital cards with one tap.',
        btn_login_register: 'Sign In / Create Account',
        wallet_available: 'Available Balance',
        btn_topup: 'Top Up',
        btn_my_orders: 'Orders',
        nav_section_browse: 'Browse',
        nav_home_brands: 'Home & Brands',
        nav_favorites: 'Favorites',
        nav_orders_history: 'Order History',
        nav_faq: 'FAQ & Help',
        nav_section_brands: 'Brands & Games',
        nav_live_support: 'Help Center',
        nav_logout: 'Sign Out',
        search_placeholder: 'Search game, gift card, or region (US / EU)...',
        btn_login_short: 'Sign In',
        pending_banner_prefix: 'Active direct top-up orders in progress:',
        btn_refresh_status: 'Refresh Status',
        btn_details: 'Details',
        slide1_badge: 'Instant Automated Delivery • 24/7',
        slide1_title: 'Gaming & Digital Gift Cards, Delivered Instantly.',
        slide1_desc: 'Receive your digital code immediately after checkout or top up directly via Player ID using PayPal, Visa, or Mastercard.',
        slide2_badge: 'Global Store Coverage',
        slide2_title: 'US, EU & Global Cards with Clear Region Badges.',
        slide2_desc: 'Check the region badge on every card to guarantee 100% compatibility with your account before purchasing.',
        slide3_badge: 'Registered Merchant in Austria — EU',
        slide3_title: 'Full Buyer Protection & GDPR Data Privacy.',
        slide3_desc: 'Secure checkout via PayPal, Visa & Mastercard with official digital invoices and live support.',
        section_browse_brands: 'Browse by Platform & Game',
        btn_show_all_brands: 'Show All Brands',
        cat_all: 'All Categories',
        cat_games: 'Games Top-Up',
        cat_cards: 'Store & Gift Cards',
        cat_streaming: 'Live & Social Apps',
        cat_subscriptions: 'Subscriptions & Software',
        breadcrumb_store: 'Store',
        breadcrumb_all_packages: 'All Packages',
        breadcrumb_favorites: 'Favorite Packages',
        packages_count_suffix: 'items',
        brand_tile_packages_word: 'items • from',
        filter_type_all: 'All Delivery Types',
        filter_type_code: 'Instant Code ⚡',
        filter_type_id: 'Direct Top-Up (ID)',
        sort_default: 'Default Sort',
        sort_price_asc: 'Price: Low to High',
        sort_price_desc: 'Price: High to Low',
        badge_direct_id: 'Direct ID',
        badge_instant_code: 'Instant Code',
        label_tax_included: 'Tax included',
        btn_buy: 'Buy',
        region_us: 'US Store (USA)',
        region_eu: 'EU Store (Europe)',
        region_sa: 'Saudi Store (KSA)',
        region_ae: 'UAE Store',
        region_tr: 'Turkey Store (TR)',
        region_uk: 'UK Store',
        region_global: 'Global Account',
        faq_heading: 'Frequently Asked Questions',
        faq_subheading: 'Everything you need to know about instant delivery, region compatibility, and paying via PayPal, Visa & Mastercard.',
        btn_contact_support: 'Chat with Team Support',
        faq_q1: 'When do I receive my digital code or ID top-up?',
        faq_a1: 'Instant Code packages appear on your screen immediately after payment and are saved in "Orders". Direct Player ID top-ups are processed automatically within a few minutes.',
        faq_q2: 'What payment methods are accepted?',
        faq_a2: 'You can top up your wallet securely using PayPal, Visa / Mastercard, or SHIIFT X store vouchers.',
        faq_q3: 'How do I check card region compatibility?',
        faq_a3: 'Every product card displays a clear region badge (e.g., 🇺🇸 US Store, 🇪🇺 EU Store, or 🌍 Global). Always match the badge with your account country before purchase.',
        faq_q4: 'What happens if a Player ID top-up is rejected?',
        faq_a4: 'If a direct top-up cannot be completed due to an invalid Player ID or game server maintenance, our system automatically cancels the order and refunds the full amount to your wallet.',
        footer_payment_methods: 'Accepted Secure Payment Methods:',
        footer_copyright: '© 2026 — All rights reserved',
        footer_privacy: 'Privacy',
        footer_terms: 'Terms',
        footer_refund: 'Refunds',
        footer_acceptableuse: 'acceptable use',
        footer_impressum: 'Legal Notice',
        drawer_instructions_title: 'Redemption Instructions & Important Notes',
        label_final_price_tax: 'Final Price (Tax Included)',
        btn_proceed_checkout: 'Proceed to Checkout',
        topup_drawer_title: 'Add Store Credit',
        topup_account_email_label: 'Your Account ID (Email):',
        btn_copy: 'Copy',
        topup_select_amount: '1. Select Store Credit Amount:',
        topup_select_method: '2. Select Secure Payment Method:',
        pay_card_desc: 'Instant payment verified with EU 3D Secure',
        pay_paypal_desc: 'Verified checkout with Buyer Protection',
        btn_proceed_topup: 'Proceed to Secure Checkout',
        btn_email_support: 'Contact Official Support via Email',
        label_fullname: 'Full Name',
        label_email: 'Email Address',
        label_password: 'Password',
        auth_title_login: 'Sign In to Your Account',
        auth_title_register: 'Create a New Account',
        auth_btn_login: 'Continue',
        auth_btn_register: 'Create Account',
        auth_switch_have_acc: 'Already have an account?',
        auth_switch_no_acc: 'Don\'t have an account?',
        auth_link_login: 'Sign In',
        auth_link_register: 'Create Account',
        checkout_drawer_title: 'Complete Order',
        checkout_total_tax: 'Total (Tax Included)',
        checkout_current_wallet: 'Current Wallet Balance:',
        checkout_remaining_after: 'Remaining After Payment:',
        checkout_shortfall_needed: 'Amount Needed to Complete Order:',
        btn_insufficient_topup: 'Insufficient Balance — Tap to Top Up',
        checkout_playerid_label: 'Player ID / Account ID *',
        checkout_autosave_note: 'Auto-saved',
        checkout_saved_ids_label: 'Saved IDs:',
        checkout_playerid_hint: 'Top-up is sent directly to the account linked to this Player ID.',
        checkout_eu_waiver: 'I agree to the Terms of Use and Refund Policy, and expressly request immediate execution and delivery of the digital code or top-up before the 14-day withdrawal period expires, acknowledging that I lose my EU right of withdrawal once execution begins under Art. 16(m).',
        btn_confirm_pay: 'Confirm Payment from Wallet',
        label_your_digital_code: 'Your Digital Code:',
        msg_pending_topup_box: 'Your Player ID top-up request has been submitted and is currently in progress. You can track completion in "Orders".',
        btn_done_close: 'Done, Close',
        orders_drawer_title: 'My Order History',
        th_order_ref: 'Order Ref',
        th_package: 'Package',
        th_code_id: 'Code / Player ID',
        th_price: 'Price',
        th_status_action: 'Status & Action',
        status_completed: 'Completed ✓',
        status_pending: 'In Progress',
        status_rejected: 'Rejected (Refunded)',
        btn_reorder: 'Buy Again',
        btn_update_short: 'Refresh',
        gdpr_delete_note: 'You have the right to permanently delete your account and personal data at any time under EU GDPR.',
        btn_delete_account: 'Delete My Account',
        cookie_banner_text: 'We only use essential local storage for your login session and theme preference with zero ad tracking (GDPR).',
        btn_accept_cookie: 'Accept',
        empty_fav_title: 'Your Favorites List is Empty',
        empty_fav_desc: 'Tap the heart icon on any card to save it here for quick access.',
        empty_search_title: 'No Matching Packages Found',
        empty_search_desc: 'Try changing the category or resetting filters.',
        default_inst_id: 'This package is credited directly to your Player ID within minutes. Please verify your ID carefully before confirming.',
        default_inst_code: 'Your digital code is delivered immediately upon payment. Please verify region compatibility with your account before purchasing.'
    },
    de: {
        wallet_title: 'SHIIFT X Guthaben',
        wallet_guest_desc: 'Melden Sie sich an, um Ihr Guthaben zu verwalten und Karten sofort zu kaufen.',
        btn_login_register: 'Anmelden / Registrieren',
        wallet_available: 'Verfügbares Guthaben',
        btn_topup: 'Aufladen',
        btn_my_orders: 'Bestellungen',
        nav_section_browse: 'Navigation',
        nav_home_brands: 'Startseite & Marken',
        nav_favorites: 'Favoriten',
        nav_orders_history: 'Bestellverlauf',
        nav_faq: 'Häufige Fragen (FAQ)',
        nav_section_brands: 'Marken & Spiele',
        nav_live_support: 'Hilfecenter',
        nav_logout: 'Abmelden',
        search_placeholder: 'Spiel, Geschenkkarte oder Region (US / EU) suchen...',
        btn_login_short: 'Anmelden',
        pending_banner_prefix: 'Aktive Direktaufladungen in Bearbeitung:',
        btn_refresh_status: 'Status prüfen',
        btn_details: 'Details',
        slide1_badge: 'Automatische Sofortlieferung • 24/7',
        slide1_title: 'Gaming- & Geschenkkarten sofort und zum Endpreis.',
        slide1_desc: 'Erhalten Sie Ihren digitalen Code sofort nach der Zahlung oder laden Sie per Player-ID über PayPal, Visa und Mastercard auf.',
        slide2_badge: 'Weltweite Store-Abdeckung',
        slide2_title: 'US-, EU- & Global-Karten mit klaren Regionskennzeichen.',
        slide2_desc: 'Prüfen Sie die Regionsanzeige auf jeder Karte für 100% Kompatibilität mit Ihrem Konto.',
        slide3_badge: 'Registrierter Händler in Österreich — EU',
        slide3_title: 'Voller Käuferschutz & DSGVO-Datenschutz.',
        slide3_desc: 'Sichere Zahlung per PayPal, Visa & Mastercard mit offiziellen digitalen Belegen und Direkt-Support.',
        section_browse_brands: 'Nach Plattform & Spiel filtern',
        btn_show_all_brands: 'Alle Marken anzeigen',
        cat_all: 'Alle Kategorien',
        cat_games: 'Spiele-Aufladung',
        cat_cards: 'Store- & Geschenkkarten',
        cat_streaming: 'Live- & Chat-Apps',
        cat_subscriptions: 'Abos & Software',
        breadcrumb_store: 'Shop',
        breadcrumb_all_packages: 'Alle Pakete',
        breadcrumb_favorites: 'Meine Favoriten',
        packages_count_suffix: 'Pakete',
        brand_tile_packages_word: 'Pakete • ab',
        filter_type_all: 'Alle Lieferarten',
        filter_type_code: 'Sofort-Code ⚡',
        filter_type_id: 'Direktaufladung (ID)',
        sort_default: 'Standard-Sortierung',
        sort_price_asc: 'Preis: Aufsteigend',
        sort_price_desc: 'Preis: Absteigend',
        badge_direct_id: 'Direkt-ID',
        badge_instant_code: 'Sofort-Code',
        label_tax_included: 'Inkl. MwSt.',
        btn_buy: 'Kaufen',
        region_us: 'US-Store (USA)',
        region_eu: 'EU-Store (Europa)',
        region_sa: 'Saudi-Store (KSA)',
        region_ae: 'VAE-Store (UAE)',
        region_tr: 'Türkei-Store (TR)',
        region_uk: 'UK-Store',
        region_global: 'Global (Weltweit)',
        faq_heading: 'Häufige Fragen (FAQ)',
        faq_subheading: 'Alles über Sofortlieferung, Regionen und Zahlung per PayPal, Visa & Mastercard.',
        btn_contact_support: 'Team-Support kontaktieren',
        faq_q1: 'Wann erhalte ich meinen Code oder die Aufladung?',
        faq_a1: 'Sofort-Codes werden unmittelbar nach der Zahlung auf dem Bildschirm angezeigt und unter „Bestellungen“ gespeichert. Direktaufladungen per Player-ID erfolgen automatisch innerhalb weniger Minuten.',
        faq_q2: 'Welche Zahlungsmethoden werden unterstützt?',
        faq_a2: 'Sie können Ihr Guthaben sicher per PayPal, Visa / Mastercard oder mit SHIIFT X Gutscheincodes aufladen.',
        faq_q3: 'Wie prüfe ich die Regionskompatibilität einer Karte?',
        faq_a3: 'Jede Karte zeigt ein deutliches Regionskennzeichen (z. B. 🇺🇸 US-Store, 🇪🇺 EU-Store oder 🌍 Global). Bitte gleichen Sie dieses vor dem Kauf mit Ihrem Kontoland ab.',
        faq_q4: 'Was passiert, wenn eine Player-ID-Aufladung abgelehnt wird?',
        faq_a4: 'Falls eine Direktaufladung wegen einer falschen Player-ID oder Serverwartung nicht ausgeführt werden kann, wird der volle Betrag automatisch Ihrem Shop-Guthaben gutgeschrieben.',
        footer_payment_methods: 'Unterstützte sichere Zahlungsmethoden:',
        footer_copyright: '© 2026 — Alle Rechte vorbehalten',
        footer_privacy: 'Datenschutz',
        footer_terms: 'AGB',
        footer_refund: 'Widerruf & Erstattung',
       footer_acceptableuse: 'Nutzungsrichtlinien',
        footer_impressum: 'impressum',
        drawer_instructions_title: 'Einlösehinweise & Wichtige Informationen',
        label_final_price_tax: 'Endpreis (inkl. Steuern)',
        btn_proceed_checkout: 'Weiter zur Zahlung',
        topup_drawer_title: 'Shop-Guthaben aufladen',
        topup_account_email_label: 'Ihre Konto-ID (E-Mail):',
        btn_copy: 'Kopieren',
        topup_select_amount: '1. Guthabenbetrag wählen:',
        topup_select_method: '2. Sichere Zahlungsmethode wählen:',
        pay_card_desc: 'Sofortzahlung mit europäischem 3D Secure',
        pay_paypal_desc: 'Geprüfte Zahlung mit Käuferschutz',
        btn_proceed_topup: 'Weiter zur sicheren Zahlung',
        btn_email_support: 'Support per E-Mail kontaktieren',
        label_fullname: 'Vollständiger Name',
        label_email: 'E-Mail-Adresse',
        label_password: 'Passwort',
        auth_title_login: 'In Ihr Konto einloggen',
        auth_title_register: 'Neues Konto erstellen',
        auth_btn_login: 'Weiter',
        auth_btn_register: 'Konto erstellen',
        auth_switch_have_acc: 'Bereits ein Konto?',
        auth_switch_no_acc: 'Noch kein Konto?',
        auth_link_login: 'Anmelden',
        auth_link_register: 'Konto erstellen',
        checkout_drawer_title: 'Bestellung abschließen',
        checkout_total_tax: 'Gesamtbetrag (inkl. MwSt.)',
        checkout_current_wallet: 'Aktuelles Guthaben:',
        checkout_remaining_after: 'Restguthaben nach Zahlung:',
        checkout_shortfall_needed: 'Fehlender Betrag:',
        btn_insufficient_topup: 'Guthaben unzureichend — Jetzt aufladen',
        checkout_playerid_label: 'Spieler-ID (Player ID) *',
        checkout_autosave_note: 'Automatisch gespeichert',
        checkout_saved_ids_label: 'Gespeicherte IDs:',
        checkout_playerid_hint: 'Die Aufladung wird direkt an das mit dieser ID verknüpfte Konto gesendet.',
        checkout_eu_waiver: 'Ich stimme den AGB und Rückerstattungsrichtlinien zu und verlange ausdrücklich die sofortige Ausführung und Lieferung des digitalen Inhalts vor Ablauf der 14-tägigen Widerrufsfrist. Mir ist bekannt, dass damit mein EU-Widerrufsrecht gemäß Art. 16(m) erlischt.',
        btn_confirm_pay: 'Zahlung vom Guthaben bestätigen',
        label_your_digital_code: 'Ihr digitaler Code:',
        msg_pending_topup_box: 'Ihre Player-ID-Aufladung wurde übermittelt und wird derzeit ausgeführt. Sie können den Status unter „Bestellungen“ verfolgen.',
        btn_done_close: 'Fertig, schließen',
        orders_drawer_title: 'Meine Bestellungen',
        th_order_ref: 'Bestell-Nr.',
        th_package: 'Paket',
        th_code_id: 'Code / Spieler-ID',
        th_price: 'Preis',
        th_status_action: 'Status & Aktion',
        status_completed: 'Abgeschlossen ✓',
        status_pending: 'In Bearbeitung',
        status_rejected: 'Abgelehnt (Erstattet)',
        btn_reorder: 'Erneut kaufen',
        btn_update_short: 'Prüfen',
        gdpr_delete_note: 'Sie haben gemäß DSGVO jederzeit das Recht, Ihr Konto und Ihre personenbezogenen Daten dauerhaft zu löschen.',
        btn_delete_account: 'Konto endgültig löschen',
        cookie_banner_text: 'Wir verwenden nur technisch notwendigen lokalen Speicher für Sitzung und Design ohne Werbe-Tracking (DSGVO).',
        btn_accept_cookie: 'Verstanden',
        empty_fav_title: 'Keine Favoriten gespeichert',
        empty_fav_desc: 'Tippen Sie auf das Herz-Symbol einer Karte, um sie hier zu speichern.',
        empty_search_title: 'Keine passenden Pakete gefunden',
        empty_search_desc: 'Bitte ändern Sie die Kategorie oder den Suchbegriff.',
        default_inst_id: 'Dieses Paket wird innerhalb weniger Minuten direkt Ihrer Player-ID gutgeschrieben. Bitte prüfen Sie die ID sorgfältig.',
        default_inst_code: 'Der digitale Code wird sofort nach Zahlung ausgeliefert. Bitte achten Sie vor dem Kauf auf die richtige Kontoregion.'
    }
};

function t(key) {
    const dict = RETAIL_I18N[activeLang] || RETAIL_I18N.ar;
    return dict[key] || RETAIL_I18N.ar[key] || key;
}

// =========================================================================
// نظام العملات الديناميكي المربوط بلوحة الإدارة (retail_exchange_rates)
// =========================================================================
function formatRetailMoney(usdAmount) {
    const val = Number(usdAmount) || 0;
    const rate = Number(CURRENCY_RATES[activeCurrency]) > 0 ? Number(CURRENCY_RATES[activeCurrency]) : 1;
    const converted = val * rate;

    if (activeCurrency === 'USD') return `$${converted.toFixed(2)}`;
    if (activeCurrency === 'EUR') return `€${converted.toFixed(2)}`;
    if (activeCurrency === 'SYP') {
        const sypVal = Math.round(converted);
        return `${sypVal.toLocaleString('en-US')}${activeLang === 'ar' ? ' ل.س' : ' SYP'}`;
    }

    const decimals = converted >= 100 ? 0 : 2;
    return `${converted.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    })} ${activeCurrency}`;
}

window.setRetailCurrency = function(curr) {
    const cleanCurr = String(curr || 'USD').trim().toUpperCase();
    activeCurrency = CURRENCY_RATES[cleanCurr] ? cleanCurr : 'USD';
    localStorage.setItem('shiiftx_retail_currency', activeCurrency);
    closeAllHeaderDropdowns();
    syncCurrencyButtonsUI();

    if (typeof syncAuthUIState === 'function') syncAuthUIState(Boolean(currentUser), currentWalletBalance);
    if (typeof renderBrandHubTiles === 'function') renderBrandHubTiles();
    if (typeof renderCatalogGrid === 'function') renderCatalogGrid();
    if (typeof renderTopupAmountChips === 'function') renderTopupAmountChips();

    const activeBuyId = document.getElementById('buy-catalog-id')?.value;
    const buyModal = document.getElementById('buy-modal');
    if (activeBuyId && buyModal && !buyModal.classList.contains('hidden')) {
        const item = catalogItems.find(i => String(i.id) === String(activeBuyId));
        if (item) {
            document.getElementById('buy-modal-price').textContent = formatRetailMoney(item.retail_price);
            if (typeof updateCheckoutWalletPreview === 'function') updateCheckoutWalletPreview(item.retail_price);
        }
    }

    const detailBtn = document.getElementById('pkg-detail-buy-btn');
    const detailModal = document.getElementById('package-details-modal');
    if (detailBtn?.dataset?.id && detailModal && !detailModal.classList.contains('hidden')) {
        const item = catalogItems.find(i => String(i.id) === String(detailBtn.dataset.id));
        if (item) document.getElementById('pkg-detail-price').textContent = formatRetailMoney(item.retail_price);
    }
};

function syncCurrencyButtonsUI() {
    const currLabel = document.getElementById('current-currency-label');
    const badge = document.getElementById('sidebar-currency-badge');

    if (currLabel) currLabel.textContent = CURRENCY_LABELS[activeCurrency] || activeCurrency;
    if (badge) badge.textContent = activeCurrency;

    document.querySelectorAll('.curr-menu-item').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-curr') === activeCurrency);
    });
}

async function initDynamicExchangeRates() {
    try {
        const { data, error } = await retailSupabase
            .from('retail_exchange_rates')
            .select('currency_code, rate_to_usd')
            .order('currency_code', { ascending: true });

        if (error) throw error;

        const freshRates = { USD: 1 };
        const freshLabels = { USD: '$ USD' };

        (data || []).forEach(r => {
            const code = String(r.currency_code || '').trim().toUpperCase();
            const rate = Number(r.rate_to_usd);
            if (code && code !== 'USD' && rate > 0) {
                freshRates[code] = rate;
                const meta = DYNAMIC_CURRENCY_META[code];
                freshLabels[code] = meta ? meta.short : code;
            }
        });

        CURRENCY_RATES = freshRates;
        CURRENCY_LABELS = freshLabels;

        if (!CURRENCY_RATES[activeCurrency]) {
            activeCurrency = 'USD';
            localStorage.setItem('shiiftx_retail_currency', 'USD');
        }

        const menu = document.getElementById('currency-dropdown-menu');
        if (menu) {
            menu.innerHTML = Object.keys(CURRENCY_RATES).map(code => {
                const meta = DYNAMIC_CURRENCY_META[code] || { title: `🌐 ${code}`, short: code };
                const isActive = code === activeCurrency ? 'active' : '';
                return `
                    <button type="button" onclick="setRetailCurrency('${code}')" data-curr="${code}" class="curr-menu-item rev-dropdown-item ${isActive}">
                        <span>${meta.title}</span>
                        <span class="font-mono text-[11px] font-black">${meta.short}</span>
                    </button>
                `;
            }).join('');
        }

        setRetailCurrency(activeCurrency);
    } catch (err) {
        console.error('Exchange rates sync error:', err.message);
        syncCurrencyButtonsUI();
    }
}

// =========================================================================
// تبديل اللغة والقوائم المنسدلة والأدوات المساعدة العامة
// =========================================================================
window.setRetailLanguage = function(lang) {
    activeLang = ['ar', 'en', 'de'].includes(lang) ? lang : 'ar';
    localStorage.setItem('shiiftx_retail_lang', activeLang);
    closeAllHeaderDropdowns();
    applyLanguageToDOM();
};

function applyLanguageToDOM() {
    document.documentElement.lang = activeLang;
    document.documentElement.dir = activeLang === 'ar' ? 'rtl' : 'ltr';

    const langLabel = document.getElementById('current-lang-label');
    if (langLabel) langLabel.textContent = activeLang.toUpperCase();

    document.querySelectorAll('.lang-menu-item').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === activeLang);
    });

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) el.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) el.setAttribute('placeholder', t(key));
    });

    if (typeof updateAuthModalUI === 'function') updateAuthModalUI();
    if (typeof syncAuthUIState === 'function') syncAuthUIState(Boolean(currentUser), currentWalletBalance);
    if (typeof renderTopupAmountChips === 'function') renderTopupAmountChips();
    if (typeof renderBusinessCategoryTabs === 'function') renderBusinessCategoryTabs();
    if (typeof renderSidebarPlatforms === 'function') renderSidebarPlatforms();
    if (typeof renderBrandHubTiles === 'function') renderBrandHubTiles();
    if (typeof renderCatalogGrid === 'function') renderCatalogGrid();
}

window.toggleHeaderDropdown = function(menuId, event) {
    if (event) event.stopPropagation();
    const target = document.getElementById(menuId);
    if (!target) return;

    const isHidden = target.classList.contains('hidden');
    closeAllHeaderDropdowns();
    if (isHidden) target.classList.remove('hidden');
};

function closeAllHeaderDropdowns() {
    ['lang-dropdown-menu', 'currency-dropdown-menu'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

document.addEventListener('click', closeAllHeaderDropdowns);

function applyDesktopSidebarState() {
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed', isSidebarCollapsed);

    const topbarLogo = document.getElementById('topbar-brand-logo');
    if (topbarLogo) {
        // على الشاشات الكبيرة: يظهر الشعار في الشريط العلوي فقط عندما تكون القائمة الجانبية مطوية (collapsed)
        topbarLogo.classList.toggle('lg:hidden', !isSidebarCollapsed);
    }
}
window.toggleDesktopSidebar = function() {
    isSidebarCollapsed = !isSidebarCollapsed;
    localStorage.setItem('shiiftx_sidebar_collapsed', String(isSidebarCollapsed));
    applyDesktopSidebarState();
};
window.toggleMobileSidebar = function(forceOpen) {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;

    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', shouldOpen);
    if (backdrop) backdrop.classList.toggle('hidden', !shouldOpen);
};

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
            bg: 'bg-amber-500/95 border border-amber-300/40 text-[#191c1f]',
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
// ==================== نهاية ملف js/retail-core.js ====================
