import { fetchCatalog } from '../api.js';
import { loadFromStorage, getItemCount } from '../cart.js';
import { applyFilters, sortProducts, getPriceRange, paginateProducts, searchProducts } from '../filters.js';
import { formatCurrency, updateCartBadge, renderSkeletonCards } from '../ui.js';
import { AppStore } from '../store.js';

let state = {
  category: '',
  subCategory: '',
  searchQuery: '',
  priceRange: null, // {min, max}
  sortBy: 'featured',
  page: 1,
  perPage: 12,
  priceBuckets: []
};

document.addEventListener('DOMContentLoaded', async () => {
  renderSkeletonCards('product-grid', 6);
  
  try {
    const productsGrid = document.getElementById('products-grid') || document.querySelector('[id*="grid"]') || document.querySelector('main');
    if (productsGrid) {
      productsGrid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:48px 20px;">
          <div style="display:inline-block; width:32px; height:32px; border:3px solid #e2e8f0; border-top-color:#D1855C; border-radius:50%; animation:spin 0.8s linear infinite;"></div>
          <p style="color:#94a3b8; font-size:14px; margin-top:12px; font-weight:500;">Loading products...</p>
        </div>
      `;
    }

    await fetchCatalog();
    loadFromStorage();
    
    const { startAutoRefresh } = await import('../api.js');
    startAutoRefresh();

    if (AppStore.settings) {
      const s = AppStore.settings;
      if (s.name) {
        document.title = s.name + ' | Shop';
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
    const searchParam = urlParams.get('search');
    const catParam = urlParams.get('category');
    
    if (searchParam) {
      state.searchQuery = searchParam;
      const searchInput = document.getElementById('nav-search') || document.querySelector('input[placeholder*="earch"]');
      if (searchInput) searchInput.value = searchParam;
    }
    
    if (catParam) state.category = catParam;

    initPriceBuckets();
    renderSidebar();
    updateView();
    updateCartBadge(getItemCount());

    window.addEventListener('catalogRefreshed', () => {
      updateView();
    });

  } catch(err) {
    console.error('Products page failed to load:', err);
    const grid = document.getElementById('product-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="col-span-full py-12 text-center text-red-500 font-bold">
          <p>Failed to load catalog. Please try again.</p>
          <button onclick="location.reload()" class="mt-4 bg-primary text-white px-6 py-2 rounded-full">Retry</button>
        </div>
      `;
    }
  }

  document.getElementById('sort-select').addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    state.page = 1;
    updateView();
  });

  const searchInput = document.getElementById('nav-search') || document.querySelector('input[placeholder*="earch"]');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      state.page = 1;
      updateView();
    });
  }

  document.getElementById('btn-reset-filters').addEventListener('click', () => {
    state.category = '';
    state.subCategory = '';
    state.searchQuery = '';
    state.priceRange = null;
    state.page = 1;
    if (searchInput) searchInput.value = '';
    renderSidebar();
    updateView();
  });
});

function initPriceBuckets() {
  const range = getPriceRange(AppStore.products);
  if (range.max === 0) return;
  const step = Math.ceil((range.max - range.min) / 4);
  state.priceBuckets = [
    { label: 'All Prices', min: 0, max: Infinity },
    { label: `Under ${formatCurrency(range.min + step, AppStore.settings.currency || '₹')}`, min: 0, max: range.min + step },
    { label: `${formatCurrency(range.min + step, AppStore.settings.currency || '₹')} - ${formatCurrency(range.min + step * 2, AppStore.settings.currency || '₹')}`, min: range.min + step, max: range.min + step * 2 },
    { label: `${formatCurrency(range.min + step * 2, AppStore.settings.currency || '₹')} - ${formatCurrency(range.min + step * 3, AppStore.settings.currency || '₹')}`, min: range.min + step * 2, max: range.min + step * 3 },
    { label: `Over ${formatCurrency(range.min + step * 3, AppStore.settings.currency || '₹')}`, min: range.min + step * 3, max: Infinity }
  ];
}

function renderSidebar() {
  const cHtml = AppStore.categories.map(c => `
    <button class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left ${state.category === c.name ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-600 hover:bg-slate-50 font-medium'}" data-cat="${c.name}">
      ${c.name}
      <span class="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">${AppStore.products.filter(p=>p.category===c.name).length}</span>
    </button>
  `).join('');
  
  const cAll = `<button class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left ${state.category === '' ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-600 hover:bg-slate-50 font-medium'}" data-cat="">All Categories</button>`;
  
  let subCatHtml = '';
  if (state.category) {
    const activeCat = AppStore.categories.find(c => c.name === state.category);
    if (activeCat && activeCat.subCategories && activeCat.subCategories.length > 0) {
      subCatHtml = `
        <div class="mt-3 ml-3 flex flex-col gap-1" id="subcategory-list">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1">Subcategory</p>
          <button class="w-full flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors text-left ${state.subCategory === '' ? 'text-primary font-semibold' : 'text-slate-500 hover:bg-slate-50 font-medium'}" data-subcat="">
            All ${state.category}
          </button>
          ${activeCat.subCategories.map(sub => `
            <button class="w-full flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors text-left ${state.subCategory === sub ? 'text-primary font-semibold bg-primary/5' : 'text-slate-500 hover:bg-slate-50 font-medium'}" data-subcat="${sub}">
              <span class="w-1 h-1 rounded-full bg-slate-300 mr-2 flex-shrink-0"></span>${sub}
            </button>
          `).join('')}
        </div>
      `;
    }
  }
  
  document.getElementById('sidebar-categories').innerHTML = cAll + cHtml + subCatHtml;
  document.getElementById('mobile-categories').innerHTML = cAll + cHtml + subCatHtml;

  const pHtml = state.priceBuckets.map((b, i) => `
    <label class="flex items-center gap-3 cursor-pointer group">
      <div class="relative flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors ${state.priceRange === i ? 'border-primary' : 'border-slate-300 group-hover:border-primary'}">
        ${state.priceRange === i ? '<div class="w-2.5 h-2.5 bg-primary rounded-full"></div>' : ''}
      </div>
      <span class="text-sm font-medium ${state.priceRange === i ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}">${b.label}</span>
      <input type="radio" name="price" value="${i}" class="hidden">
    </label>
  `).join('');

  document.getElementById('sidebar-price').innerHTML = pHtml;
  document.getElementById('mobile-price').innerHTML = pHtml;

  document.querySelectorAll('#sidebar-categories button[data-cat], #mobile-categories button[data-cat]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      state.category = e.currentTarget.dataset.cat;
      state.subCategory = '';
      state.page = 1;
      renderSidebar();
      updateView();
    });
  });

  document.querySelectorAll('[data-subcat]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.subCategory = e.currentTarget.dataset.subcat;
      state.page = 1;
      renderSidebar();
      updateView();
    });
  });

  document.querySelectorAll('#sidebar-price label, #mobile-price label').forEach(lbl => {
    lbl.addEventListener('click', (e) => {
      e.preventDefault();
      const input = lbl.querySelector('input');
      state.priceRange = parseInt(input.value, 10);
      state.page = 1;
      renderSidebar();
      updateView();
    });
  });
}

function updateView() {
  let filtered = AppStore.products;
  
  if (state.searchQuery) {
    filtered = searchProducts(filtered, state.searchQuery);
  }

  if (state.category) {
    filtered = filtered.filter(p => p.category === state.category);
  }
  
  if (state.subCategory) {
    filtered = filtered.filter(p => p.subCategory === state.subCategory);
  }

  if (state.subCategory) {
    document.getElementById('page-title').textContent = state.subCategory;
  } else if (state.category) {
    document.getElementById('page-title').textContent = state.category;
  } else {
    document.getElementById('page-title').textContent = "All Products";
  }

  if (state.priceRange !== null && state.priceBuckets[state.priceRange]) {
    const bucket = state.priceBuckets[state.priceRange];
    filtered = filtered.filter(p => p.price >= bucket.min && p.price < bucket.max);
  }

  filtered = sortProducts(filtered, state.sortBy);
  
  document.getElementById('item-count').textContent = `${filtered.length} items found`;
  
  const totalPages = Math.ceil(filtered.length / state.perPage);
  if (state.page > totalPages) state.page = Math.max(1, totalPages);

  const paginated = paginateProducts(filtered, state.page, state.perPage);
  renderGrid(paginated);
  renderPagination(totalPages);
}

function renderGrid(products) {
  const container = document.getElementById('product-grid');
  if (!products.length) {
    container.innerHTML = `<div class="col-span-full py-12 text-center text-slate-500 font-medium">No products match your filters.</div>`;
    return;
  }

  container.innerHTML = products.map(p => {
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
      <a href="product.html?id=${p.id}" class="product-card-container block bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group relative">
        <div class="relative w-full aspect-square bg-slate-100 overflow-hidden">
          ${badgeHtml}
          ${outOfStockOverlay}
          <button class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-slate-400 hover:text-error transition-colors z-[12]">
            <span class="material-symbols-outlined text-[18px]">favorite</span>
          </button>
          <img src="${p.imageURL}" alt="${p.name}" class="product-image w-full h-full object-cover">
        </div>
        <div class="p-4 md:p-5">
          <span class="text-[10px] font-bold text-primary uppercase tracking-wider block mb-1.5">${p.category} ${p.subCategory ? '· ' + p.subCategory : ''}</span>
          <h3 class="font-bold text-slate-900 text-sm md:text-base leading-tight mb-2 truncate ${!p.inStock ? 'opacity-50' : ''}">${p.name}</h3>
          
          <div class="flex items-center gap-2 mt-3">
            <span class="font-bold ${!p.inStock ? 'text-slate-400' : 'text-primary'} text-lg">${formatCurrency(p.price, AppStore.settings.currency || '₹')}</span>
            ${p.tags && p.tags.some(t => t.includes('SALE')) ? `<span class="text-sm font-medium text-slate-400 line-through">${formatCurrency(p.price * 1.25, AppStore.settings.currency || '₹')}</span>` : ''}
          </div>
        </div>
      </a>
    `;
  }).join('');
}

function renderPagination(totalPages) {
  const container = document.getElementById('pagination-controls');
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  let html = `
    <button class="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50" ${state.page === 1 ? 'disabled' : ''} onclick="changePage(${state.page - 1})">
      <span class="material-symbols-outlined">chevron_left</span>
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${state.page === i ? 'bg-primary text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}" onclick="changePage(${i})">
        ${i}
      </button>
    `;
  }

  html += `
    <button class="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50" ${state.page === totalPages ? 'disabled' : ''} onclick="changePage(${state.page + 1})">
      <span class="material-symbols-outlined">chevron_right</span>
    </button>
  `;
  container.innerHTML = html;
}

window.changePage = (pg) => {
  state.page = pg;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateView();
}
