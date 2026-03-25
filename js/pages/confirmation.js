import { AppStore } from '../store.js';
import { fetchCatalog } from '../api.js';

document.addEventListener('DOMContentLoaded', async () => {
  await fetchCatalog().catch(e => console.error(e));
  
    if (AppStore.settings) {
      const s = AppStore.settings;
      if (s.name) {
        document.title = s.name + ' | Complete';
        document.querySelectorAll('#footer-store-name').forEach(el => el.textContent = s.name);
      }
      if (s.email) {
        document.querySelectorAll('#footer-email').forEach(el => el.textContent = s.email);
      }
      if (s.waNumber) {
        document.querySelectorAll('#footer-wa-num').forEach(el => el.textContent = '+' + s.waNumber);
      }
    }
  
  const waUrl = sessionStorage.getItem('tl_last_wa_url');
  
  if (!waUrl) {
    window.location.href = 'index.html';
    return;
  }

  // Automatically open WhatsApp on load
  try {
    window.open(waUrl, '_blank');
  } catch(e) {
    console.error('Popup blocked:', e);
  }

  const btn = document.getElementById('btn-reopen-wa');
  if (btn) {
    btn.addEventListener('click', () => {
      window.open(waUrl, '_blank');
    });
  }
});
