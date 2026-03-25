function getCategories() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Categories');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    const row = {};
    headers.forEach((h, j) => row[h] = data[i][j] !== undefined ? data[i][j].toString() : '');
    rows.push(row);
  }
  return rows;
}

function getOrdersAdmin() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Orders');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    const row = {};
    headers.forEach((h, j) => row[h] = data[i][j] !== undefined ? data[i][j].toString() : '');
    rows.push(row);
  }
  return rows;
}

function addOrder(payload) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Orders');
    if (!sheet) return { success: false, error: 'Orders sheet not found. Please run createOrdersSheet first.' };

    const orderId = 'ORD-' + Date.now();

    let itemsText = '';
    try {
      const itemsArray = JSON.parse(payload.Items_JSON || '[]');
      itemsText = itemsArray
        .map(i => (i.name || 'Item') + ' x' + (i.qty || 1) + ' @ ₹' + (i.price || 0))
        .join(', ');
    } catch (e) {
      itemsText = payload.Items_JSON || '';
    }

    const cleanPhone = (payload.CustomerPhone || '').toString().replace(/\D/g, '');

    sheet.appendRow([
      orderId,
      new Date().toLocaleDateString('en-IN'),
      payload.CustomerName    || '',
      payload.CustomerEmail   || '',
      cleanPhone,
      payload.CustomerAddress || '',
      itemsText,
      payload.TotalAmount     || 0,
      payload.Notes           || ''
    ]);

    return { success: true, id: orderId, message: 'Order saved successfully' };

  } catch (err) {
    Logger.log('addOrder error: ' + err.message);
    return { success: false, error: 'Failed to save order: ' + err.message };
  }
}

function addProduct(payload) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Products');
  if (!sheet) throw new Error('Products sheet not found');
  const data = sheet.getDataRange().getValues();
  const existing = data.slice(1).find(row => row[0] && row[0].toString() === payload.ProductID);
  if (existing) throw new Error('Product ID already exists: ' + payload.ProductID);
  sheet.appendRow([
    payload.ProductID    || '',
    payload.ProductName  || '',
    payload.Price        || 0,
    payload.Category     || '',
    payload.SubCategory  || '',
    payload.Description  || '',
    payload.Tags         || '',
    payload.ImageURL1    || payload.ImageURL || '',
    payload.ImageURL2    || '',
    payload.ImageURL3    || '',
    payload.ImageURL4    || '',
    payload.ImageURL5    || '',
    payload.InStock      || 'TRUE',
    payload.Featured     || 'FALSE',
    payload.SortOrder    || 1
  ]);
  return { id: payload.ProductID, message: 'Product added successfully' };
}

function updateProduct(payload) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Products');
  if (!sheet) throw new Error('Products sheet not found');
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString() === payload.ProductID) {
      rowIndex = i + 1; break;
    }
  }
  if (rowIndex === -1) throw new Error('Product not found: ' + payload.ProductID);
  sheet.getRange(rowIndex, 1, 1, 15).setValues([[
    payload.ProductID    || '',
    payload.ProductName  || '',
    payload.Price        || 0,
    payload.Category     || '',
    payload.SubCategory  || '',
    payload.Description  || '',
    payload.Tags         || '',
    payload.ImageURL1    || payload.ImageURL || '',
    payload.ImageURL2    || '',
    payload.ImageURL3    || '',
    payload.ImageURL4    || '',
    payload.ImageURL5    || '',
    payload.InStock      || 'TRUE',
    payload.Featured     || 'FALSE',
    payload.SortOrder    || 1
  ]]);
  return { id: payload.ProductID, message: 'Product updated successfully' };
}

function deleteProduct(payload) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Products');
  if (!sheet) throw new Error('Products sheet not found');
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString() === payload.ProductID) {
      rowIndex = i + 1; break;
    }
  }
  if (rowIndex === -1) throw new Error('Product not found: ' + payload.ProductID);
  sheet.deleteRow(rowIndex);
  return { message: 'Product deleted' };
}

function addCategory(payload) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Categories');
  if (!sheet) throw new Error('Categories sheet not found');
  sheet.appendRow([
    payload.CategoryName  || '',
    payload.SubCategories || '',
    payload.SortOrder     || 1,
    payload.Active        || 'TRUE'
  ]);
  return { message: 'Category added' };
}

function updateCategory(payload) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Categories');
  if (!sheet) throw new Error('Categories sheet not found');
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString() === payload.CategoryName) {
      rowIndex = i + 1; break;
    }
  }
  if (rowIndex === -1) {
    sheet.appendRow([payload.CategoryName, payload.SubCategories, payload.SortOrder, payload.Active]);
  } else {
    sheet.getRange(rowIndex, 1, 1, 4).setValues([[
      payload.CategoryName  || '',
      payload.SubCategories || '',
      payload.SortOrder     || 1,
      payload.Active        || 'TRUE'
    ]]);
  }
  return { message: 'Category updated' };
}

function updateOrderStatus(payload) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Orders');
  if (!sheet) throw new Error('Orders sheet not found');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const orderIdCol = headers.indexOf('OrderID');
  const statusCol  = headers.indexOf('Status');
  if (orderIdCol === -1 || statusCol === -1) throw new Error('Column not found');
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][orderIdCol] && data[i][orderIdCol].toString() === payload.OrderID) {
      rowIndex = i + 1; break;
    }
  }
  if (rowIndex === -1) throw new Error('Order not found: ' + payload.OrderID);
  sheet.getRange(rowIndex, statusCol + 1).setValue(payload.Status);
  return { message: 'Status updated to ' + payload.Status };
}