import { AppStore } from '../store.js';
import { fetchCatalog, addOrder } from '../api.js';
import { loadFromStorage, getTotal, clearCart } from '../cart.js';
import { saveOrder } from '../history.js';
import { buildWhatsAppURL } from '../whatsapp.js';
import { formatCurrency } from '../ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await fetchCatalog();
    loadFromStorage();
    
    if (AppStore.settings) {
      const s = AppStore.settings;
      if (s.name) {
        document.title = s.name + ' | Checkout';
        document.querySelectorAll('#footer-store-name').forEach(el => el.textContent = s.name);
      }
      if (s.email) {
        document.querySelectorAll('#footer-email').forEach(el => el.textContent = s.email);
      }
      if (s.waNumber) {
        document.querySelectorAll('#footer-wa-num').forEach(el => el.textContent = '+' + s.waNumber);
      }
    }

    if (AppStore.cart.length === 0) {
      window.location.href = 'cart.html';
      return;
    }

    renderCheckout();
    document.getElementById('btn-submit').addEventListener('click', handleCheckout);
  } catch(err) {
    console.error('Checkout page initialization failed:', err);
  }
});

function renderCheckout() {
  const container = document.getElementById('checkout-items');
  const itemsHtml = AppStore.cart.map(item => `
    <div class="flex gap-4">
      <div class="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
        <img src="${item.imageURL}" alt="${item.name}" class="w-full h-full object-cover relative z-10">
      </div>
      <div class="flex flex-col flex-1 justify-center">
        <div class="flex items-start justify-between">
          <div class="pr-2">
            <p class="text-sm font-bold text-slate-900 leading-tight mb-1 truncate max-w-[140px] md:max-w-[180px]">${item.name}</p>
            <p class="text-[11px] font-medium text-slate-400">Qty: ${item.quantity} ${item.tags && item.tags.length>0 ? '• '+item.tags[0] : ''}</p>
          </div>
          <span class="text-sm font-bold text-slate-900">${formatCurrency(item.price * item.quantity, AppStore.settings.currency || '₹')}</span>
        </div>
      </div>
    </div>
  `).join('');
  
  container.innerHTML = itemsHtml;
  
  const total = getTotal();
  document.getElementById('checkout-subtotal').textContent = formatCurrency(total, AppStore.settings.currency || '₹');
  document.getElementById('checkout-total').textContent = formatCurrency(total, AppStore.settings.currency || '₹');
}

async function handleCheckout() {
  // Clear previous errors
  ['name', 'phone', 'email', 'address'].forEach(id => {
    const errEl = document.getElementById(`err-${id}`);
    if (errEl) errEl.classList.add('hidden');
    const input = document.getElementById(`cust-${id}`);
    if (input) input.classList.remove('border-red-400', 'ring-red-100');
  });

  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const email = document.getElementById('cust-email').value.trim();
  const address = document.getElementById('cust-address').value.trim();
  const notes = document.getElementById('cust-notes').value.trim();

  let hasError = false;
  if (!name) { showError('name'); hasError = true; }
  if (!phone || phone.length < 5) { showError('phone'); hasError = true; }
  
  if (!email || !email.includes('@') || !email.includes('.')) {
    showError('email');
    hasError = true;
  }

  if (!address) { showError('address'); hasError = true; }

  if (hasError) return;

  const details = { name, phone, email, address, notes };
  const total = getTotal();

  const btnSubmit = document.getElementById('btn-submit');
  const originalText = btnSubmit.innerHTML;
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = 'Saving order...';

  try {
    // STEP 1 — Build payload
    const orderPayload = {
      CustomerName:    name,
      CustomerPhone:   phone.replace(/\D/g, ''),
      CustomerEmail:   email,
      CustomerAddress: address,
      Notes:           notes || '',
      TotalAmount:     total,
      Items_JSON:      JSON.stringify(
        AppStore.cart.map(i => ({
          id:    i.id       || '',
          name:  i.name     || '',
          price: i.price    || 0,
          qty:   i.quantity || 1
        }))
      )
    };

    // STEP 2 — Save to sheet first and WAIT — do not proceed until this completes
    let orderSaved = false;
    try {
      const orderResult = await addOrder(orderPayload);
      if (orderResult && orderResult.status === 'success') {
        orderSaved = true;
        console.log('Order saved to sheet:', orderResult.data?.id);
      } else {
        console.warn('Order sheet save issue:', orderResult?.message);
      }
    } catch (apiErr) {
      console.warn('Order sheet save failed:', apiErr.message);
    }

    // STEP 3 — Save to localStorage
    saveOrder(phone, AppStore.cart, total, details);

    // STEP 4 — Build WhatsApp URL BEFORE clearing cart
    const storeNum = AppStore.settings.waNumber;
    if (!storeNum) {
      const { showToast } = await import('../ui.js');
      showToast('Store WhatsApp number not configured', 'error');
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalText;
      return;
    }

    const url = buildWhatsAppURL(storeNum, details, AppStore.cart, total);

    // STEP 5 — Clear cart only after URL is built
    clearCart();
    sessionStorage.setItem('tl_last_wa_url', url);

    // STEP 6 — Store confirmation flag
    sessionStorage.setItem('tl_order_saved', orderSaved ? 'yes' : 'no');

    // Open WhatsApp in new tab
    try {
      window.open(url, '_blank');
    } catch(e) {
      console.error('Popup blocked:', e);
    }

    // STEP 7 — Navigate ONLY after everything above is done
    window.location.href = 'confirmation.html';

  } catch (err) {
    console.error('Checkout error:', err);
    const { showToast } = await import('../ui.js');
    showToast('Failed to checkout. Please try again.', 'error');
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = originalText;
  }
}

function showError(field) {
  const el = document.getElementById(`err-${field}`);
  const input = document.getElementById(`cust-${field}`);
  if(el) el.classList.remove('hidden');
  if(input) {
    input.classList.remove('border-slate-200');
    input.classList.add('border-red-400', 'ring-2', 'ring-red-100');
  }
}
