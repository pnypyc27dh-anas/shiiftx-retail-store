// ==================== بداية ملف js/retail-app.js ====================
const RETAIL_SUPABASE_URL = 'https://qavdmizccaltsggwrdkk.supabase.co';
const RETAIL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhdmRtaXpjY2FsdHNnZ3dyZGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0NDUzMTgsImV4cCI6MjExMDAyMTMxOH0.RUqkSQggtLrpfFGcr8Y2RUyD6RoJLqzKD3CVc5fo4KI';

const retailSupabase = window.supabase.createClient(RETAIL_SUPABASE_URL, RETAIL_ANON_KEY);

// =========================================================================
// إعدادات العملات وأسعار الصرف (العملة المرجعية في قاعدة البيانات هي USD)
// يمكنك تعديل سعر صرف اليورو أو الليرة السورية من هنا في أي وقت
// =========================================================================
const CURRENCY_RATES = {
    USD: 1,
    EUR: 0.92,
    SYP: 15000
};

const CURRENCY_LABELS = {
    USD: '$ USD',
    EUR: '€ EUR',
    SYP: 'SYP'
};

let activeCurrency = localStorage.getItem('shiiftx_retail_currency') || 'USD';
let activeLang = localStorage.getItem('shiiftx_retail_lang') || 'ar';
let isSidebarCollapsed = localStorage.getItem('shiiftx_sidebar_collapsed') === 'true';

let currentUser = null;
let currentSession = null;
let currentWalletBalance = 0;
let catalogItems = [];
let pendingOrderRefs = [];
let activeAppView = 'store'; // 'store' | 'favorites'
let activeBusinessCategory = 'ALL'; // 'ALL' | 'GAMES' | 'CARDS' | 'STREAMING' | 'SUBSCRIPTIONS'
let activePlatformFilter = 'ALL';
let activeDeliveryTypeFilter = 'ALL';
let activeSearchQuery = '';
let activeSortOrder = 'default';
let favoriteIds = new Set(JSON.parse(localStorage.getItem('shiiftx_retail_favs') || '[]'));

let selectedTopupAmount = 25;
let selectedTopupMethod = 'CARD'; // 'CARD' | 'PAYPAL'

let currentHeroSlide = 0;
let heroAutoTimer = null;

// =========================================================================
// قاموس اللغات الثلاث (العربية AR / الإنجليزية EN / الألمانية DE)
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
        nav_live_support: 'الدعم المباشر',
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
        faq_heading: 'الأسئلة الشائعة وضمانات المشتري',
        faq_subheading: 'كل ما تحتاج معرفته حول التسليم الفوري، توافق المناطق، والدفع عبر PayPal وبطاقات Visa / Mastercard.',
        btn_contact_support: 'تحدث مع الدعم المباشر',
        faq_q1: 'متى أستلم الكود الرقمي أو الشحن بعد الدفع؟',
        faq_a1: 'باقات الكود الفوري تظهر لك فوراً على الشاشة في نفس اللحظة بعد تأكيد الدفع وتحفظ دائماً في قسم «طلباتي». أما باقات الشحن المباشر بالمعرّف (Player ID) فيتم إرسالها آلياً إلى حسابك داخل اللعبة خلال دقائق معدودة.',
        faq_q2: 'ما هي وسائل الدفع المعتمدة في المتجر؟',
        faq_a2: 'يمكنك شحن محفظتك والدفع بسهولة وأمان عبر حساب PayPal أو باستخدام بطاقات الدفع العالمية Visa وMastercard، مع إمكانية عرض الأسعار بالدولار الأمريكي ($ USD) أو اليورو (€ EUR) أو الليرة السورية (SYP).',
        faq_q3: 'كيف أتأكد من توافق منطقة البطاقة (Region) مع حسابي؟',
        faq_a3: 'تحمل كل بطاقة في متجرنا شارة واضحة للمنطقة الجغرافية (مثل 🇺🇸 المتجر الأمريكي أو 🇪🇺 المتجر الأوروبي أو 🌍 عالمي). تأكد دائماً من مطابقة شارة البطاقة لبلد حسابك قبل إتمام الشراء.',
        faq_q4: 'ماذا يحدث إذا تم رفض طلب الشحن بمعرّف اللاعب (ID)؟',
        faq_a4: 'في حال تعذر إتمام الشحن المباشر بسبب خطأ في رقم المعرّف (Player ID) أو صيانة لدى ناشر اللعبة، يقوم نظامنا تلقائياً بإلغاء الطلب وإعادة كامل المبلغ فوراً إلى رصيد محفظتك في المتجر.',
        footer_payment_methods: 'وسائل الدفع المعتمدة والآمنة:',
        footer_copyright: '© 2026 — مسجل في النمسا (الاتحاد الأوروبي)',
        footer_privacy: 'الخصوصية',
        footer_terms: 'الشروط',
        footer_refund: 'الاسترجاع',
        footer_disclaimer: 'جميع الأسعار المعروضة نهائية وشاملة للضرائب المطبقة. جميع العلامات التجارية المذكورة هي ملك لأصحابها الأصليين؛ يعمل متجر SHIIFT X كموزع مستقل للبطاقات الرقمية. للدعم الرسمي:',
        drawer_instructions_title: 'تعليمات الشحن وملاحظات هامة',
        label_final_price_tax: 'السعر النهائي شامل الضريبة',
        btn_proceed_checkout: 'المتابعة للدفع',
        topup_drawer_title: 'إيداع وشحن المحفظة',
        topup_account_email_label: 'معرّف حسابك (البريد الإلكتروني):',
        btn_copy: 'نسخ',
        topup_select_amount: '1. اختر مبلغ الشحن:',
        topup_select_method: '2. اختر وسيلة الدفع:',
        pay_card_desc: 'دفع آمن بالبطاقة البنكية الائتمانية أو المسبقة الدفع',
        pay_paypal_desc: 'دفع سريع وموثق عبر حساب باي بال',
        btn_proceed_topup: 'متابعة الدفع وشحن الرصيد',
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
        btn_insufficient_topup: 'الرصيد غير كافٍ — اضغط للشحن عبر PayPal أو البطاقة',
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
        nav_live_support: 'Live Support',
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
        faq_heading: 'Frequently Asked Questions & Buyer Protection',
        faq_subheading: 'Everything you need to know about instant delivery, region compatibility, and paying via PayPal, Visa & Mastercard.',
        btn_contact_support: 'Chat with Live Support',
        faq_q1: 'When do I receive my digital code or ID top-up?',
        faq_a1: 'Instant Code packages appear on your screen immediately after payment and are saved in "Orders". Direct Player ID top-ups are processed automatically within a few minutes.',
        faq_q2: 'What payment methods are accepted?',
        faq_a2: 'You can top up your wallet securely using PayPal or Visa / Mastercard credit and debit cards, and view prices in USD ($), EUR (€), or Syrian Pound (SYP).',
        faq_q3: 'How do I check card region compatibility?',
        faq_a3: 'Every product card displays a clear region badge (e.g., 🇺🇸 US Store, 🇪🇺 EU Store, or 🌍 Global). Always match the badge with your account country before purchase.',
        faq_q4: 'What happens if a Player ID top-up is rejected?',
        faq_a4: 'If a direct top-up cannot be completed due to an invalid Player ID or game server maintenance, our system automatically cancels the order and refunds the full amount to your wallet.',
        footer_payment_methods: 'Accepted Secure Payment Methods:',
        footer_copyright: '© 2026 — Registered in Austria (European Union)',
        footer_privacy: 'Privacy',
        footer_terms: 'Terms',
        footer_refund: 'Refunds',
        footer_disclaimer: 'All displayed prices are final and include applicable taxes. All trademarks belong to their respective owners; SHIIFT X operates as an independent digital distributor. Official support:',
        drawer_instructions_title: 'Redemption Instructions & Important Notes',
        label_final_price_tax: 'Final Price (Tax Included)',
        btn_proceed_checkout: 'Proceed to Checkout',
        topup_drawer_title: 'Wallet Top-Up & Deposit',
        topup_account_email_label: 'Your Account ID (Email):',
        btn_copy: 'Copy',
        topup_select_amount: '1. Select Top-Up Amount:',
        topup_select_method: '2. Select Payment Method:',
        pay_card_desc: 'Secure payment via credit, debit, or prepaid card',
        pay_paypal_desc: 'Fast & verified checkout via PayPal account',
        btn_proceed_topup: 'Proceed to Payment & Top Up',
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
        btn_insufficient_topup: 'Insufficient Balance — Tap to Top Up via PayPal or Card',
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
        wallet_guest_desc: 'Melden Sie sich an, um Ihr Guthaben zu veralten und Karten sofort zu kaufen.',
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
        nav_live_support: 'Live-Support',
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
        faq_heading: 'Häufige Fragen (FAQ) & Käuferschutz',
        faq_subheading: 'Alles über Sofortlieferung, Regionen und Zahlung per PayPal, Visa & Mastercard.',
        btn_contact_support: 'Live-Support kontaktieren',
        faq_q1: 'Wann erhalte ich meinen Code oder die Aufladung?',
        faq_a1: 'Sofort-Codes werden unmittelbar nach der Zahlung auf dem Bildschirm angezeigt und unter „Bestellungen“ gespeichert. Direktaufladungen per Player-ID erfolgen automatisch innerhalb weniger Minuten.',
        faq_q2: 'Welche Zahlungsmethoden werden unterstützt?',
        faq_a2: 'Sie können Ihr Guthaben sicher per PayPal oder mit Visa / Mastercard aufladen und alle Preise in USD ($), EUR (€) oder Syrischem Pfund (SYP) anzeigen lassen.',
        faq_q3: 'Wie prüfe ich die Regionskompatibilität einer Karte?',
        faq_a3: 'Jede Karte zeigt ein deutliches Regionskennzeichen (z. B. 🇺🇸 US-Store, 🇪🇺 EU-Store oder 🌍 Global). Bitte gleichen Sie dieses vor dem Kauf mit Ihrem Kontoland ab.',
        faq_q4: 'Was passiert, wenn eine Player-ID-Aufladung abgelehnt wird?',
        faq_a4: 'Falls eine Direktaufladung wegen einer falschen Player-ID oder Serverwartung nicht ausgeführt werden kann, wird der volle Betrag automatisch Ihrem Shop-Guthaben gutgeschrieben.',
        footer_payment_methods: 'Unterstützte sichere Zahlungsmethoden:',
        footer_copyright: '© 2026 — Registriert in Österreich (Europäische Union)',
        footer_privacy: 'Datenschutz',
        footer_terms: 'AGB',
        footer_refund: 'Widerruf & Erstattung',
        footer_disclaimer: 'Alle angegebenen Preise sind Endpreise inklusive geltender Steuern. Alle Marken gehören ihren jeweiligen Eigentümern; SHIIFT X agiert als unabhängiger Distributor. Offizieller Support:',
        drawer_instructions_title: 'Einlösehinweise & Wichtige Informationen',
        label_final_price_tax: 'Endpreis (inkl. Steuern)',
        btn_proceed_checkout: 'Weiter zur Zahlung',
        topup_drawer_title: 'Guthaben aufladen',
        topup_account_email_label: 'Ihre Konto-ID (E-Mail):',
        btn_copy: 'Kopieren',
        topup_select_amount: '1. Aufladebetrag wählen:',
        topup_select_method: '2. Zahlungsmethode wählen:',
        pay_card_desc: 'Sichere Zahlung per Kredit-, Debit- oder Prepaid-Karte',
        pay_paypal_desc: 'Schnelle und verifizierte Zahlung per PayPal',
        btn_proceed_topup: 'Weiter zur Zahlung & Aufladung',
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
        btn_insufficient_topup: 'Guthaben unzureichend — Jetzt per PayPal oder Karte aufladen',
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
// تصنيف المنصات حسب هيكل SHIIFT X Business
// GAMES | CARDS | STREAMING | SUBSCRIPTIONS
// =========================================================================
function classifyBusinessCategory(platformName) {
    const p = (platformName || '').toLowerCase();
    if (
        p.includes('pubg') || p.includes('ببجي') ||
        p.includes('free fire') || p.includes('فري فاير') ||
        p.includes('call of duty') || p.includes('كول اوف ديوتي') ||
        p.includes('valorant') || p.includes('فالورانت') ||
        p.includes('mobile legends') || p.includes('موبايل ليجند') ||
        p.includes('roblox') || p.includes('روبلوكس') ||
        p.includes('fortnite') || p.includes('فورتنايت') ||
        p.includes('clash') || p.includes('كلاش') ||
        p.includes('jawaker') || p.includes('جواكر') ||
        p.includes('genshin') || p.includes('ea sports') || p.includes('fifa')
    ) {
        return 'GAMES';
    }
    if (
        p.includes('likee') || p.includes('لايكي') ||
        p.includes('tiktok') || p.includes('تيك توك') ||
        p.includes('bigo') || p.includes('بيجو') ||
        p.includes('tango') || p.includes('تانجو') ||
        p.includes('yalla') || p.includes('يلا لودو') ||
        p.includes('imo') || p.includes('ايمو') ||
        p.includes('discord') || p.includes('ديسكورد') ||
        p.includes('poppo') || p.includes('weplay')
    ) {
        return 'STREAMING';
    }
    if (
        p.includes('netflix') || p.includes('نتفلكس') ||
        p.includes('spotify') || p.includes('سبوتيفاي') ||
        p.includes('shahid') || p.includes('شاهد') ||
        p.includes('osn') || p.includes('watch it') ||
        p.includes('windows') || p.includes('ويندوز') ||
        p.includes('office') || p.includes('اوفيس') || p.includes('أوفيس') ||
        p.includes('microsoft') || p.includes('مايكروسوفت') ||
        p.includes('outlook') || p.includes('chatgpt') || p.includes('canva') || p.includes('telegram')
    ) {
        return 'SUBSCRIPTIONS';
    }
    return 'CARDS';
}

function getBusinessCategoryTitle(catKey) {
    if (catKey === 'GAMES') return t('cat_games');
    if (catKey === 'CARDS') return t('cat_cards');
    if (catKey === 'STREAMING') return t('cat_streaming');
    if (catKey === 'SUBSCRIPTIONS') return t('cat_subscriptions');
    return t('cat_all');
}

window.setBusinessCategoryFilter = function(catKey) {
    activeBusinessCategory = ['ALL', 'GAMES', 'CARDS', 'STREAMING', 'SUBSCRIPTIONS'].includes(catKey) ? catKey : 'ALL';
    activePlatformFilter = 'ALL';

    document.querySelectorAll('#business-category-tabs .rev-cat-tab').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-cat') === activeBusinessCategory);
    });

    renderSidebarPlatforms();
    renderBrandHubTiles();
    renderCatalogGrid();
};

// =========================================================================
// إدارة القوائم المنسدلة في الشريط العلوي (اللغات والعملات)
// =========================================================================
window.toggleHeaderDropdown = function(menuId, event) {
    if (event) event.stopPropagation();
    const target = document.getElementById(menuId);
    if (!target) return;

    const isHidden = target.classList.contains('hidden');
    closeAllHeaderDropdowns();
    if (isHidden) {
        target.classList.remove('hidden');
    }
};

function closeAllHeaderDropdowns() {
    ['lang-dropdown-menu', 'currency-dropdown-menu'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

document.addEventListener('click', () => {
    closeAllHeaderDropdowns();
});

// =========================================================================
// تنسيق المبالغ المالية حسب العملة المختارة (USD / EUR / SYP)
// =========================================================================
function formatRetailMoney(usdAmount) {
    const val = Number(usdAmount || 0);
    if (activeCurrency === 'EUR') {
        return `€${(val * CURRENCY_RATES.EUR).toFixed(2)}`;
    }
    if (activeCurrency === 'SYP') {
        const sypVal = Math.round(val * CURRENCY_RATES.SYP);
        const suffix = activeLang === 'ar' ? ' ل.س' : ' SYP';
        return `${sypVal.toLocaleString('en-US')}${suffix}`;
    }
    return `$${val.toFixed(2)}`;
}

window.setRetailCurrency = function(curr) {
    activeCurrency = ['USD', 'EUR', 'SYP'].includes(curr) ? curr : 'USD';
    localStorage.setItem('shiiftx_retail_currency', activeCurrency);
    closeAllHeaderDropdowns();
    syncCurrencyButtonsUI();
    syncAuthUIState(Boolean(currentUser), currentWalletBalance);
    renderBrandHubTiles();
    renderCatalogGrid();
    renderTopupAmountChips();

    const activeBuyId = document.getElementById('buy-catalog-id')?.value;
    const buyModal = document.getElementById('buy-modal');
    if (activeBuyId && buyModal && !buyModal.classList.contains('hidden')) {
        const item = catalogItems.find(i => String(i.id) === String(activeBuyId));
        if (item) {
            document.getElementById('buy-modal-price').textContent = formatRetailMoney(item.retail_price);
            updateCheckoutWalletPreview(item.retail_price);
        }
    }

    const detailBtn = document.getElementById('pkg-detail-buy-btn');
    const detailModal = document.getElementById('package-details-modal');
    if (detailBtn?.dataset?.id && detailModal && !detailModal.classList.contains('hidden')) {
        const item = catalogItems.find(i => String(i.id) === String(detailBtn.dataset.id));
        if (item) {
            document.getElementById('pkg-detail-price').textContent = formatRetailMoney(item.retail_price);
        }
    }
};

function syncCurrencyButtonsUI() {
    const currLabel = document.getElementById('current-currency-label');
    const badge = document.getElementById('sidebar-currency-badge');

    if (currLabel) currLabel.textContent = CURRENCY_LABELS[activeCurrency] || '$ USD';
    if (badge) badge.textContent = activeCurrency;

    document.querySelectorAll('.curr-menu-item').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-curr') === activeCurrency);
    });
}

// =========================================================================
// تبديل اللغة وتحديث اتجاه الصفحة والنصوص (AR / EN / DE)
// =========================================================================
window.setRetailLanguage = function(lang) {
    activeLang = ['ar', 'en', 'de'].includes(lang) ? lang : 'ar';
    localStorage.setItem('shiiftx_retail_lang', activeLang);
    closeAllHeaderDropdowns();
    applyLanguageToDOM();
};

function applyLanguageToDOM() {
    const isRTL = activeLang === 'ar';
    document.documentElement.lang = activeLang;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';

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

    updateAuthModalUI();
    syncAuthUIState(Boolean(currentUser), currentWalletBalance);
    renderTopupAmountChips();
    renderSidebarPlatforms();
    renderBrandHubTiles();
    renderCatalogGrid();
}

// =========================================================================
// طيّ وفتح القائمة الجانبية على الحاسوب والجوال
// =========================================================================
function applyDesktopSidebarState() {
    const sidebar = document.getElementById('app-sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed', isSidebarCollapsed);
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

// =========================================================================
// فتح وإغلاق الأسئلة الشائعة بشكل مستقل (Independent Accordion FAQ)
// =========================================================================
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

function saveFavoritesStorage() {
    localStorage.setItem('shiiftx_retail_favs', JSON.stringify([...favoriteIds]));
}

// إدارة معرّفات اللاعبين المحفوظة لكل منصة (Saved Player IDs)
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

// استخراج شارة المنطقة الجغرافية تلقائياً وترجمتها حسب اللغة المختارة
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

// أيقونة ولون هوية مخصص لكل علامة تجارية
function getPlatformBrandMeta(platformName) {
    const p = (platformName || '').toLowerCase();
    if (p.includes('pubg') || p.includes('ببجي') || p.includes('free fire') || p.includes('call of duty') || p.includes('valorant') || p.includes('mobile legends') || p.includes('roblox') || p.includes('jawaker')) {
        return { icon: 'ph-fill ph-game-controller', bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' };
    }
    if (p.includes('google')) {
        return { icon: 'ph-fill ph-google-play-logo', bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' };
    }
    if (p.includes('apple') || p.includes('itunes')) {
        return { icon: 'ph-fill ph-apple-logo', bg: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)' };
    }
    if (p.includes('playstation') || p.includes('psn')) {
        return { icon: 'ph-fill ph-playstation-logo', bg: 'linear-gradient(135deg, #00439c 0%, #0070d1 100%)' };
    }
    if (p.includes('xbox')) {
        return { icon: 'ph-fill ph-xbox-logo', bg: 'linear-gradient(135deg, #107c10 0%, #0b5a0b 100%)' };
    }
    if (p.includes('steam')) {
        return { icon: 'ph-fill ph-steam-logo', bg: 'linear-gradient(135deg, #1b2838 0%, #2a475e 100%)' };
    }
    if (p.includes('razer')) {
        return { icon: 'ph-fill ph-coin-vertical', bg: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)' };
    }
    if (p.includes('netflix') || p.includes('spotify') || p.includes('shahid') || p.includes('watch')) {
        return { icon: 'ph-fill ph-television-simple', bg: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)' };
    }
    if (p.includes('likee') || p.includes('tiktok') || p.includes('bigo') || p.includes('discord') || p.includes('tango') || p.includes('yalla')) {
        return { icon: 'ph-fill ph-chats-circle', bg: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' };
    }
    if (p.includes('windows') || p.includes('office') || p.includes('outlook') || p.includes('microsoft')) {
        return { icon: 'ph-fill ph-windows-logo', bg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' };
    }
    return { icon: 'ph-fill ph-credit-card', bg: 'linear-gradient(135deg, #005ba3 0%, #004278 100%)' };
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
// 0. عارض العروض التفاعلي (Interactive Hero Carousel)
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
    heroAutoTimer = setInterval(() => {
        window.stepHeroSlide(1);
    }, 6000);
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

// =========================================================================
// 1. التهيئة ومراقبة جلسة المستخدم
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    applyDesktopSidebarState();
    syncCurrencyButtonsUI();
    applyLanguageToDOM();
    initHeroCarousel();
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
    currentWalletBalance = Number(balance || 0);
    const formatted = formatRetailMoney(currentWalletBalance);
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
// 2. القائمة الجانبية المصنّفة، بطاقات العلامات التجارية، المفضلة، والفلترة
// =========================================================================
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
        grid.innerHTML = `<div class="col-span-full rev-panel py-12 text-center text-rose-500 text-xs font-bold">${escapeHTML(error.message)}</div>`;
        return;
    }

    catalogItems = data || [];
    const totalEl = document.getElementById('sidebar-total-count');
    if (totalEl) totalEl.textContent = String(catalogItems.length);

    updateFavoritesCounter();
    renderSidebarPlatforms();
    renderBrandHubTiles();
    renderCatalogGrid();
}

// رسم المنصات داخل القائمة الجانبية مقسّمة حسب تصنيف SHIIFT X Business
function renderSidebarPlatforms() {
    const container = document.getElementById('sidebar-platform-list');
    if (!container) return;

    const platforms = [...new Set(catalogItems.map(i => i.platform).filter(Boolean))];
    const btnStore = document.getElementById('nav-btn-store');
    if (btnStore) {
        btnStore.classList.toggle('active', activeAppView === 'store' && activePlatformFilter === 'ALL');
    }

    if (platforms.length === 0) {
        container.innerHTML = `<div class="px-3 py-2 text-xs text-[#68707d]">---</div>`;
        return;
    }

    const categoriesOrder = ['GAMES', 'CARDS', 'STREAMING', 'SUBSCRIPTIONS'];
    let htmlOut = '';

    categoriesOrder.forEach(catKey => {
        const catPlatforms = platforms.filter(pl => classifyBusinessCategory(pl) === catKey);
        if (catPlatforms.length === 0) return;

        htmlOut += `
            <div class="space-y-1">
                <div class="rev-sidebar-cat-header sidebar-hide-collapsed">
                    <span>${escapeHTML(getBusinessCategoryTitle(catKey))}</span>
                    <span>${catPlatforms.length}</span>
                </div>
                ${catPlatforms.map(pl => {
                    const count = catalogItems.filter(i => i.platform === pl).length;
                    const isSel = (activeAppView === 'store' && activePlatformFilter === pl);
                    const meta = getPlatformBrandMeta(pl);
                    return `
                        <button type="button" onclick="filterRetailCatalog('${escapeHTML(pl)}')" data-platform="${escapeHTML(pl)}" title="${escapeHTML(pl)}" class="sidebar-platform-btn rev-nav-item ${isSel ? 'active' : ''}">
                            <span class="flex items-center gap-2.5 truncate">
                                <span class="rev-nav-icon"><i class="${meta.icon}"></i></span>
                                <span class="sidebar-hide-collapsed truncate">${escapeHTML(pl)}</span>
                            </span>
                            <span class="sidebar-hide-collapsed text-[11px] font-extrabold opacity-70 shrink-0">${count}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    });

    container.innerHTML = htmlOut;
}

// رسم بطاقات العلامات التجارية المجمّعة (Brand Hub Tiles) حسب التصنيف المختار
function renderBrandHubTiles() {
    const grid = document.getElementById('brand-hub-grid');
    const resetBtn = document.getElementById('brand-reset-btn');
    if (!grid) return;

    if (resetBtn) {
        resetBtn.classList.toggle('hidden', activePlatformFilter === 'ALL' && activeBusinessCategory === 'ALL');
    }

    let platforms = [...new Set(catalogItems.map(i => i.platform).filter(Boolean))];
    if (activeBusinessCategory !== 'ALL') {
        platforms = platforms.filter(pl => classifyBusinessCategory(pl) === activeBusinessCategory);
    }

    if (platforms.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-4 text-xs text-[#68707d] px-1">${escapeHTML(t('empty_search_title'))}</div>`;
        return;
    }

    grid.innerHTML = platforms.map(pl => {
        const plItems = catalogItems.filter(i => i.platform === pl);
        const minPrice = Math.min(...plItems.map(i => Number(i.retail_price || 0)));
        const isSel = (activeAppView === 'store' && activePlatformFilter === pl);
        const meta = getPlatformBrandMeta(pl);

        return `
            <button type="button" onclick="filterRetailCatalog('${escapeHTML(pl)}')" class="rev-brand-tile ${isSel ? 'active' : ''}">
                <div class="rev-brand-avatar" style="background: ${meta.bg};">
                    <i class="${meta.icon}"></i>
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
    if (activePlatformFilter === 'ALL') {
        activeBusinessCategory = 'ALL';
        document.querySelectorAll('#business-category-tabs .rev-cat-tab').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-cat') === 'ALL');
        });
    }

    const btnFav = document.getElementById('nav-btn-favorites');
    const carousel = document.getElementById('hero-carousel');
    const brandHub = document.getElementById('brand-hub-section');
    if (btnFav) btnFav.classList.remove('active');
    if (carousel) carousel.classList.remove('hidden');
    if (brandHub) brandHub.classList.remove('hidden');

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
        items = items.filter(i => classifyBusinessCategory(i.platform) === activeBusinessCategory);
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
            const pr = String(i.retail_price || '');
            const reg = detectPackageRegion(i.platform, i.package_name).label.toLowerCase();
            return p.includes(activeSearchQuery) || n.includes(activeSearchQuery) || pr.includes(activeSearchQuery) || reg.includes(activeSearchQuery);
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
            <div class="col-span-full rev-panel py-16 px-4 text-center space-y-3">
                <i class="ph-duotone ${isFavEmpty ? 'ph-heart-break' : 'ph-magnifying-glass'} text-4xl text-[#68707d]"></i>
                <p class="text-sm font-black">${escapeHTML(isFavEmpty ? t('empty_fav_title') : t('empty_search_title'))}</p>
                <p class="text-xs text-[#68707d] dark:text-slate-400">${escapeHTML(isFavEmpty ? t('empty_fav_desc') : t('empty_search_desc'))}</p>
                <div class="pt-1">
                    <button type="button" onclick="clearCatalogSearch(); activeDeliveryTypeFilter='ALL'; document.getElementById('catalog-type-filter').value='ALL'; switchAppView('store'); filterRetailCatalog('ALL');" class="rev-btn-primary px-6 py-2.5 text-xs">
                        ${escapeHTML(t('breadcrumb_all_packages'))}
                    </button>
                </div>
            </div>`;
        return;
    }

    grid.className = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6';

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
                        <span>${escapeHTML(badgeText)}</span>
                    </span>

                    <button type="button" data-id="${safeId}" onclick="event.stopPropagation(); toggleFavoritePackage(this.dataset.id);"
                            class="rev-fav-btn ${isFav ? 'is-fav' : ''} absolute top-3.5 left-3.5 w-9 h-9 rounded-full bg-black/55 hover:bg-rose-500 text-white backdrop-blur-md border border-white/15 flex items-center justify-center transition cursor-pointer">
                        <i class="ph-fill ph-heart text-base"></i>
                    </button>

                    <span class="absolute bottom-3 right-4 text-[11px] font-extrabold text-white/95 tracking-wide">
                        ${platformName}
                    </span>
                </div>

                <div class="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div class="space-y-2">
                        <div class="rev-region-badge">
                            <span>${region.flag}</span>
                            <span>${escapeHTML(region.label)}</span>
                        </div>
                        <h3 class="text-base font-black leading-snug line-clamp-2 group-hover:text-[#005ba3] dark:group-hover:text-[#5CE1E6] transition-colors">
                            ${pkgName}
                        </h3>
                    </div>

                    <div class="pt-3 border-t border-black/6 dark:border-white/8 flex items-center justify-between gap-3">
                        <div>
                            <span class="block text-[10px] font-bold text-[#68707d] dark:text-slate-400">${escapeHTML(t('label_tax_included'))}</span>
                            <span class="financial-amount text-xl font-black" dir="ltr">${priceFormatted}</span>
                        </div>

                        <button type="button" data-id="${safeId}" onclick="event.stopPropagation(); handleCardDirectBuy(this.dataset.id);"
                                class="rev-btn-primary px-5 py-2.5 text-xs shrink-0">
                            <span>${escapeHTML(t('btn_buy'))}</span>
                            <i class="ph-bold ph-arrow-left text-xs"></i>
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

// =========================================================================
// 2.1 الأدراج الجانبية: تفاصيل الباقة + شحن المحفظة عبر PayPal أو Visa/Mastercard
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
    const email = currentUser?.email || '';
    const methodLabel = selectedTopupMethod === 'PAYPAL' ? 'PayPal' : 'Visa / Mastercard';
    const formattedAmt = formatRetailMoney(selectedTopupAmount);
    const msg = `SHIIFT X Wallet Top-Up\nAccount: ${email}\nAmount: $${selectedTopupAmount} (${formattedAmt})\nMethod: ${methodLabel}`;
    window.open(`https://wa.me/message/BWIV77MOPBG4C1?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
};

window.openTopupModal = function() {
    if (!currentUser) {
        showRetailToast(activeLang === 'ar' ? 'يرجى تسجيل الدخول أولاً لشحن محفظتك' : 'Please sign in first to top up your wallet', 'info');
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

// =========================================================================
// 3. تنفيذ الشراء الذكي عبر دالة Vercel الآمنة (/api/buy)
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
    const tbody = document.getElementById('retail-orders-tbody');
    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-[#68707d]">...</td></tr>`;

    const { data, error } = await retailSupabase
        .from('retail_orders')
        .select('catalog_id, local_order_ref, retail_price, player_id, delivered_code, status, rejection_reason, created_at, retail_catalog(platform, package_name)')
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
    const modeEl = document.getElementById('auth-mode');
    if (!modeEl) return;
    const isRegister = modeEl.value === 'register';
    document.getElementById('auth-modal-title').textContent = isRegister ? t('auth_title_register') : t('auth_title_login');
    document.getElementById('auth-name-group').classList.toggle('hidden', !isRegister);
    document.getElementById('auth-submit-btn').textContent = isRegister ? t('auth_btn_register') : t('auth_btn_login');
    document.getElementById('auth-switch-text').textContent = isRegister ? t('auth_switch_have_acc') : t('auth_switch_no_acc');
    document.getElementById('auth-switch-btn').textContent = isRegister ? t('auth_link_login') : t('auth_link_register');
}

async function handleRetailAuthSubmit(e) {
    e.preventDefault();
    const mode = document.getElementById('auth-mode').value;
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const fullName = document.getElementById('auth-fullname').value.trim();
    const btn = document.getElementById('auth-submit-btn');

    btn.disabled = true;
    btn.textContent = '...';

    try {
        if (mode === 'register') {
            const { error } = await retailSupabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName } }
            });
            if (error) throw error;
            showRetailToast(activeLang === 'ar' ? 'تم إنشاء حسابك بنجاح' : 'Account created successfully', 'success');
        } else {
            const { error } = await retailSupabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            showRetailToast(activeLang === 'ar' ? 'مرحباً بعودتك' : 'Welcome back', 'success');
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
    showRetailToast(activeLang === 'ar' ? 'تم تسجيل الخروج' : 'Signed out', 'info');
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
    const msg = activeLang === 'ar'
        ? 'تحذير نهائي: سيتم حذف حسابك وبياناتك الشخصية نهائياً ولا يمكن التراجع عن هذه الخطوة. هل تريد المتابعة؟'
        : 'Final Warning: Your account and personal data will be permanently deleted under GDPR. Continue?';
    if (!confirm(msg)) return;

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
            showRetailToast(data.error || 'Error deleting account', 'error');
            return;
        }
        await retailSupabase.auth.signOut();
        closeModal('orders-modal');
        showRetailToast(activeLang === 'ar' ? 'تم حذف حسابك وبياناتك بنجاح وفق لائحة GDPR' : 'Account deleted under GDPR', 'success');
    } catch (err) {
        showRetailToast(err.message, 'error');
    }
};
// ==================== نهاية ملف js/retail-app.js ====================
