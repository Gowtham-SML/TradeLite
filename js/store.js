export const AppStore = {
  products: [],
  categories: [],
  settings: {
    name: '',
    currency: '₹',
    waNumber: '',
    email: ''
  },                   // filled by fetchCatalog()
  filters: {
    category: '',
    subCategory: '',
    searchQuery: '',
    minPrice: 0,
    maxPrice: Infinity,
    inStockOnly: false,
    sortBy: 'featured',
    page: 1
  },
  cart: [],
  currentProduct: null,
  lastOrder: null
};
