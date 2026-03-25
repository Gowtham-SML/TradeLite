import { sendOtp, verifyOtp } from './api.js';
import { maskEmail, showToast } from './ui.js';

let otpState = {
  phone: '',
  email: '',
  timerInterval: null,
  timerSeconds: 60,
  attempts: 3,
  onSuccess: null,
  onError: null
};

export function initOtpFlow(phone, callback, errCallback) {
  otpState.phone = phone;
  otpState.attempts = 3;
  otpState.timerSeconds = 60;
  otpState.onSuccess = callback;
  otpState.onError = errCallback;

  // Check lockout
  const lockoutInfo = localStorage.getItem(`tl_otp_lockout_${phone}`);
  if (lockoutInfo) {
    const unlockTime = parseInt(lockoutInfo, 10);
    if (Date.now() < unlockTime) {
      if (errCallback) errCallback({ error: `Too many attempts. Please wait.` });
      return;
    } else {
      localStorage.removeItem(`tl_otp_lockout_${phone}`);
    }
  }

  // Call send API FIRST
  sendOtp(phone).then(res => {
    if (res.locked) {
      if (errCallback) errCallback({ error: 'Account locked. Try again later.' });
      return;
    }
    if (res.notFound) {
      if (errCallback) errCallback({ notFound: true, error: res.error });
      return;
    }
    if (!res.success) {
      if (errCallback) errCallback({ error: res.error || 'Failed to send OTP' });
      return;
    }

    // Set UI State
    document.getElementById('top-section').style.display = 'none';
    document.getElementById('orders-container').innerHTML = ''; // Clear below
    
    renderOtpUI(res.maskedEmail || 'your email');
    startTimer();

  }).catch(err => {
    if (errCallback) errCallback({ error: 'Server error occurred' });
  });
}

function renderOtpUI(maskedEmail) {
  const devBanner = '';

  const html = `
    <div class="flex justify-center w-full" id="otp-wrapper">
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-[480px] w-full text-center">
        ${devBanner}
        <div class="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
          <span class="material-symbols-outlined text-[24px]">mail</span>
        </div>
        
        <h2 class="text-xl font-bold text-slate-900 mb-1">Check your email</h2>
        <p class="text-sm text-slate-500 mb-6">We sent a 6-digit code to <br><span class="font-bold text-slate-800">${maskedEmail}</span></p>

        <div class="flex justify-center gap-2 sm:gap-3 mb-2" id="otp-inputs">
          ${[...Array(6)].map((_, i) => `<input type="text" maxlength="1" class="otp-box w-10 sm:w-12 h-12 sm:h-14 border-2 border-slate-200 rounded-lg text-2xl font-bold text-center outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-white text-slate-900" data-idx="${i}">`).join('')}
        </div>
        <p style="color:#dc2626;font-size:12px;font-weight:700;min-height:16px;margin:4px 0 16px;" id="otp-error-msg"></p>

        <button id="btn-verify" class="w-full bg-primary hover:bg-primary-dark text-white rounded-full font-bold text-lg py-3.5 mb-6 shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2">
          Verify & View Orders
        </button>

        <div class="text-sm">
          <p class="text-slate-500 mb-1" id="timer-text">Resend code in <span id="timer-count">1:00</span></p>
          <button id="btn-resend" class="text-sm font-bold text-slate-300 pointer-events-none transition-colors">Resend code</button>
        </div>
        
        <button id="btn-cancel" class="text-xs font-medium text-slate-400 hover:text-slate-600 mt-6 transition-colors">Use a different number</button>
      </div>
    </div>
  `;

  const topSection = document.getElementById('top-section');
  const container = topSection.parentElement;
  
  // Save search UI safely to restore
  if (!document.getElementById('saved-search-ui')) {
    const saved = document.createElement('div');
    saved.id = 'saved-search-ui';
    saved.style.display = 'none';
    saved.innerHTML = topSection.innerHTML;
    container.appendChild(saved);
  }

  // Inject
  const wrapper = document.createElement('div');
  wrapper.id = 'otp-container';
  wrapper.innerHTML = html;
  topSection.parentElement.insertBefore(wrapper, topSection);

  // Focus first
  setTimeout(() => {
    const inputs = document.querySelectorAll('.otp-box');
    if (inputs.length) inputs[0].focus();
  }, 100);

  attachOtpListeners();
}

function attachOtpListeners() {
  const inputs = Array.from(document.querySelectorAll('.otp-box'));
  
  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      // Remove non digits
      input.value = input.value.replace(/\D/g, '');
      
      if (input.value && index < 5) {
        inputs[index + 1].focus();
      }
      checkFilledState();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        inputs[index - 1].focus();
        inputs[index - 1].value = '';
      }
    });

    input.addEventListener('paste', handlePaste);
  });

  document.getElementById('btn-verify').addEventListener('click', handleVerify);
  
  document.getElementById('btn-resend').addEventListener('click', handleResend);

  document.getElementById('btn-cancel').addEventListener('click', () => {
    // Back to normal
    cleanupOtpUI();
    document.getElementById('top-section').style.display = 'block';
  });
}

function checkFilledState() {
  const inputs = document.querySelectorAll('.otp-box');
  inputs.forEach(input => {
    if (input.value) {
      input.classList.remove('border-slate-200', 'bg-white');
      input.classList.add('border-primary', 'bg-[var(--color-background-warm)]');
    } else {
      input.classList.remove('border-primary', 'bg-[var(--color-background-warm)]');
      input.classList.add('border-slate-200', 'bg-white');
    }
  });
}

function handlePaste(e) {
  e.preventDefault();
  const pasteData = (e.clipboardData || window.clipboardData).getData('text');
  const digits = pasteData.replace(/\D/g, '').split('').slice(0, 6);
  
  const inputs = Array.from(document.querySelectorAll('.otp-box'));
  digits.forEach((digit, i) => {
    inputs[i].value = digit;
  });
  
  if (digits.length > 0) {
    const focusIndex = Math.min(digits.length, 5);
    inputs[focusIndex].focus();
  }
  
  checkFilledState();
}

function startTimer() {
  if (otpState.timerInterval) clearInterval(otpState.timerInterval);
  otpState.timerSeconds = 60;
  
  const resendBtn = document.getElementById('btn-resend');
  const timerText = document.getElementById('timer-text');
  
  if(!resendBtn || !timerText) return;

  resendBtn.classList.add('pointer-events-none', 'text-slate-300');
  resendBtn.classList.remove('text-primary', 'hover:text-primary-dark');
  timerText.style.display = 'block';

  otpState.timerInterval = setInterval(() => {
    otpState.timerSeconds--;
    if (otpState.timerSeconds <= 0) {
      clearInterval(otpState.timerInterval);
      timerText.style.display = 'none';
      resendBtn.classList.remove('pointer-events-none', 'text-slate-300');
      resendBtn.classList.add('text-primary', 'hover:text-primary-dark');
      resendBtn.textContent = "Didn't receive it? Resend code";
    } else {
      const min = Math.floor(otpState.timerSeconds / 60);
      const sec = (otpState.timerSeconds % 60).toString().padStart(2, '0');
      document.getElementById('timer-count').textContent = `${min}:${sec}`;
    }
  }, 1000);
}

function handleResend() {
  sendOtp(otpState.phone).then(res => {
    if (res.locked) {
      showOtpError('Account locked.', 0);
      lockOtpUI();
      return;
    }
    showToast('New code sent to your email');
    const inputs = document.querySelectorAll('.otp-box');
    inputs.forEach(i => i.value = '');
    checkFilledState();
    inputs[0].focus();
    startTimer();
  });
}

function handleVerify() {
  const inputs = Array.from(document.querySelectorAll('.otp-box'));
  const code = inputs.map(i => i.value).join('');
  
  if (code.length !== 6) return;

  const btn = document.getElementById('btn-verify');
  const originalHtml = btn.innerHTML;
  btn.innerHTML = `<span class="material-symbols-outlined animate-spin">progress_activity</span> Verifying...`;
  btn.classList.add('opacity-80', 'pointer-events-none');
  
  // Clear error
  document.getElementById('otp-error-msg').textContent = '';
  inputs.forEach(i => i.classList.remove('border-error', 'bg-red-50', 'animate-shake'));

  verifyOtp(otpState.phone, code).then(res => {
    btn.innerHTML = originalHtml;
    btn.classList.remove('opacity-80', 'pointer-events-none');

    if (res.success) {
      showOtpSuccess(res.orders);
    } else {
      otpState.attempts--;
      if (res.locked || otpState.attempts <= 0) {
        lockOut();
      } else {
        showOtpError('Incorrect code. ' + otpState.attempts + ' attempts remaining.');
      }
    }
  });
}

function showOtpError(msg) {
  const inputs = document.querySelectorAll('.otp-box');
  const errMsg = document.getElementById('otp-error-msg');
  if(!errMsg) return;
  
  errMsg.textContent = msg;
  errMsg.style.color = '#dc2626';
  errMsg.style.display = 'block';
  
  inputs.forEach(i => {
    i.classList.remove('border-primary', 'border-slate-200', 'bg-white', 'bg-[var(--color-background-warm)]');
    i.classList.add('border-error', 'bg-[#fff5f5]');
    // trigger reflow for animation
    void i.offsetWidth;
    i.classList.add('animate-shake');
    // Clean up classes after anim
    setTimeout(() => i.classList.remove('animate-shake', 'border-error', 'bg-[#fff5f5]'), 500);
  });
  
  setTimeout(() => checkFilledState(), 500);
}

function lockOut() {
  const future = Date.now() + 10 * 60 * 1000;
  localStorage.setItem(`tl_otp_lockout_${otpState.phone}`, future.toString());
  showOtpError('Too many attempts. Please wait 10 minutes.');
  lockOtpUI();
}

function lockOtpUI() {
  document.querySelectorAll('.otp-box').forEach(i => i.disabled = true);
  const btn = document.getElementById('btn-verify');
  if(btn) btn.disabled = true;
  if(otpState.timerInterval) clearInterval(otpState.timerInterval);
}

function showOtpSuccess(orders) {
  const inputs = document.querySelectorAll('.otp-box');
  inputs.forEach(i => {
    i.classList.remove('border-primary', 'border-slate-200', 'bg-white', 'bg-[var(--color-background-warm)]');
    i.style.borderColor = '#22c55e';
    i.style.backgroundColor = '#f0fdf4';
  });

  showToast('Identity verified ✓');
  sessionStorage.setItem(`tl_verified_${otpState.phone}`, 'true');

  setTimeout(() => {
    cleanupOtpUI();
    document.getElementById('top-section').style.display = 'block';
    if (otpState.onSuccess) otpState.onSuccess(orders);
  }, 800);
}

function cleanupOtpUI() {
  const container = document.getElementById('otp-container');
  if (container) container.remove();
  if (otpState.timerInterval) clearInterval(otpState.timerInterval);
}
