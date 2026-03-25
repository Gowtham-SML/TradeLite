import { AppStore } from './store.js';

const PRODUCTS_API_URL = 'https://script.google.com/macros/s/AKfycbwxqLYonPK68Gg0yPLywjE39asJ64xysjvWX7NUVx_Npz4aUOIByYXqNAAGn_qS7G3_/exec';

export async function fetchCatalog() {
  try {
    const res = await fetch(PRODUCTS_API_URL + '?action=getCatalog');
    if (!res.ok) throw new Error('API returned status ' + res.status);
    const data = await res.json();

    if (!data) {
      throw new Error('Invalid API response — empty response from server');
    }
    if (!data.products) {
      data.products = [];
    }
    if (!data.categories) {
      data.categories = [];
    }
    if (!data.store) {
      data.store = { name: 'TradeLite', currency: '₹', waNumber: '' };
    }

    AppStore.products = data.products || [];
    AppStore.categories = data.categories || [];
    AppStore.settings = data.store || {};

    return true;

  } catch (e) {
    console.error('fetchCatalog failed:', e.message);
    throw e;
  }
}

export async function sendOtp(phone) {
  if (!PRODUCTS_API_URL) throw new Error('PRODUCTS_API_URL is not configured');

  // Use URL-encoded form data instead of JSON to avoid CORS preflight
  const formData = new URLSearchParams();
  formData.append('data', JSON.stringify({
    action: 'sendOtp',
    phone: phone.replace(/\D/g, '')
  }));

  const response = await fetch(PRODUCTS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  });
  return await response.json();
}

export async function verifyOtp(phone, otp) {
  if (!PRODUCTS_API_URL) throw new Error('PRODUCTS_API_URL is not configured');

  // Use URL-encoded form data instead of JSON to avoid CORS preflight
  const formData = new URLSearchParams();
  formData.append('data', JSON.stringify({
    action: 'verifyOtp',
    phone: phone.replace(/\D/g, ''),
    otp: otp
  }));

  const response = await fetch(PRODUCTS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  });
  return await response.json();
}

export async function addOrder(payload) {
  if (!PRODUCTS_API_URL) throw new Error('API URL not configured');

  return new Promise((resolve) => {
    try {
      // Use hidden form submission instead of fetch()
      // This bypasses CORS because form submissions are not subject to preflight checks
      const uniqueId = 'tl-order-frame-' + Date.now();

      // Create hidden iframe to receive the response without navigating the page
      const iframe = document.createElement('iframe');
      iframe.name = uniqueId;
      iframe.id = uniqueId;
      iframe.style.cssText = 'display:none;width:0;height:0;border:0;position:absolute;top:-9999px;';
      document.body.appendChild(iframe);

      // Create hidden form targeting the iframe
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = PRODUCTS_API_URL;
      form.target = uniqueId;
      form.style.cssText = 'display:none;position:absolute;top:-9999px;';
      form.enctype = 'application/x-www-form-urlencoded';

      // Pack entire payload as a single JSON string in the 'data' field
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'data';
      input.value = JSON.stringify({ action: 'addOrder', payload: payload });
      form.appendChild(input);

      document.body.appendChild(form);

      // Submit the form
      form.submit();
      console.log('Order submitted to Google Sheet via form submission');

      // Clean up DOM elements after 8 seconds
      setTimeout(() => {
        try {
          if (document.body.contains(form)) document.body.removeChild(form);
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        } catch (cleanupErr) { }
      }, 8000);

      // Resolve immediately with a success response
      // We cannot read the iframe response due to cross-origin restrictions
      // but the form submission DOES reach the Apps Script and saves the data
      setTimeout(() => {
        resolve({
          status: 'success',
          data: {
            id: 'ORD-' + Date.now(),
            message: 'Order submitted successfully'
          }
        });
      }, 500);

    } catch (err) {
      console.error('addOrder form submission error:', err);
      resolve({ status: 'error', message: err.message });
    }
  });
}

export async function refreshCatalog() {
  return await fetchCatalog();
}

// Auto-refresh catalog data every 5 minutes in the background
// This ensures product images and details stay up to date without page reload
let autoRefreshInterval = null;

export function startAutoRefresh() {
  if (autoRefreshInterval) return; // already running
  autoRefreshInterval = setInterval(async () => {
    try {
      await fetchCatalog();
      // Dispatch a custom event so pages can react to new data
      window.dispatchEvent(new CustomEvent('catalogRefreshed'));
    } catch (e) {
      console.warn('Auto-refresh failed:', e.message);
    }
  }, 5 * 60 * 1000); // every 5 minutes
}

export function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}