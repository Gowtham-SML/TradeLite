import { AppStore } from './store.js';
import { updateCartBadge } from './ui.js';

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem('tl_cart');
    if (raw) AppStore.cart = JSON.parse(raw);
  } catch (e) {
    AppStore.cart = [];
  }
  updateCartBadge(getItemCount());
}

export function saveToStorage() {
  localStorage.setItem('tl_cart', JSON.stringify(AppStore.cart));
  updateCartBadge(getItemCount());
  window.dispatchEvent(new CustomEvent('cartUpdated'));
}

export function addItem(product, quantity = 1) {
  const existing = AppStore.cart.find(i => i.id === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    AppStore.cart.push({ ...product, quantity });
  }
  saveToStorage();
}

export function removeItem(productId) {
  AppStore.cart = AppStore.cart.filter(i => i.id !== productId);
  saveToStorage();
}

export function updateQuantity(productId, newQty) {
  if (newQty <= 0) {
    removeItem(productId);
    return;
  }
  const item = AppStore.cart.find(i => i.id === productId);
  if (item) {
    item.quantity = newQty;
    saveToStorage();
  }
}

export function clearCart() {
  AppStore.cart = [];
  saveToStorage();
}

export function getCart() {
  return AppStore.cart;
}

export function getTotal() {
  return AppStore.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

export function getItemCount() {
  return AppStore.cart.reduce((sum, item) => sum + item.quantity, 0);
}
