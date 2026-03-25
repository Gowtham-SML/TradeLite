import { AppStore } from '../store.js';
import { fetchCatalog } from '../api.js';
import { loadFromStorage, removeItem, updateQuantity, getTotal, getItemCount } from '../cart.js';
import { formatCurrency, updateCartBadge, showToast } from '../ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await fetchCatalog();
    loadFromStorage();
    
    if (AppStore.settings) {
      const s = AppStore.settings;
      if (s.name) {
        document.title = s.name + ' | Cart';
        document.querySelectorAll('#footer-store-name').forEach(el => el.textContent = s.name);
      }
      if (s.email) {
        document.querySelectorAll('#footer-email').forEach(el => el.textContent = s.email);
      }
      if (s.waNumber) {
        document.querySelectorAll('#footer-wa-num').forEach(el => el.textContent = '+' + s.waNumber);
      }
    }

    renderCart();
    updateCartBadge(getItemCount());
  } catch(err) {
    console.error('Cart initialization failed:', err);
  }
  
  // Custom event listener for cart changes (if updating from another module or here)
  window.addEventListener('cartUpdated', renderCart);
});

function renderCart(e) {
  const c = document.getElementById('cart-container');
  if(!c) return;

  const count = getItemCount();
  const items = AppStore.cart;
  let html = '';

  if (items.length === 0) {
    html = `
      <div class="flex flex-col items-center justify-center py-24 px-4 text-center min-h-[50vh]">
        <div class="w-24 h-24 rounded-full bg-white shadow-sm flex items-center justify-center text-primary mb-8 border border-slate-100">
          <span class="material-symbols-outlined text-[48px]">local_mall</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900 mb-3">Your cart is empty</h1>
        <p class="text-slate-500 font-medium max-w-sm mb-10">You haven't added any items to your collection yet. Start shopping to fill it up.</p>
        <a href="products.html" class="btn-primary py-4 px-10 rounded-full font-bold shadow-md hover:shadow-lg transition-all text-sm tracking-wide">
          Start Shopping
        </a>
      </div>
    `;
  } else {
    // Has items
    const total = getTotal();

    // Items list
    const itemsHtml = items.map(item => `
      <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex gap-5">
        <a href="product.html?id=${item.id}" class="w-24 h-32 md:w-32 md:h-40 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
          <img src="${item.imageURL}" alt="${item.name}" class="w-full h-full object-cover">
        </a>
        <div class="flex-1 flex flex-col pt-1">
          <div class="flex justify-between items-start gap-4">
            <div>
              <h3 class="font-bold text-slate-900 text-lg leading-tight mb-1"><a href="product.html?id=${item.id}" class="hover:text-primary transition-colors">${item.name}</a></h3>
              <p class="text-sm font-medium text-slate-400">${item.category}</p>
            </div>
            <button class="text-slate-400 hover:text-error transition-colors p-2 -mr-2 -mt-2 btn-remove" data-id="${item.id}">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
          
          <div class="mt-auto flex items-end justify-between">
            <div class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-full p-1 w-[120px]">
              <button class="w-8 h-8 flex items-center justify-center text-slate-600 rounded-full hover:bg-slate-200 transition-colors btn-qty-minus" data-id="${item.id}">
                <span class="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <span class="flex-1 text-center font-bold text-slate-900 text-sm">${item.quantity}</span>
              <button class="w-8 h-8 flex items-center justify-center text-slate-600 rounded-full hover:bg-slate-200 transition-colors btn-qty-plus" data-id="${item.id}">
                <span class="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
            <div class="text-right">
              <div class="font-bold text-lg text-primary">${formatCurrency(item.price * item.quantity, AppStore.settings.currency || '₹')}</div>
              ${item.quantity > 1 ? `<div class="text-xs font-medium text-slate-400">${formatCurrency(item.price, AppStore.settings.currency || '₹')} each</div>` : ''}
            </div>
          </div>
        </div>
      </div>
    `).join('');

    const summaryItems = items.map(i => `
      <div class="flex items-center justify-between text-sm py-2">
        <span class="text-slate-600 font-medium truncate pr-4">${i.quantity}x ${i.name}</span>
        <span class="font-bold text-slate-900 flex-shrink-0">${formatCurrency(i.price * i.quantity, AppStore.settings.currency || '₹')}</span>
      </div>
    `).join('');

    html = `
      <div class="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
        <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Your Cart</h1>
        <span class="text-sm font-bold text-slate-500 bg-slate-100 px-4 py-1.5 rounded-full">${count} Items</span>
      </div>

      <div class="flex flex-col lg:flex-row gap-8 lg:gap-12">
        
        <!-- Left: Items -->
        <div class="flex-1 flex flex-col gap-4">
          ${itemsHtml}
          
          <div class="mt-6">
            <a href="products.html" class="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-dark transition-colors group">
              <span class="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
              Continue Shopping
            </a>
          </div>
        </div>

        <!-- Right: Summary -->
        <div class="w-full lg:w-[380px] flex-shrink-0">
          <div class="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 md:p-8 sticky top-24">
            <h2 class="text-xl font-bold tracking-tight text-slate-900 mb-6 flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">receipt_long</span> Order Summary
            </h2>
            
            <div class="border-b border-slate-100 pb-4 mb-4 space-y-1">
              ${summaryItems}
            </div>
            
            <div class="flex items-center justify-between text-sm mb-4">
              <span class="text-slate-500 font-medium">Subtotal</span>
              <span class="font-bold text-slate-900">${formatCurrency(total, AppStore.settings.currency || '₹')}</span>
            </div>
            
            <div class="flex items-center justify-between text-sm mb-6">
              <span class="text-slate-500 font-medium">Shipping</span>
              <span class="font-bold text-success">FREE</span>
            </div>
            
            <div class="border-t border-slate-200 pt-6 mb-8 flex justify-between items-end">
              <div>
                <span class="text-xs font-bold text-slate-400 tracking-widest uppercase block mb-1">TOTAL</span>
                <span class="text-[10px] text-slate-400 font-medium">(VAT Included)</span>
              </div>
              <span class="text-3xl font-extrabold text-primary">${formatCurrency(total, AppStore.settings.currency || '₹')}</span>
            </div>
            
            <a href="checkout.html" class="btn-primary w-full py-4 rounded-full font-bold flex items-center justify-center gap-2 shadow-md mb-6 hover:-translate-y-0.5 transition-transform active:translate-y-0">
              Proceed to Checkout <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
            </a>

            <div class="bg-green-50 rounded-xl p-4 border border-green-100 flex items-start gap-3">
              <span class="material-symbols-outlined text-success">shield</span>
              <div>
                <h4 class="text-sm font-bold text-slate-900">Secure Checkout Guaranteed</h4>
                <p class="text-[11px] font-medium text-slate-500 leading-relaxed mt-1">We utilize industry leading encryption to ensure your data is secure.</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    `;
  }

  c.innerHTML = html;
  attachCartListeners();
}

function attachCartListeners() {
  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      removeItem(id);
      showToast('Item removed from cart');
    });
  });

  document.querySelectorAll('.btn-qty-minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const item = AppStore.cart.find(i => i.id === id);
      if (item) updateQuantity(id, item.quantity - 1);
    });
  });

  document.querySelectorAll('.btn-qty-plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const item = AppStore.cart.find(i => i.id === id);
      if (!item) return;
      // Get the product's actual stock count from AppStore
      const product = AppStore.products.find(p => p.id === id);
      const maxQty = (product && product.stockCount > 0) ? product.stockCount : 10;
      if (item.quantity < maxQty) {
        updateQuantity(id, item.quantity + 1);
      }
    });
  });
}
