import { t } from 'i18next';
import { generateReceiptImage } from './receiptGenerator';

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
      // Fallback: Just share on WhatsApp as text
      shareOnWhatsApp(sale);
    }
  } catch (error) {
    console.error('Error sharing receipt:', error);
    shareOnWhatsApp(sale);
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
