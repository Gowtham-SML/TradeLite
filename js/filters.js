export function applyFilters(products, filters) {
  return products.filter(p => {
    if (filters.category && p.category !== filters.category) return false;
    if (filters.subCategory && p.subCategory !== filters.subCategory) return false;
    if (filters.inStockOnly && !p.inStock) return false;
    if (p.price < filters.minPrice || p.price > filters.maxPrice) return false;
    return true;
  });
}

export function sortProducts(products, sortBy) {
  const copy = [...products];
  switch (sortBy) {
    case 'priceLow':
      return copy.sort((a, b) => a.price - b.price);
    case 'priceHigh':
      return copy.sort((a, b) => b.price - a.price);
    case 'newest':
      return copy; 
    case 'featured':
    default:
      return copy.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return 0;
      });
  }
}

export function searchProducts(products, query) {
  if (!query) return products;
  const q = query.toLowerCase();
  return products.filter(p => 
    p.name.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    (p.subCategory && p.subCategory.toLowerCase().includes(q)) ||
    (p.description && p.description.toLowerCase().includes(q)) ||
    (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
  );
}

export function getPriceRange(products) {
  if (!products.length) return { min: 0, max: 0 };
  let min = products[0].price;
  let max = products[0].price;
  products.forEach(p => {
    if (p.price < min) min = p.price;
    if (p.price > max) max = p.price;
  });
  return { min, max };
}

export function paginateProducts(products, page, perPage) {
  const start = (page - 1) * perPage;
  const end = start + perPage;
  return products.slice(start, end);
}
