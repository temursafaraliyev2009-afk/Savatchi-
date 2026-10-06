/**
 * Savatchi POS — Buyurtmalarni Tozalash va Tuzatish Skripti (fix_orders.js)
 * 
 * Ushbu skript brauzer localStorage'idagi barcha buzilgan, null qiymatli
 * yoki noto'g'ri formatdagi buyurtmalarni to'liq tekshiradi, tuzatadi va normallashtiradi:
 * 
 * 1. 'product' maydoni bo'lmagan buyurtmalarni to'g'irlaydi (items ro'yxatidan nomini oladi).
 * 2. 'supplier' / 'customerName' maydonlarini xavfsiz matnga o'tkazadi.
 * 3. Bir xil ID ga ega takroriy (dublikat) buyurtmalarni o'chiradi.
 * 4. Narx va miqdorlarni to'g'ri son va matn formatiga keltiradi.
 * 5. Barcha 9 ta do'kon uchun alohida kalitlarni (savatchi_orders_store_*) tozalaydi.
 * 
 * Qanday ishlatish mumkin:
 * A) Brauzer konsolida (F12 -> Console):
 *    Ushbu fayl kodini to'g'ridan-to'g'ri konsolga qo'ying va Enter bosing.
 *    Yoki `window.fixAllOrders()` ni chaqiring.
 * B) Node.js orqali:
 *    node fix_orders.js
 */

export function fixAllOrders(storage = (typeof window !== 'undefined' ? window.localStorage : null)) {
  if (!storage) {
    console.log('⚠️ DIQQAT: Brauzer localStorage topilmadi.');
    console.log('Ushbu skriptni brauzer konsolida (F12 -> Console) ishga tushiring yoki storage obyektini uzating.');
    return { success: false, message: 'localStorage mavjud emas' };
  }

  console.log('🚀 Savatchi buyurtmalarini tekshirish va tozalash boshlandi...');

  let totalInspected = 0;
  let totalFixed = 0;
  let totalRemovedDuplicates = 0;

  // 1. localStorage'dagi barcha buyurtma kalitlarini topish
  const orderKeys = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && (key === 'savatchi_orders' || key.startsWith('savatchi_orders_'))) {
      orderKeys.push(key);
    }
  }

  // Standart do'kon kalitlarini ham qo'shish (agar bo'sh bo'lsa)
  const defaultStoreTypes = ['food', 'phone', 'clothing', 'cosmetics', 'construction', 'household', 'sport', 'accessories', 'flower'];
  defaultStoreTypes.forEach(type => {
    const key = `savatchi_orders_store_${type}`;
    if (!orderKeys.includes(key)) {
      orderKeys.push(key);
    }
  });

  orderKeys.forEach(key => {
    try {
      const raw = storage.getItem(key);
      if (!raw) return;

      const orders = JSON.parse(raw);
      if (!Array.isArray(orders)) return;

      const seenIds = new Set();
      const cleanedOrders = [];

      orders.forEach((o, index) => {
        totalInspected++;

        if (!o || typeof o !== 'object') {
          totalFixed++;
          return;
        }

        // 1. Unikal ID tekshiruvi
        let id = o.id ? String(o.id).trim() : `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
        if (seenIds.has(id)) {
          // Dublikat bo'lsa yangi ID beramiz yoki olib tashlaymiz
          id = `${id}-${index + 1}`;
          totalRemovedDuplicates++;
        }
        seenIds.add(id);

        // 2. Mahsulot nomi (product) tekshiruvi
        let product = o.product ? String(o.product).trim() : '';
        if (!product && Array.isArray(o.items) && o.items.length > 0) {
          product = o.items.map(item => `${item.name || 'Tovar'} (x${item.quantity || 1})`).join(', ');
          totalFixed++;
        }
        if (!product) {
          product = 'Buyurtma tovarlari';
          totalFixed++;
        }

        // 3. Yetkazib beruvchi / Mijoz nomi
        let customerName = o.supplier || o.customerName || (o.type === 'customer' ? 'Onlayn Xaridor' : 'Ta’minotchi');
        customerName = String(customerName).trim();

        // 4. Miqdor (qty)
        let qty = o.qty ? String(o.qty).trim() : '';
        if (!qty && Array.isArray(o.items)) {
          qty = `${o.items.reduce((s, i) => s + (Number(i.quantity) || 1), 0)} dona`;
          totalFixed++;
        }
        if (!qty) {
          qty = '1 dona';
          totalFixed++;
        }

        // 5. Jami summa (total)
        let total = Number(o.total);
        if (isNaN(total) || total < 0) {
          total = 0;
          totalFixed++;
        }

        // 6. Holat (status)
        let status = o.status ? String(o.status).trim() : 'Hali yo‘lda';
        if (status === 'Jarayonda' || status === 'Kuryer yo‘lda') {
          status = 'Hali yo‘lda';
        }

        // 7. Sana
        const date = o.date ? String(o.date) : new Date().toISOString().split('T')[0];

        const cleanedOrder = {
          ...o,
          id,
          product,
          supplier: customerName,
          customerName,
          qty,
          total,
          status,
          date
        };

        cleanedOrders.push(cleanedOrder);
      });

      storage.setItem(key, JSON.stringify(cleanedOrders));
      console.log(`✅ [${key}]: ${cleanedOrders.length} ta buyurtma normallashtirildi.`);
    } catch (err) {
      console.error(`❌ [${key}] ni tozalashda xatolik:`, err);
    }
  });

  const report = {
    success: true,
    totalInspected,
    totalFixed,
    totalRemovedDuplicates,
    processedKeysCount: orderKeys.length
  };

  console.log('🎉 Tozalash yakunlandi!');
  console.log(`Jami tekshirilgan buyurtmalar: ${totalInspected}`);
  console.log(`Tuzatilgan maydonlar: ${totalFixed}`);
  console.log(`Birlashtirilgan dublikatlar: ${totalRemovedDuplicates}`);

  return report;
}

// Brauzer muhiti bo'lsa global obyektga biriktirish
if (typeof window !== 'undefined') {
  window.fixAllOrders = fixAllOrders;
  console.log('💡 Maslahat: Istalgan vaqtda konsolda `fixAllOrders()` buyrug‘ini chaqirishingiz mumkin.');
}

// Node muhiti bo'lsa demo rejimida test qilish
if (typeof process !== 'undefined' && process.release?.name === 'node') {
  const mockStorage = new Map();
  const storageAdapter = {
    length: 1,
    key: (i) => 'savatchi_orders_store_food',
    getItem: (k) => mockStorage.get(k) || null,
    setItem: (k, v) => mockStorage.set(k, v)
  };

  // Test uchun noto'g'ri formatdagi namunaviy buyurtmalar
  mockStorage.set('savatchi_orders_store_food', JSON.stringify([
    { id: 'ORD-101', product: null, items: [{ name: 'Non', quantity: 2 }, { name: 'Sut', quantity: 1 }], total: '45000' },
    { id: 'ORD-101', total: 10000 }, // dublikat ID
    { id: 'ORD-102', product: 'Pomidor', supplier: 'Dehqon Bozor', total: 20000, status: 'Yetkazildi' }
  ]));

  console.log('--- Test Rejimi (Node.js) ---');
  const result = fixAllOrders(storageAdapter);
  console.log('Natija:', result);
  console.log('Tuzatilgan ma’lumot:', JSON.parse(mockStorage.get('savatchi_orders_store_food')));
}

export default fixAllOrders;
