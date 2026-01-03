import { t } from 'i18next';

export async function generateReceiptImage(sale: any, shop: any): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // Set dimensions for a mobile-friendly receipt image
  canvas.width = 500;
  canvas.height = 700;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header Background
  ctx.fillStyle = '#059669'; // Kwari Green
  ctx.fillRect(0, 0, canvas.width, 120);

  // Shop Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(shop?.name || t('appName'), canvas.width / 2, 50);

  // Shop Address
  ctx.font = '16px sans-serif';
  ctx.fillText(shop?.address || 'Kantin Kwari Market, Kano', canvas.width / 2, 85);

  // Receipt Title
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('SALES RECEIPT', canvas.width / 2, 170);

  // Line
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 200);
  ctx.lineTo(460, 200);
  ctx.stroke();

  // Details
  ctx.textAlign = 'left';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.fillText('Customer:', 40, 240);
  ctx.fillText('Date:', 40, 280);
  ctx.fillText('Status:', 40, 320);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#111827';
  ctx.fillText(sale.customerName, 460, 240);
  ctx.fillText(new Date(sale.date).toLocaleDateString(), 460, 280);
  ctx.fillText(t(sale.status).toUpperCase(), 460, 320);

  // Items Table Placeholder
  ctx.fillStyle = '#f9fafb';
  ctx.fillRect(40, 360, 420, 150);
  ctx.strokeStyle = '#e5e7eb';
  ctx.strokeRect(40, 360, 420, 150);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#9ca3af';
  ctx.font = 'italic 16px sans-serif';
  ctx.fillText('KwariBook Transaction Record', canvas.width / 2, 440);

  // Total
  ctx.strokeStyle = '#059669';
  ctx.beginPath();
  ctx.moveTo(40, 540);
  ctx.lineTo(460, 540);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#111827';
  ctx.fillText('TOTAL:', 40, 590);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#059669';
  ctx.font = 'black 32px sans-serif';
  ctx.fillText(`₦ ${sale.totalAmount.toLocaleString()}`, 460, 595);

  // Footer
  ctx.fillStyle = '#9ca3af';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Nagode da Kasuwanci! / Thank you for your patronage.', canvas.width / 2, 660);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, 'image/png');
  });
}
