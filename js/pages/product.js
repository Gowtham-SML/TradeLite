import { AppStore } from '../store.js';
import { fetchCatalog } from '../api.js';
import { loadFromStorage, addItem, getItemCount } from '../cart.js';
import { formatCurrency, updateCartBadge, showToast } from '../ui.js';

let currentProduct = null;
let currentQty = 1;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await fetchCatalog();
    loadFromStorage();

    const { startAutoRefresh } = await import('../api.js');
    startAutoRefresh();
    
    if (AppStore.settings) {
      const s = AppStore.settings;
      if (s.name) {
        document.querySelectorAll('#footer-store-name').forEach(el => el.textContent = s.name);
      }
      if (s.email) {
        document.querySelectorAll('#footer-email').forEach(el => el.textContent = s.email);
      }
      if (s.waNumber) {
        document.querySelectorAll('#footer-wa-num').forEach(el => el.textContent = '+' + s.waNumber);
      }
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const pid = urlParams.get('id');
    if (pid) {
      currentProduct = AppStore.products.find(p => p.id === pid);
    }
    
    if (!currentProduct) {
      window.location.href = 'products.html';
      return;
    }

    renderProduct();
    attachListeners();
    updateCartBadge(getItemCount());

    window.addEventListener('catalogRefreshed', () => {
      // Re-fetch the current product from the refreshed catalog
      const urlParams = new URLSearchParams(window.location.search);
      const pid = urlParams.get('id');
      if (pid) {
        const updated = AppStore.products.find(p => p.id === pid);
        if (updated) {
          currentProduct = updated;
          renderProduct();
          attachListeners();
        }
      }
    });

  } catch(err) {
    console.error('Product page failed to load:', err);
    document.getElementById('main-content').innerHTML = `
      <div class="py-24 text-center">
        <p class="text-red-500 font-bold">Error loading product details.</p>
        <a href="products.html" class="inline-block mt-4 text-primary font-bold">Back to Catalog</a>
      </div>
    `;
  }
});

function renderProduct() {
  const p = currentProduct;
  const storeName = AppStore.settings.name || 'TradeLite';
  document.title = `${p.name} | ${storeName}`;
  
  const container = document.getElementById('main-content');
  
  let tagsHtml = '';
  if (p.tags && p.tags.length > 0) {
    const tag = p.tags[0].toUpperCase();
    let bg = 'bg-slate-900';
    if(tag.includes('SALE') || tag.includes('OFF')) bg = 'bg-error';
    else if(tag.includes('NEW')) bg = 'bg-primary';
    tagsHtml = `<div class="absolute top-4 left-4 ${bg} text-white text-xs font-bold px-3 py-1.5 rounded-lg tracking-wider z-10 shadow-sm">${tag}</div>`;
  }
  
  let stockBadge = '';
  if (!p.inStock || p.stockCount === 0) {
    stockBadge = `<div class="flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded-full border border-red-200"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> OUT OF STOCK</div>`;
  } else if (p.stockCount <= 10) {
    stockBadge = `<div class="flex items-center gap-1.5 bg-orange-50 text-orange-600 text-xs font-bold px-2 py-1 rounded-full border border-orange-200"><span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span> ONLY ${p.stockCount} LEFT</div>`;
  } else {
    stockBadge = `<div class="flex items-center gap-1.5 bg-green-50 text-green-600 text-xs font-bold px-2 py-1 rounded-full border border-green-200"><span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> AVAILABLE NOW</div>`;
  }

  let priceHtml = `<div class="text-3xl md:text-4xl font-extrabold text-slate-900 mb-1">${formatCurrency(p.price, AppStore.settings.currency || '₹')}</div>`;
  if (p.tags && p.tags.some(t => t.includes('SALE'))) {
    priceHtml = `
      <div class="flex items-end gap-3 mb-1">
        <span class="text-3xl md:text-4xl font-extrabold text-slate-900">${formatCurrency(p.price, AppStore.settings.currency || '₹')}</span>
        <span class="text-lg text-slate-400 line-through font-medium mb-1">${formatCurrency(p.price * 1.25, AppStore.settings.currency || '₹')}</span>
      </div>
      <div class="inline-block bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-md mb-2">SAVE 20%</div>
    `;
  }

  let images = p.images || [];
  if (images.length === 0 && p.imageURL) {
    images = [p.imageURL];
  }
  
  let sliderHtml = '';
  if (images.length === 0) {
    sliderHtml = `<div class="w-full h-full flex items-center justify-center text-slate-400 font-bold">No photo uploaded</div>`;
  } else {
    const slides = images.map((img, i) => `
      <div class="min-w-full h-full flex-shrink-0 relative">
        <img src="${img}" alt="${p.name}" class="w-full h-full object-cover">
      </div>
    `).join('');
    
    // Buttons and Dots
    let dotsHtml = '';
    if (images.length > 1) {
      const dots = images.map((_, i) => `<div class="h-2 rounded-full cursor-pointer transition-all duration-300 ${i===0 ? 'w-4 bg-primary' : 'w-2 bg-slate-300'} slider-dot" data-index="${i}"></div>`).join('');
      dotsHtml = `<div class="absolute bottom-4 left-6 flex gap-1.5 z-[15]" id="slider-dots">${dots}</div>`;
    }

    sliderHtml = `
      <div id="slider-track" class="w-full h-full flex transition-transform duration-300">
        ${slides}
      </div>
      ${dotsHtml}
      ${images.length > 1 ? `
        <button id="btn-slider-prev" class="absolute top-1/2 left-4 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white backdrop-blur transition-all z-[15]">
          <span class="material-symbols-outlined">chevron_left</span>
        </button>
        <button id="btn-slider-next" class="absolute top-1/2 right-4 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white backdrop-blur transition-all z-[15]">
          <span class="material-symbols-outlined">chevron_right</span>
        </button>
      ` : ''}
      <button id="btn-zoom" class="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-slate-600 hover:text-primary transition-colors z-[15]">
        <span class="material-symbols-outlined text-[20px]">zoom_in</span>
      </button>
      
      <!-- Zoom Modal -->
      <div id="zoom-modal" class="fixed inset-0 z-[200] bg-black/95 hidden flex-col items-center justify-center p-4">
        <button id="btn-close-zoom" class="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-[210]">
          <span class="material-symbols-outlined">close</span>
        </button>
        ${images.length > 1 ? `
          <button id="btn-zoom-prev" class="absolute top-1/2 left-4 md:left-8 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur transition-all z-[210]">
            <span class="material-symbols-outlined text-[32px]">chevron_left</span>
          </button>
          <button id="btn-zoom-next" class="absolute top-1/2 right-4 md:right-8 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur transition-all z-[210]">
            <span class="material-symbols-outlined text-[32px]">chevron_right</span>
          </button>
        ` : ''}
        <img id="zoom-img" src="${images[0]}" class="w-full h-full max-w-5xl object-contain drop-shadow-2xl rounded-sm relative z-[205]">
      </div>
    `;
  }

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
      <!-- Left: Image Box -->
      <div class="relative w-full aspect-[4/5] bg-slate-100 rounded-[28px] overflow-hidden shadow-sm border border-slate-200 group" id="slider-container">
        ${tagsHtml}
        <button class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-slate-400 hover:text-error transition-colors z-[20]">
          <span class="material-symbols-outlined text-[20px]">favorite</span>
        </button>
        ${sliderHtml}
      </div>

      <!-- Right: Details -->
      <div class="flex flex-col">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">HOME › CATEGORIES › ${p.category} › ${p.name}</div>
        
        <h1 class="text-3xl md:text-[40px] font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-2">${p.name}</h1>
        ${p.inStock && p.stockCount <= 10 ? `<p style="color:#dc2626;font-size:13px;font-weight:700;margin-bottom:12px;">Only ${p.stockCount} left in stock — order soon</p>` : ''}
        
        <div class="bg-white rounded-[20px] border border-slate-200 p-6 shadow-sm mb-8 relative overflow-hidden mt-6">
          <div class="absolute top-6 right-6">${stockBadge}</div>
          ${priceHtml}
          <p class="text-sm font-medium text-slate-500 flex items-center gap-1 mt-3">
            <span class="material-symbols-outlined text-[16px]">local_shipping</span> Free express delivery today
          </p>
        </div>

          <div class="flex flex-col gap-4 mb-4">
            <div class="flex gap-4 h-14">
              <div class="flex items-center justify-between bg-white border border-slate-200 rounded-full px-2 w-[140px] shadow-sm">
                <button id="qty-minus" class="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 rounded-full transition-colors"><span class="material-symbols-outlined">remove</span></button>
                <span id="qty-val" class="font-bold text-slate-900 w-8 text-center text-lg">1</span>
                <button id="qty-plus" class="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 rounded-full transition-colors"><span class="material-symbols-outlined">add</span></button>
              </div>
              ${p.inStock 
                ? `<button id="btn-add-cart" class="flex-1 bg-slate-900 hover:bg-black text-white rounded-full font-bold text-lg flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]">
                    <span class="material-symbols-outlined">local_mall</span> Add to Shopping Bag
                   </button>`
                : `<button disabled class="flex-1 bg-slate-200 text-slate-400 rounded-full font-bold text-lg flex items-center justify-center gap-2 cursor-not-allowed">
                    <span class="material-symbols-outlined">sentiment_dissatisfied</span> Currently Unavailable
                   </button>`
              }
            </div>
            
            ${p.inStock ? `
            <button id="btn-whatsapp" class="w-full h-14 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full font-bold text-lg flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/WhatsApp_icon.png" class="w-5 h-5 filter brightness-0 invert" alt="WA"> Order via WhatsApp
            </button>` : ''}
          </div>
          <p id="msg-added-cart" class="text-sm font-bold text-success hidden text-center -mt-2 mb-4">Added to shopping bag</p>

        <!-- Product Description -->
        <div class="mt-8 pt-8 border-t border-slate-100">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Product Description</h3>
          <p class="text-slate-600 leading-relaxed font-medium text-[15px]">${p.description || 'No description available.'}</p>
          ${p.tags && p.tags.length > 0 ? `
            <div class="flex flex-wrap gap-2 mt-4">
              ${p.tags.map(tag => `
                <span class="text-xs font-semibold px-3 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20 tracking-wide">
                  ${tag}
                </span>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function attachListeners() {
  const qMinus = document.getElementById('qty-minus');
  const qPlus = document.getElementById('qty-plus');
  const qVal = document.getElementById('qty-val');
  const btnAdd = document.getElementById('btn-add-cart');
  const btnWa = document.getElementById('btn-whatsapp');
  const msgCart = document.getElementById('msg-added-cart');

  if (qMinus && qPlus && qVal) {
    qMinus.addEventListener('click', () => {
      if (currentQty > 1) {
        currentQty--;
        qVal.textContent = currentQty;
      }
    });
    qPlus.addEventListener('click', () => {
      const maxQty = currentProduct.stockCount > 0 ? currentProduct.stockCount : 1;
      if (currentQty < maxQty) {
        currentQty++;
        qVal.textContent = currentQty;
      } else {
        // Show gentle message that max stock reached
        const msgEl = document.getElementById('msg-added-cart');
        if (msgEl) {
          const oldText = msgEl.textContent;
          msgEl.textContent = `Only ${maxQty} unit${maxQty === 1 ? '' : 's'} available`;
          msgEl.style.color = '#dc2626';
          msgEl.classList.remove('hidden');
          setTimeout(() => {
            msgEl.classList.add('hidden');
            msgEl.style.color = '';
            msgEl.textContent = oldText;
          }, 2000);
        }
      }
    });
  }

  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      addItem(currentProduct, currentQty);
      updateCartBadge(getItemCount());
      if (msgCart) {
        msgCart.classList.remove('hidden');
        setTimeout(() => msgCart.classList.add('hidden'), 3000);
      }
    });
  }

  if (btnWa) {
    btnWa.addEventListener('click', () => {
      addItem(currentProduct, currentQty);
      setTimeout(() => {
        window.location.href = 'checkout.html';
      }, 500);
    });
  }

  // Slider Logic
  const track = document.getElementById('slider-track');
  const dots = document.querySelectorAll('.slider-dot');
  if (track && dots.length > 0) {
    let currentIndex = 0;
    const updateSlider = () => {
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      dots.forEach((dot, idx) => {
        if (idx === currentIndex) {
          dot.classList.add('w-4', 'bg-primary');
          dot.classList.remove('w-2', 'bg-slate-300');
        } else {
          dot.classList.remove('w-4', 'bg-primary');
          dot.classList.add('w-2', 'bg-slate-300');
        }
      });
      // Update zoom image
      let images = currentProduct.images || [];
      if (images.length === 0 && currentProduct.imageURL) images = [currentProduct.imageURL];
      const zoomImg = document.getElementById('zoom-img');
      if (zoomImg && images[currentIndex]) {
        zoomImg.src = images[currentIndex];
      }
    };

    dots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        currentIndex = parseInt(e.target.dataset.index);
        updateSlider();
      });
    });

    // Swipe logic
    let startX = 0;
    let endX = 0;
    track.addEventListener('touchstart', e => {
      startX = e.changedTouches[0].screenX;
    }, { passive: true });
    track.addEventListener('touchend', e => {
      endX = e.changedTouches[0].screenX;
      if (startX - endX > 50) {
        // Swipe left -> next
        currentIndex = (currentIndex + 1) % dots.length;
        updateSlider();
      } else if (endX - startX > 50) {
        // Swipe right -> prev
        currentIndex = (currentIndex - 1 + dots.length) % dots.length;
        updateSlider();
      }
    }, { passive: true });

    const btnPrev = document.getElementById('btn-slider-prev');
    const btnNext = document.getElementById('btn-slider-next');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + dots.length) % dots.length;
        updateSlider();
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % dots.length;
        updateSlider();
      });
    }

    const btnZoomPrev = document.getElementById('btn-zoom-prev');
    const btnZoomNext = document.getElementById('btn-zoom-next');
    if (btnZoomPrev) {
      btnZoomPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex - 1 + dots.length) % dots.length;
        updateSlider();
      });
    }
    if (btnZoomNext) {
      btnZoomNext.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex + 1) % dots.length;
        updateSlider();
      });
    }
  }

  // Zoom logic
  const btnZoom = document.getElementById('btn-zoom');
  const modalZoom = document.getElementById('zoom-modal');
  const btnCloseZoom = document.getElementById('btn-close-zoom');

  if (btnZoom && modalZoom && btnCloseZoom) {
    btnZoom.addEventListener('click', () => {
      modalZoom.classList.remove('hidden');
      modalZoom.classList.add('flex');
    });
    btnCloseZoom.addEventListener('click', () => {
      modalZoom.classList.add('hidden');
      modalZoom.classList.remove('flex');
    });
    modalZoom.addEventListener('click', (e) => {
      if (e.target === modalZoom) {
        modalZoom.classList.add('hidden');
        modalZoom.classList.remove('flex');
      }
    });
  }
}
