import { AppStore } from './store.js';

export function buildWhatsAppURL(waNumber, customerDetails, items, total) {
  const storeName = AppStore.settings.name || 'TradeLite';
  const currency = AppStore.settings.currency || '₹';
  let msg = `🛍️ New Order — ${storeName}\n\n`;
  msg += `Name: ${customerDetails.name}\n`;
  msg += `Phone: ${customerDetails.phone}\n`;
  msg += `Address: ${customerDetails.address}\n`;
  
  if (customerDetails.notes && customerDetails.notes.trim() !== '') {
    msg += `Notes: ${customerDetails.notes}\n`;
  }
  
  msg += `\nItems:\n`;
  items.forEach(item => {
    msg += `• ${item.name} × ${item.quantity} — ${currency}${item.price * item.quantity}\n`;
  });
  
  msg += `\nTotal: ${currency}${total}`;
  
  const encoded = encodeURIComponent(msg);
  const number = waNumber.replace(/\D/g, '');
  
  return `https://wa.me/${number}?text=${encoded}`;
}
