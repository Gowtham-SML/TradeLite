export function saveOrder(phoneNumber, items, total, customerDetails) {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  if (!cleanPhone) return;
  
  const key = `tl_orders_${cleanPhone}`;
  let existing = [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) existing = JSON.parse(raw);
  } catch (e) {}

  const order = {
    date: new Date().toISOString(),
    customerName: customerDetails.name,
    phone: phoneNumber.replace(/\D/g, ''),
    address: customerDetails.address,
    email: customerDetails.email || '',
    items: items.map(i => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      imageURL: i.imageURL
    })),
    total
  };
  
  existing.push(order);
  localStorage.setItem(key, JSON.stringify(existing));
}

export function getOrders(phoneNumber) {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const key = `tl_orders_${cleanPhone}`;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
