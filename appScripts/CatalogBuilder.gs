function getCatalogData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const settings = readSettings(ss);
  const categories = readCategories(ss);
  const products = readProducts(ss);
  return {
    store: {
      name:     settings['STORE_NAME']      || 'TradeLite',
      currency: settings['CURRENCY_SYMBOL'] || '₹',
      waNumber: settings['WA_NUMBER']       || '',
      email:    settings['STORE_EMAIL']     || ''
    },
    categories: categories,
    products:   products
  };
}

function readSettings(ss) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return {};
  const rows = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < rows.length; i++) {
    const key   = rows[i][0] ? rows[i][0].toString().trim() : '';
    const value = rows[i][1] !== undefined ? rows[i][1].toString().trim() : '';
    if (key) settings[key] = value;
  }
  return settings;
}

function readCategories(ss) {
  const sheet = ss.getSheetByName('Categories');
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  const categories = [];
  for (let i = 1; i < rows.length; i++) {
    const name      = rows[i][0] ? rows[i][0].toString().trim() : '';
    const subRaw    = rows[i][1] ? rows[i][1].toString().trim() : '';
    const sortOrder = rows[i][2] ? parseInt(rows[i][2]) : i;
    const active    = rows[i][3] ? rows[i][3].toString().trim() : 'TRUE';
    if (!name) continue;
    if (active === 'FALSE') continue;
    const subCategories = subRaw
      ? subRaw.split(',').map(s => s.trim()).filter(s => s !== '')
      : [];
    categories.push({ name, subCategories, sortOrder });
  }
  categories.sort((a, b) => a.sortOrder - b.sortOrder);
  return categories;
}

function readProducts(ss) {
  const sheet = ss.getSheetByName('Products');
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  const products = [];
  for (let i = 1; i < rows.length; i++) {
    const productId   = rows[i][0]  ? rows[i][0].toString().trim()  : '';
    const name        = rows[i][1]  ? rows[i][1].toString().trim()  : '';
    const price       = rows[i][2]  ? parseFloat(rows[i][2])        : 0;
    const category    = rows[i][3]  ? rows[i][3].toString().trim()  : '';
    const subCategory = rows[i][4]  ? rows[i][4].toString().trim()  : '';
    const description = rows[i][5]  ? rows[i][5].toString().trim()  : '';
    const tagsRaw     = rows[i][6]  ? rows[i][6].toString().trim()  : '';
    const img1        = rows[i][7]  ? rows[i][7].toString().trim()  : '';
    const img2        = rows[i][8]  ? rows[i][8].toString().trim()  : '';
    const img3        = rows[i][9]  ? rows[i][9].toString().trim()  : '';
    const img4        = rows[i][10] ? rows[i][10].toString().trim() : '';
    const img5        = rows[i][11] ? rows[i][11].toString().trim() : '';
    const inStockRaw  = rows[i][12];
    const featuredRaw = rows[i][13];
    const sortOrder   = rows[i][14] ? parseInt(rows[i][14]) : i;

    if (!productId || !name) continue;

    const tags = tagsRaw
      ? tagsRaw.split(',').map(t => t.trim()).filter(t => t !== '')
      : [];

    const imageURLs = [img1, img2, img3, img4, img5]
      .map(url => buildImageURL(url))
      .filter(url => url !== '');

    const inStock  = inStockRaw  === true || inStockRaw  === 'TRUE' || inStockRaw  === 'true';
    const featured = featuredRaw === true || featuredRaw === 'TRUE' || featuredRaw === 'true';

    products.push({
      id:          productId,
      name,
      category,
      subCategory,
      price,
      description,
      tags,
      imageURL:    imageURLs[0] || '',
      images:      imageURLs,
      inStock,
      featured,
      sortOrder
    });
  }

  products.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return 0;
  });

  return products;
}

function getProductsFull() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Products');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const products = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0] && !data[i][1]) continue;
    const row = {};
    headers.forEach((h, j) => row[h] = data[i][j] !== undefined ? data[i][j].toString() : '');
    products.push(row);
  }
  return products;
}

function buildImageURL(input) {
  if (!input) return '';
  if (input.startsWith('http') && !input.includes('drive.google.com')) return input;
  let fileId = '';
  if (input.includes('drive.google.com/file/d/')) {
    const match = input.match(/\/file\/d\/([^\/\?]+)/);
    if (match) fileId = match[1];
  } else if (input.includes('drive.google.com/open?id=')) {
    const match = input.match(/[?&]id=([^&]+)/);
    if (match) fileId = match[1];
  } else if (input.includes('drive.google.com/uc?export=') || input.includes('drive.google.com/uc?id=')) {
    const match = input.match(/[?&]id=([^&]+)/);
    if (match) fileId = match[1];
  } else if (!input.includes('http')) {
    fileId = input.trim();
  }
  if (fileId) return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w800';
  return input;
}