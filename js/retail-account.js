// ==================== 4. ملف الحساب والمصادقة ونقطة الانطلاق: js/retail-account.js ====================

function syncAuthUIState(isLoggedIn, balance = 0) {
    currentWalletBalance = Number(balance || 0);
    const formatted = formatRetailMoney(currentWalletBalance);

    const guestBtn = document.getElementById('guest-login-btn');
    const guestBtnWrap = guestBtn?.parentElement;
    const sbGuest = document.getElementById('sidebar-guest-box');
    const sbUser = document.getElementById('sidebar-user-box');
    const sbBal = document.getElementById('sidebar-wallet-balance');
    const sbLogout = document.getElementById('sidebar-logout-btn');

    if (isLoggedIn) {
        if (guestBtn) {
            guestBtn.classList.add('hidden');
            guestBtn.style.display = 'none';
        }
        if (guestBtnWrap) {
            guestBtnWrap.classList.add('hidden');
            guestBtnWrap.classList.remove('sm:inline-flex');
        }

        if (sbGuest) sbGuest.classList.add('hidden');
        if (sbUser) sbUser.classList.remove('hidden');
        if (sbBal) sbBal.textContent = formatted;
        if (sbLogout) sbLogout.classList.remove('hidden');
    } else {
        if (guestBtn) {
            guestBtn.classList.remove('hidden');
            guestBtn.style.display = '';
        }
        if (guestBtnWrap) {
            guestBtnWrap.classList.remove('hidden');
            guestBtnWrap.classList.add('sm:inline-flex');
        }

        if (sbGuest) sbGuest.classList.remove('hidden');
        if (sbUser) sbUser.classList.add('hidden');
        if (sbLogout) sbLogout.classList.add('hidden');
    }
}

async function refreshUserWallet() {
    if (!currentUser) return;
    const { data } = await retailSupabase
        .from('retail_users')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

    const nameEl = document.getElementById('sidebar-client-name');
    if (nameEl) {
        nameEl.textContent = data?.full_name || currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || '---';
    }

    syncAuthUIState(true, data ? data.wallet_balance : 0);
}

// =========================================================================
// المصادقة (تسجيل الدخول / إنشاء حساب / التحقق برمز OTP / خروج)
// =========================================================================
let pendingVerifyEmail = '';
let signupOtpCountdown = null;

function openAuthModal(mode = 'login') {
    pendingVerifyEmail = '';
    if (signupOtpCountdown) {
        clearInterval(signupOtpCountdown);
        signupOtpCountdown = null;
    }
    document.getElementById('auth-credentials-step')?.classList.remove('hidden');
    document.getElementById('auth-otp-step')?.classList.add('hidden');
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

    const otpStep = document.getElementById('auth-otp-step');
    if (otpStep && !otpStep.classList.contains('hidden')) {
        document.getElementById('auth-modal-title').textContent = t('auth_title_verify');
        return;
    }

    const isRegister = modeEl.value === 'register';
    document.getElementById('auth-modal-title').textContent = isRegister ? t('auth_title_register') : t('auth_title_login');
    document.getElementById('auth-name-group').classList.toggle('hidden', !isRegister);
    document.getElementById('auth-submit-btn').textContent = isRegister ? t('auth_btn_register') : t('auth_btn_login');
    document.getElementById('auth-switch-text').textContent = isRegister ? t('auth_switch_have_acc') : t('auth_switch_no_acc');
    document.getElementById('auth-switch-btn').textContent = isRegister ? t('auth_link_login') : t('auth_link_register');
}

function startSignupOtpTimer() {
    const resendBtn = document.getElementById('signup-otp-resend-btn');
    const timerSpan = document.getElementById('signup-otp-resend-timer');
    if (!resendBtn || !timerSpan) return;

    let sec = 60;
    resendBtn.disabled = true;
    timerSpan.textContent = `(${sec}s)`;

    if (signupOtpCountdown) clearInterval(signupOtpCountdown);
    signupOtpCountdown = setInterval(() => {
        sec--;
        if (sec <= 0) {
            clearInterval(signupOtpCountdown);
            signupOtpCountdown = null;
            resendBtn.disabled = false;
            timerSpan.textContent = '';
        } else {
            timerSpan.textContent = `(${sec}s)`;
        }
    }, 1000);
}

function showSignupOtpStep(email) {
    pendingVerifyEmail = email;
    const emailDisplay = document.getElementById('signup-otp-email-display');
    const codeInput = document.getElementById('signup-otp-code-input');

    if (emailDisplay) emailDisplay.textContent = email;
    if (codeInput) codeInput.value = '';

    document.getElementById('auth-credentials-step')?.classList.add('hidden');
    document.getElementById('auth-otp-step')?.classList.remove('hidden');
    document.getElementById('auth-modal-title').textContent = t('auth_title_verify');

    startSignupOtpTimer();
    setTimeout(() => codeInput?.focus(), 100);
}

window.backToAuthCredentialsStep = function() {
    if (signupOtpCountdown) {
        clearInterval(signupOtpCountdown);
        signupOtpCountdown = null;
    }
    document.getElementById('auth-otp-step')?.classList.add('hidden');
    document.getElementById('auth-credentials-step')?.classList.remove('hidden');
    updateAuthModalUI();
};

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
            const { data, error } = await retailSupabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName } }
            });
            if (error) throw error;

            if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
                showRetailToast(
                    activeLang === 'ar'
                        ? 'هذا البريد مسجّل بالفعل. يرجى تسجيل الدخول.'
                        : 'This email is already registered. Please sign in.',
                    'warning'
                );
                document.getElementById('auth-mode').value = 'login';
                updateAuthModalUI();
                return;
            }

            if (data?.session) {
                currentSession = data.session;
                currentUser = data.session.user;
                await refreshUserWallet();
                showRetailToast(activeLang === 'ar' ? 'تم إنشاء حسابك بنجاح' : 'Account created successfully', 'success');
                closeModal('auth-modal');
            } else {
                showSignupOtpStep(email);
                showRetailToast(
                    activeLang === 'ar'
                        ? 'تم إرسال رمز التفعيل المكون من 6 أرقام إلى بريدك الإلكتروني'
                        : 'A 6-digit verification code has been sent to your email',
                    'success'
                );
            }
        } else {
            const { data, error } = await retailSupabase.auth.signInWithPassword({ email, password });
            if (error) {
                if (error.message && error.message.toLowerCase().includes('email not confirmed')) {
                    await retailSupabase.auth.resend({ type: 'signup', email });
                    showSignupOtpStep(email);
                    showRetailToast(
                        activeLang === 'ar'
                            ? 'بريدك غير مفعّل بعد. أرسلنا لك رمز تحقق جديد.'
                            : 'Your email is not verified yet. We sent a new verification code.',
                        'info'
                    );
                    return;
                }
                throw error;
            }

            if (data?.session) {
                currentSession = data.session;
                currentUser = data.session.user;
                await refreshUserWallet();
                await checkPendingOrdersStatus();
            }
            showRetailToast(activeLang === 'ar' ? 'مرحباً بعودتك' : 'Welcome back', 'success');
            closeModal('auth-modal');
        }
    } catch (err) {
        showRetailToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        updateAuthModalUI();
    }
}

window.handleVerifySignupOtp = async function(e) {
    if (e) e.preventDefault();
    const codeInput = document.getElementById('signup-otp-code-input');
    const btn = document.getElementById('btn-verify-signup-otp');
    const code = (codeInput?.value || '').trim();

    if (!pendingVerifyEmail || code.length < 6) {
        showRetailToast(
            activeLang === 'ar' ? 'يرجى إدخال رمز التحقق المكون من 6 أرقام' : 'Please enter the 6-digit verification code',
            'warning'
        );
        return;
    }

    btn.disabled = true;
    try {
        const { data, error } = await retailSupabase.auth.verifyOtp({
            email: pendingVerifyEmail,
            token: code,
            type: 'signup'
        });
        if (error) throw error;

        if (signupOtpCountdown) {
            clearInterval(signupOtpCountdown);
            signupOtpCountdown = null;
        }

        if (data?.session) {
            currentSession = data.session;
            currentUser = data.session.user;
            await refreshUserWallet();
            await checkPendingOrdersStatus();
        }

        pendingVerifyEmail = '';
        closeModal('auth-modal');
        showRetailToast(
            activeLang === 'ar' ? 'تم تفعيل حسابك وتسجيل الدخول بنجاح!' : 'Account verified and signed in successfully!',
            'success'
        );
    } catch (err) {
        showRetailToast(
            (activeLang === 'ar' ? 'رمز التحقق غير صحيح أو منتهي الصلاحية: ' : 'Invalid or expired code: ') + err.message,
            'error'
        );
    } finally {
        btn.disabled = false;
    }
};

window.handleResendSignupOtp = async function() {
    if (!pendingVerifyEmail) return;
    const resendBtn = document.getElementById('signup-otp-resend-btn');
    if (resendBtn) resendBtn.disabled = true;

    try {
        const { error } = await retailSupabase.auth.resend({
            type: 'signup',
            email: pendingVerifyEmail
        });
        if (error) throw error;

        startSignupOtpTimer();
        showRetailToast(
            activeLang === 'ar' ? 'تمت إعادة إرسال رمز التحقق إلى بريدك' : 'Verification code resent to your email',
            'success'
        );
    } catch (err) {
        if (resendBtn) resendBtn.disabled = false;
        showRetailToast(err.message, 'error');
    }
};

async function handleRetailLogout() {
    await retailSupabase.auth.signOut();
    showRetailToast(activeLang === 'ar' ? 'تم تسجيل الخروج' : 'Signed out', 'info');
}

// =========================================================================
// إعدادات الملف الشخصي وحذف الحساب برمز التحقق (OTP) ومهلة 14 يوماً
// =========================================================================
let deleteOtpCountdown = null;

window.shareRetailPlatform = function() {
    const shareData = {
        title: 'SHIIFT X',
        text: 'متجر SHIIFT X للبطاقات الرقمية والشحن الفوري',
        url: window.location.origin
    };
    if (navigator.share) {
        navigator.share(shareData).catch(() => {});
    } else {
        navigator.clipboard.writeText(window.location.origin);
        showRetailToast('تم نسخ رابط المتجر للمشاركة', 'success');
    }
};

window.openProfileSettingsModal = async function() {
    if (!currentUser) {
        openAuthModal('login');
        return;
    }
    document.getElementById('prof-retail-email').value = currentUser.email || '';

    const { data } = await retailSupabase
        .from('retail_users')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

    document.getElementById('prof-retail-name').value = data?.full_name || currentUser.user_metadata?.full_name || '';
    document.getElementById('prof-retail-phone').value = data?.phone || '';
    document.getElementById('profile-settings-modal').classList.remove('hidden');
};

window.saveRetailProfile = async function() {
    if (!currentUser) return;
    const fullName = document.getElementById('prof-retail-name').value.trim();
    const phone = document.getElementById('prof-retail-phone').value.trim();
    const btn = document.getElementById('prof-retail-save-btn');

    btn.disabled = true;
    try {
        const { error } = await retailSupabase.rpc('update_retail_profile', {
            p_full_name: fullName,
            p_phone: phone
        });
        if (error) throw error;
        await refreshUserWallet();
        showRetailToast(
            activeLang === 'ar' ? 'تم حفظ وتحديث بيانات الحساب بنجاح' : 'Profile updated successfully',
            'success'
        );
        closeModal('profile-settings-modal');
    } catch (err) {
        showRetailToast(err.message, 'error');
    } finally {
        btn.disabled = false;
    }
};

window.openDeleteAccountOTPModal = function() {
    if (!currentUser) return;
    document.getElementById('del-account-email-display').value = currentUser.email || '';
    document.getElementById('del-otp-code-input').value = '';
    document.getElementById('del-otp-step-1').classList.remove('hidden');
    document.getElementById('del-otp-step-2').classList.add('hidden');
    document.getElementById('delete-account-otp-modal').classList.remove('hidden');
};

window.closeDeleteAccountOTPModal = function() {
    document.getElementById('delete-account-otp-modal').classList.add('hidden');
    if (deleteOtpCountdown) clearInterval(deleteOtpCountdown);
};

function startDeleteOtpTimer() {
    const resendBtn = document.getElementById('del-resend-btn');
    const timerSpan = document.getElementById('del-resend-timer');
    let sec = 60;
    resendBtn.disabled = true;
    timerSpan.textContent = `(${sec}s)`;

    if (deleteOtpCountdown) clearInterval(deleteOtpCountdown);
    deleteOtpCountdown = setInterval(() => {
        sec--;
        if (sec <= 0) {
            clearInterval(deleteOtpCountdown);
            resendBtn.disabled = false;
            timerSpan.textContent = '';
        } else {
            timerSpan.textContent = `(${sec}s)`;
        }
    }, 1000);
}

window.handleSendDeleteAccountOTP = async function() {
    if (!currentUser?.email) return;
    const btn = document.getElementById('send-del-otp-btn');
    btn.disabled = true;

    try {
        const { error } = await retailSupabase.auth.signInWithOtp({
            email: currentUser.email,
            options: { shouldCreateUser: false }
        });
        if (error) throw error;

        document.getElementById('del-otp-step-1').classList.add('hidden');
        document.getElementById('del-otp-step-2').classList.remove('hidden');
        startDeleteOtpTimer();
        showRetailToast('تم إرسال رمز التحقق المكون من 6 أرقام إلى بريدك', 'success');
    } catch (err) {
        showRetailToast(err.message, 'error');
    } finally {
        btn.disabled = false;
    }
};

window.handleVerifyAndDeleteAccount = async function() {
    const code = document.getElementById('del-otp-code-input').value.trim();
    if (code.length < 6) {
        showRetailToast('يرجى إدخال رمز التحقق المكون من 6 أرقام', 'warning');
        return;
    }

    const btn = document.getElementById('confirm-del-with-otp-btn');
    btn.disabled = true;

    try {
        const { error: otpErr } = await retailSupabase.auth.verifyOtp({
            email: currentUser.email,
            token: code,
            type: 'email'
        });
        if (otpErr) throw otpErr;

        const { error: rpcErr } = await retailSupabase.rpc('schedule_retail_account_deletion');
        if (rpcErr) throw rpcErr;

        window.closeDeleteAccountOTPModal();
        await retailSupabase.auth.signOut();
        showRetailToast('تمت جدولة حذف حسابك بعد 14 يوماً. يمكنك استعادته بتسجيل الدخول خلال المهلة.', 'warning');
    } catch (err) {
        showRetailToast('رمز التحقق غير صحيح أو منتهي الصلاحية: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
    }
};

async function checkAccountDeletionGracePeriod() {
    if (!currentUser) return;
    const { data } = await retailSupabase
        .from('retail_users')
        .select('deletion_scheduled_at')
        .eq('id', currentUser.id)
        .maybeSingle();

    if (data && data.deletion_scheduled_at) {
        const delDate = new Date(data.deletion_scheduled_at).toLocaleDateString('en-GB');
        const desc = document.getElementById('reactivate-modal-desc');
        if (desc) {
            desc.textContent = `حسابك مجدول للحذف النهائي بتاريخ (${delDate}). هل ترغب في إلغاء طلب الحذف واستعادة حسابك الآن؟`;
        }
        document.getElementById('reactivate-modal')?.classList.remove('hidden');
    }
}

window.handleConfirmReactivate = async function() {
    const { error } = await retailSupabase.rpc('cancel_retail_account_deletion');
    if (error) {
        showRetailToast(error.message, 'error');
        return;
    }
    document.getElementById('reactivate-modal')?.classList.add('hidden');
    showRetailToast('تم إلغاء طلب الحذف واستعادة حسابك بنجاح', 'success');
};

window.handleCancelReactivate = async function() {
    document.getElementById('reactivate-modal')?.classList.add('hidden');
    await retailSupabase.auth.signOut();
};

// =========================================================================
// نقطة الانطلاق الرئيسية عند تحميل الصفحة (App Bootstrap)
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    applyDesktopSidebarState();

    // 1. استعادة الجلسة أولاً قبل أي رسم للواجهة
    try {
        const { data: { session } } = await retailSupabase.auth.getSession();
        if (session) {
            currentSession = session;
            currentUser = session.user;
        }
    } catch (err) {
        console.error('Session bootstrap error:', err.message);
    }

    // 2. تحميل الإعدادات والكتالوج
    await initDynamicExchangeRates();
    applyLanguageToDOM();
    initHeroCarousel();
    updateFavoritesCounter();
    await loadRetailCatalog();

    if (!localStorage.getItem('shiiftx_eu_consent')) {
        const banner = document.getElementById('eu-cookie-banner');
        if (banner) banner.classList.remove('hidden');
    }

    // 3. مزامنة بيانات المحفظة والطلبات النشطة
    if (currentUser) {
        await refreshUserWallet();
        await checkPendingOrdersStatus();
        setTimeout(checkAccountDeletionGracePeriod, 400);
    } else {
        syncAuthUIState(false, 0);
    }

    // 4. الاستماع لتغييرات المصادقة اللاحقة فقط
    retailSupabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'INITIAL_SESSION') return;

        currentSession = session;
        currentUser = session ? session.user : null;

        if (currentUser) {
            await refreshUserWallet();
            await checkPendingOrdersStatus();
            setTimeout(checkAccountDeletionGracePeriod, 400);
        } else if (event === 'SIGNED_OUT') {
            currentWalletBalance = 0;
            syncAuthUIState(false, 0);
            const pendingBanner = document.getElementById('pending-order-banner');
            if (pendingBanner) pendingBanner.classList.add('hidden');
        }
    });
});
// ==================== نهاية ملف js/retail-account.js ====================
