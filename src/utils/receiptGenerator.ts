import { t } from 'i18next';

export async function generateReceiptImage(sale: any, shop: any): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 500;
  canvas.height = 850; // Increased for navigation

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header Background
  ctx.fillStyle = '#059669'; 
  ctx.fillRect(0, 0, canvas.width, 120);

  // Draw Logo if exists
  if (shop?.logo) {
    try {
      const logoImg = new Image();
      logoImg.src = shop.logo;
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
      });
      const aspect = logoImg.width / logoImg.height;
      const h = 60;
      const w = h * aspect;
      ctx.drawImage(logoImg, 40, 30, w, h);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(shop.name, 40 + w + 20, 65);
      ctx.font = '14px sans-serif';
      ctx.fillText(shop.address || 'Kantin Kwari Market, Kano', 40 + w + 20, 90);
    } catch (e) {
      drawHeaderText(ctx, canvas, shop);
    }
  } else {
    drawHeaderText(ctx, canvas, shop);
  }

  // Receipt Title
  ctx.textAlign = 'center';
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

  // Items Table 
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

  // Navigation Box
  ctx.fillStyle = '#f0fdf4';
  ctx.fillRect(40, 630, 420, 120);
  ctx.strokeStyle = '#bbf7d0';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 630, 420, 120);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#166534';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('FIND OUR SHOP AGAIN:', 55, 655);
  
  ctx.fillStyle = '#15803d';
  ctx.font = '12px sans-serif';
  const loc = [
    shop?.building ? `Building: ${shop.building}` : '',
    shop?.block ? `Block: ${shop.block}` : '',
    shop?.floor ? `Floor: ${shop.floor}` : ''
  ].filter(Boolean).join(' | ');
  
  ctx.fillText(loc || shop?.address || 'Kantin Kwari, Kano', 55, 680);
  if (shop?.landmark) {
    ctx.fillText(`Landmark: ${shop.landmark}`, 55, 700);
  }
  ctx.font = 'italic 11px sans-serif';
  ctx.fillText('Save this to find our patterns next time!', 55, 730);

  // Footer
  ctx.fillStyle = '#9ca3af';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Nagode da Kasuwanci! / Thank you for your patronage.', canvas.width / 2, 810);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, 'image/png');
  });
}

function drawHeaderText(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, shop: any) {
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(shop?.name || t('appName'), canvas.width / 2, 60);
  ctx.font = '16px sans-serif';
  ctx.fillText(shop?.address || 'Kantin Kwari Market, Kano', canvas.width / 2, 95);
}
