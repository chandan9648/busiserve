export function generateOrderNumber() {
  const now = new Date();

  const year = now.getFullYear();

  const random = Math.floor(
    100000 + Math.random() * 900000
  );

  return `ORD-${year}-${random}`;
}

export function generateInvoiceNumber() {
  const now = new Date();

  const year = now.getFullYear();

  const random = Math.floor(
    100000 + Math.random() * 900000
  );

  return `INV-${year}-${random}`;
}