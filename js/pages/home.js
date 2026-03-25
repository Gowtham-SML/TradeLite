import { AppStore } from '../store.js';
import { fetchCatalog } from '../api.js';
import { loadFromStorage, getItemCount } from '../cart.js';
import { formatCurrency, updateCartBadge, renderSkeletonCards } from '../ui.js';
import { searchProducts } from '../filters.js';

document.addEventListener('DOMContentLoaded', async () => {
  renderSkeletonCards('categories-container', 4);
  renderSkeletonCards('trending-products-grid', 4);

  try {
    // Show loading state while fetching live data
    const trendingGrid = document.getElementById('trending-products-grid');
    const categoriesContainer = document.getElementById('categories-container');
    if (trendingGrid) {
      trendingGrid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:48px 20px;">
          <div style="display:inline-block; width:32px; height:32px; border:3px solid #e2e8f0; border-top-color:#D1855C; border-radius:50%; animation:spin 0.8s linear infinite;"></div>
          <p style="color:#94a3b8; font-size:14px; margin-top:12px; font-weight:500;">Loading products...</p>
        </div>
      `;
    }
    if (categoriesContainer) {
      categoriesContainer.innerHTML = `
        <div style="text-align:center; padding:20px;">
          <div style="display:inline-block; width:24px; height:24px; border:3px solid #e2e8f0; border-top-color:#D1855C; border-radius:50%; animation:spin 0.8s linear infinite;"></div>
        </div>
      `;
    }

    await fetchCatalog();
    loadFromStorage();
    
    // Start background auto-refresh so new products and images appear without reload
    const { startAutoRefresh } = await import('../api.js');
    startAutoRefresh();

    if (AppStore.settings) {
      const s = AppStore.settings;
      if (s.name) {
        document.title = s.name + ' | Home';
        document.querySelectorAll('#footer-store-name').forEach(el => el.textContent = s.name);
        if (document.getElementById('hero-store-name')) {
          document.getElementById('hero-store-name').textContent = s.name;
        }
      }
      if (s.email) {
        document.querySelectorAll('#footer-email').forEach(el => el.textContent = s.email);
      }
      if (s.waNumber) {
        document.querySelectorAll('#footer-wa-num').forEach(el => el.textContent = '+' + s.waNumber);
      }
    }

    renderCategories();
    renderTrending();
    updateCartBadge(getItemCount());

    // Listen for background catalog refreshes and re-render the page
    window.addEventListener('catalogRefreshed', () => {
      renderCategories();
      renderTrending();
    });

  } catch(err) {
    console.error('Home page failed to load:', err);
    const grid = document.getElementById('trending-products-grid');
    if (grid) {
      grid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:48px 20px;">
          <p style="color:#ef4444; font-weight:600; margin-bottom:8px;">Could not load products</p>
          <p style="color:#64748b; font-size:14px;">Please check your connection and refresh the page.</p>
          <button onclick="location.reload()" style="margin-top:16px; background:#D1855C; color:#fff; border:none; border-radius:24px; padding:10px 24px; font-weight:600; cursor:pointer;">Retry</button>
        </div>
      `;
    }
    const cats = document.getElementById('categories-container');
    if (cats) cats.innerHTML = '';
  }

  const searchInput = document.getElementById('nav-search') || document.querySelector('input[type="search"]') || document.querySelector('input[placeholder*="earch"]');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (!query) {
        renderTrending();
        return;
      }
      const results = searchProducts(AppStore.products, query);
      renderSearchResults(results, query);
    });
  }
});

const icons = ['apparel', 'checkroom', 'man', 'child_care', 'diamond', 'woman', 'local_mall'];

function renderCategories() {
  const container = document.getElementById('categories-container');
  if(!container) return;
  
  container.innerHTML = AppStore.categories.slice(0, 6).map((cat, idx) => `
    <a href="products.html?category=${encodeURIComponent(cat.name)}" class="snap-start flex flex-col items-center gap-3 min-w-[100px] group">
      <div class="w-20 h-20 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-hover:border-primary/30 group-hover:text-primary transition-all group-hover:shadow-md">
        <span class="material-symbols-outlined text-[32px]">${icons[idx % icons.length]}</span>
      </div>
      <span class="text-xs font-semibold text-slate-700">${cat.name}</span>
    </a>
  `).join('');
}

function renderTrending() {
  const container = document.getElementById('trending-products-grid');
  if(!container) return;
  
  const trending = AppStore.products.filter(p => p.featured);
  
  container.innerHTML = trending.map(p => {
    
    let badgeHtml = '';
    if (p.tags && p.tags.length > 0) {
      const tag = p.tags[0].toUpperCase();
      let bg = 'bg-slate-900';
      if(tag.includes('SALE') || tag.includes('OFF')) bg = 'bg-error';
      else if(tag.includes('NEW')) bg = 'bg-primary';
      badgeHtml = `<div class="absolute top-3 left-3 ${bg} text-white text-[10px] font-bold px-2 py-1 rounded-md tracking-wider z-10">${tag}</div>`;
    }

    let outOfStockOverlay = '';
    if (!p.inStock || p.stockCount === 0) {
      outOfStockOverlay = `<div class="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-[2px] z-10"><span class="bg-white/90 text-slate-900 text-xs font-bold px-4 py-2 rounded-lg tracking-widest shadow-lg">CURRENTLY UNAVAILABLE</span></div>`;
    } else if (p.stockCount <= 10) {
      outOfStockOverlay = `<div class="absolute bottom-0 left-0 right-0 z-10 px-3 py-2 bg-red-500/90"><p style="color:white;font-size:11px;font-weight:700;text-align:center;margin:0;">Only ${p.stockCount} left</p></div>`;
    }

    return `
      <a href="product.html?id=${p.id}" class="product-card-container block bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group">
        <div class="relative w-full aspect-square bg-slate-100 overflow-hidden">
          ${badgeHtml}
          ${outOfStockOverlay}
          <button class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-slate-400 hover:text-error transition-colors z-10 z-[12]">
            <span class="material-symbols-outlined text-[18px]">favorite</span>
          </button>
          <img src="${p.imageURL}" alt="${p.name}" class="product-image w-full h-full object-cover">
        </div>
        <div class="p-4 md:p-5">
          <span class="text-[10px] font-bold text-primary uppercase tracking-wider block mb-1.5">${p.category}</span>
          <h3 class="font-bold text-slate-900 text-sm md:text-base leading-tight mb-2 truncate ${!p.inStock ? 'opacity-50' : ''}">${p.name}</h3>
          
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-900 text-base">${formatCurrency(p.price, AppStore.settings.currency || '₹')}</span>
          </div>
        </div>
      </a>
    `;
  }).join('');
}

function renderSearchResults(products, query) {
  const container = document.getElementById('trending-products-grid');
  if (!container) return;
  
  const sectionTitle = document.getElementById('trending-title');
  if (sectionTitle) {
    sectionTitle.textContent = products.length > 0 
      ? `${products.length} result${products.length !== 1 ? 's' : ''} for "${query}"`
      : `No results for "${query}"`;
  }
  
  if (!products.length) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center">
        <p class="text-slate-500 font-medium mb-4">No products found for "<strong>${query}</strong>"</p>
        <a href="products.html" class="text-primary font-bold hover:underline">Browse all products</a>
      </div>
    `;
    return;
  }
  
  const display = products.slice(0, 8);
  container.innerHTML = display.map(p => {
    let badgeHtml = '';
    if (p.tags && p.tags.length > 0) {
      const tag = p.tags[0].toUpperCase();
      let bg = 'bg-slate-900';
      if (tag.includes('SALE') || tag.includes('OFF')) bg = 'bg-error';
      else if (tag.includes('NEW')) bg = 'bg-primary';
      badgeHtml = `<div class="absolute top-3 left-3 ${bg} text-white text-[10px] font-bold px-2 py-1 rounded-md tracking-wider z-10">${tag}</div>`;
    }

    let outOfStockOverlay = '';
    if (!p.inStock || p.stockCount === 0) {
      outOfStockOverlay = `<div class="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-[2px] z-10"><span class="bg-white/90 text-slate-900 text-xs font-bold px-4 py-2 rounded-lg tracking-widest shadow-lg">CURRENTLY UNAVAILABLE</span></div>`;
    } else if (p.stockCount <= 10) {
      outOfStockOverlay = `<div class="absolute bottom-0 left-0 right-0 z-10 px-3 py-2 bg-red-500/90"><p style="color:white;font-size:11px;font-weight:700;text-align:center;margin:0;">Only ${p.stockCount} left</p></div>`;
    }

    return `
      <a href="product.html?id=${p.id}" class="product-card-container block bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group">
        <div class="relative w-full aspect-square bg-slate-100 overflow-hidden">
          ${badgeHtml}
          ${outOfStockOverlay}
          <img src="${p.imageURL}" alt="${p.name}" class="product-image w-full h-full object-cover">
        </div>
        <div class="p-4 md:p-5">
          <span class="text-[10px] font-bold text-primary uppercase tracking-wider block mb-1.5">${p.category} · ${p.subCategory}</span>
          <h3 class="font-bold text-slate-900 text-sm md:text-base leading-tight mb-3 truncate ${!p.inStock ? 'opacity-50' : ''}">${p.name}</h3>
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-900 text-base">${formatCurrency(p.price, AppStore.settings.currency || '₹')}</span>
          </div>
        </div>
      </a>
    `;
  }).join('');
  
  if (products.length > 8) {
    container.innerHTML += `
      <div class="col-span-full text-center pt-4">
        <a href="products.html?search=${encodeURIComponent(query)}" class="text-primary font-bold hover:underline text-sm">
          View all ${products.length} results →
        </a>
      </div>
    `;
  }
}

