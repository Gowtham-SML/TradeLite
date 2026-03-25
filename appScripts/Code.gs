const SHEET_ID = '1aYjhnZPkIJRyV6RbgVWLEtVuF6jJ1iosMnXClwFylB0';

function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'getCatalog') {
      return createJsonResponse(getCatalogData());
    } else if (action === 'getProductsFull') {
      return createJsonResponse(getProductsFull());
    } else if (action === 'getCategories') {
      return createJsonResponse(getCategories());
    } else if (action === 'getOrdersAdmin') {
      return createJsonResponse(getOrdersAdmin());
    } else {
      return createJsonResponse({ status: 'error', message: 'Unknown action' });
    }
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.message });
  }
}

function doPost(e) {
  try {
    let params;

    // Handle form submission (from hidden form — bypasses CORS)
    if (e.parameter && e.parameter.data) {
      try {
        params = JSON.parse(e.parameter.data);
      } catch(parseErr) {
        return createJsonResponse({ status: 'error', message: 'Invalid form data: ' + parseErr.message });
      }
    }
    // Handle regular JSON body (from fetch with application/json)
    else if (e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch(parseErr) {
        return createJsonResponse({ status: 'error', message: 'Invalid JSON body: ' + parseErr.message });
      }
    }
    else {
      return createJsonResponse({ status: 'error', message: 'No data received' });
    }

    const action = params.action;
    const payload = params.payload;

    if (action === 'sendOtp') {
      return createJsonResponse(sendOtp(params.phone));
    } else if (action === 'verifyOtp') {
      return createJsonResponse(verifyOtp(params.phone, params.otp));
    } else if (action === 'addOrder') {
      const result = addOrder(payload);
      if (result.success === false) {
        return createJsonResponse({ status: 'error', message: result.error });
      }
      return createJsonResponse({ status: 'success', data: result });
    } else if (action === 'addProduct') {
      return createJsonResponse({ status: 'success', data: addProduct(payload) });
    } else if (action === 'updateProduct') {
      return createJsonResponse({ status: 'success', data: updateProduct(payload) });
    } else if (action === 'deleteProduct') {
      return createJsonResponse({ status: 'success', data: deleteProduct(payload) });
    } else if (action === 'addCategory') {
      return createJsonResponse({ status: 'success', data: addCategory(payload) });
    } else if (action === 'updateCategory') {
      return createJsonResponse({ status: 'success', data: updateCategory(payload) });
    } else if (action === 'updateOrderStatus') {
      return createJsonResponse({ status: 'success', data: updateOrderStatus(payload) });
    } else {
      return createJsonResponse({ status: 'error', message: 'Unknown action: ' + action });
    }

  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.message });
  }
}

function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}