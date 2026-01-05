import { t } from 'i18next';
import { generateReceiptImage } from './receiptGenerator';
import { generateBusinessCardImage } from './cardGenerator';

export function shareOnWhatsApp(sale: { customerName: string; totalAmount: number; date: Date; status: string }) {
  const text = t('receiptText', {
    customer: sale.customerName,
    amount: sale.totalAmount.toLocaleString(),
    date: new Date(sale.date).toLocaleDateString(),
    status: t(sale.status),
  });

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

export async function shareProfessionalReceipt(sale: any, shop: any) {
  try {
    const blob = await generateReceiptImage(sale, shop);
    const file = new File([blob], `receipt_${sale.id}.png`, { type: 'image/png' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Sales Receipt',
        text: `Receipt for ${sale.customerName}`,
      });
    } else {
      shareOnWhatsApp(sale);
    }
  } catch (error) {
    console.error('Error sharing receipt:', error);
    shareOnWhatsApp(sale);
  }
}

export async function shareDigitalCard(shop: any, topItems: any[]) {
  try {
    const blob = await generateBusinessCardImage(shop, topItems);
    const file = new File([blob], `business_card_${shop?.id}.png`, { type: 'image/png' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Shop Business Card',
        text: `Find us at ${shop?.name || 'Kantin Kwari'}`,
      });
    } else {
      const text = `Contact ${shop?.name || 'our shop'} at ${shop?.address || 'Kantin Kwari Market'}`;
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }
  } catch (error) {
    console.error('Error sharing business card:', error);
  }
}

export function sendDebtReminder(sale: { customerName: string; totalAmount: number; date: Date }) {
  const text = t('reminderText', {
    shopName: t('appName'),
    amount: sale.totalAmount.toLocaleString(),
    date: new Date(sale.date).toLocaleDateString(),
  });

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

export function shareWaybill(transfer: any, fromShop: any, toShop: any, product: any) {
  const text = `KwariBook Waybill (Yan Dako)\n\nFrom: ${fromShop?.name}\nTo: ${toShop?.name}\n\nItem: ${product?.name}\nQuantity: ${transfer.quantity}\nDate: ${new Date(transfer.date).toLocaleDateString()}\n\nPlease deliver safely.`;
  
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

export function shareNewArrivals(items: any[]) {
  let text = `🔥 NEW ARRIVALS @ ${t('appName')} 🔥\n\nCheck out our latest patterns:\n\n`;
  
  items.forEach(item => {
    text += `✨ ${item.name}\n💰 Price: ₦${item.pricePerUnit.toLocaleString()}\n\n`;
  });
  
  text += `Message us now to order! 🚀`;
  
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}
