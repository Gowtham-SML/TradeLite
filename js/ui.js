export function formatCurrency(amount, symbol = '₹') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount).replace('₹', symbol);
}

export function formatDate(isoString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(isoString).toLocaleDateString('en-IN', options);
}

export function updateCartBadge(count) {
  const badges = document.querySelectorAll('.cart-badge');
  badges.forEach(badge => {
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  });
}

export function showToast(message, type = 'success') {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    document.body.appendChild(toast);
  }

  // Base styles always applied
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    padding: 14px 28px;
    border-radius: 999px;
    color: #ffffff;
    font-weight: 600;
    font-size: 14px;
    font-family: inherit;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    z-index: 9999;
    transition: opacity 0.3s ease, transform 0.3s ease;
    opacity: 1;
    pointer-events: auto;
    max-width: 90vw;
    text-align: center;
    white-space: nowrap;
    background-color: ${type === 'error' ? '#ef4444' : '#22c55e'};
  `;

  toast.textContent = message;

  // Clear existing timeout
  if (toast._timeoutId) clearTimeout(toast._timeoutId);

  // Auto hide after 3.5 seconds
  toast._timeoutId = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(12px)';
  }, 3500);
}

export function openBottomSheet(id) {
  const sheet = document.getElementById(id);
  if (!sheet) return;
  const overlay = sheet.querySelector('.overlay');
  const panel = sheet.querySelector('.bottom-sheet');
  if (overlay) overlay.classList.add('open', 'opacity-100');
  if (panel) panel.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeBottomSheet(id) {
  const sheet = document.getElementById(id);
  if (!sheet) return;
  const overlay = sheet.querySelector('.overlay');
  const panel = sheet.querySelector('.bottom-sheet');
  if (overlay) overlay.classList.remove('open', 'opacity-100');
  if (panel) panel.classList.remove('open');
  document.body.style.overflow = '';
}

export function renderSkeletonCards(containerId, count) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse border border-slate-100">
        <div class="w-full aspect-square bg-slate-200"></div>
        <div class="p-4 flex flex-col gap-3">
          <div class="h-4 bg-slate-200 rounded w-1/3"></div>
          <div class="h-6 bg-slate-200 rounded w-3/4"></div>
          <div class="h-5 bg-slate-200 rounded w-1/2 mt-2"></div>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

// Alias for renderSkeleton
export const renderSkeleton = renderSkeletonCards;

export function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const localPart = parts[0];
  const domain = parts[1];
  
  if (localPart.length <= 5) {
    const first = localPart.charAt(0);
    const last = localPart.charAt(localPart.length - 1);
    return first + '*****' + last + '@' + domain;
  }
  
  const first = localPart.substring(0, 2);
  const last = localPart.substring(localPart.length - 3);
  return first + '*****' + last + '@' + domain;
}
