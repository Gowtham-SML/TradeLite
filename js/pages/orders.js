import { AppStore } from '../store.js';
import { fetchCatalog } from '../api.js';
import { loadFromStorage } from '../cart.js';
import { updateCartBadge } from '../ui.js';
import { getItemCount } from '../cart.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await fetchCatalog();
    loadFromStorage();
    
    if (AppStore.settings) {
      const s = AppStore.settings;
      if (s.name) {
        document.title = s.name + ' | Orders';
        document.querySelectorAll('#footer-store-name').forEach(el => el.textContent = s.name);
      }
      if (s.email) {
        document.querySelectorAll('#footer-email').forEach(el => el.textContent = s.email);
      }
      if (s.waNumber) {
        document.querySelectorAll('#footer-wa-num').forEach(el => el.textContent = '+' + s.waNumber);
      }
    }
    updateCartBadge(getItemCount());
  } catch(err) {
    console.error('Orders page catalog load failed:', err);
  }
  
  const form = document.getElementById('order-search-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = document.getElementById('search-phone').value;
    const cleanPhone = val.replace(/\D/g, '');
    if (!cleanPhone) return;

    const existingErr = document.getElementById('orders-error-msg');
    if (existingErr) existingErr.style.display = 'none';

    const btn = form.querySelector('button[type="submit"]');    
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Sending...';
    btn.disabled = true;

    try {
      const module = await import('../otp.js');
      await new Promise((resolve, reject) => {
        module.initOtpFlow(cleanPhone, (ordersArray) => {
          renderOrders(ordersArray || []);
          resolve();
        }, (err) => {
          if (err && err.notFound) {
            document.getElementById('top-section').style.display = 'block';
            renderOrders([]);
            resolve();
          } else {
            reject(err);
          }
        });
      });
    } catch (err) {
      document.getElementById('top-section').style.display = 'block';
      const errorMessage = (err && (err.error || err.message)) || 'Something went wrong. Please try again.';

      // Show inline red error below the search box — stays visible
      let errorEl = document.getElementById('orders-error-msg');
      if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.id = 'orders-error-msg';
        errorEl.style.cssText = `
          margin-top: 12px;
          padding: 12px 20px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 12px;
          color: #dc2626;
          font-size: 14px;
          font-weight: 600;
          text-align: center;
        `;
        const form = document.getElementById('order-search-form');
        form.parentNode.insertBefore(errorEl, form.nextSibling);
      }
      errorEl.textContent = errorMessage;
      errorEl.style.display = 'block';

      // Also show toast
      const { showToast } = await import('../ui.js');
      showToast(errorMessage, 'error');
      console.error('Orders page error:', err);
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });
});

window.toggleOrderDetails = (idx) => {
  // Simple CSS class toggle approach for expanded elements
  const el = document.getElementById(`order-details-${idx}`);
  const btn = document.getElementById(`btn-details-${idx}`);
  if (!el) return;
  if (el.classList.contains('hidden')) {
    el.classList.remove('hidden');
    btn.innerHTML = `Hide <span class="material-symbols-outlined text-[18px]">expand_less</span>`;
  } else {
    el.classList.add('hidden');
    btn.innerHTML = `Details <span class="material-symbols-outlined text-[18px]">expand_more</span>`;
  }
}

function renderOrders(orders) {
  const container = document.getElementById('orders-container');
  document.getElementById('top-section').style.display = 'block';

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <span class="material-symbols-outlined text-[48px] text-slate-300 mb-4">receipt_long</span>
        <h3 class="text-lg font-bold text-slate-900 mb-2">No previous orders found for this number</h3>
        <p class="text-slate-500 font-medium mb-8">Make sure the number matches exactly what was entered at checkout.</p>
        <a href="products.html" class="bg-primary hover:bg-primary-dark shadow-md text-white px-8 py-3 rounded-full font-bold transition-all text-sm tracking-wide">Start Shopping</a>
      </div>
    `;
    return;
  }

  const currency = AppStore.settings.currency || '₹';

  // Show most recent order first
  const sorted = [...orders].reverse();

  container.innerHTML = sorted.map((order) => `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div class="p-6">
        <div class="flex items-start justify-between mb-4 pb-4 border-b border-slate-100">
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ORDER DATE</p>
            <p class="font-extrabold text-lg text-slate-900">${order.date || 'N/A'}</p>
            ${order.id ? `<p class="text-[11px] text-slate-400 mt-1 font-mono">${order.id}</p>` : ''}
          </div>
          <div class="text-right">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">TOTAL</p>
            <p class="font-extrabold text-xl text-primary">${currency}${order.total || 0}</p>
          </div>
        </div>
        <div>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">ITEMS ORDERED</p>
          <p class="text-sm font-medium text-slate-700 leading-relaxed">${order.items || 'No item details available'}</p>
          ${order.notes && order.notes.trim() ? `
            <div class="mt-3 pt-3 border-t border-slate-100">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">NOTES</p>
              <p class="text-xs text-slate-500">${order.notes}</p>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}
