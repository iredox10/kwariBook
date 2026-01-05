import { t } from 'i18next';

export async function generateBusinessCardImage(shop: any, topItems: any[]): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 600;
  canvas.height = 800;

  // Background Gradient
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#059669'); // Kwari Green
  grad.addColorStop(1, '#064e3b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Decorative Circle
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.arc(canvas.width, 0, 300, 0, Math.PI * 2);
  ctx.fill();

  // Logo Circle
  const logoSize = 120;
  const centerX = canvas.width / 2;
  
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, 150, logoSize / 2, 0, Math.PI * 2);
  ctx.clip();
  
  if (shop?.logo) {
    try {
      const logoImg = new Image();
      logoImg.src = shop.logo;
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
      });
      ctx.drawImage(logoImg, centerX - logoSize / 2, 150 - logoSize / 2, logoSize, logoSize);
    } catch (e) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(centerX - logoSize / 2, 150 - logoSize / 2, logoSize, logoSize);
    }
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(centerX - logoSize / 2, 150 - logoSize / 2, logoSize, logoSize);
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 60px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(shop?.name?.charAt(0) || 'K', centerX, 170);
  }
  ctx.restore();

  // Shop Name
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'black 42px sans-serif';
  ctx.fillText(shop?.name || t('appName'), centerX, 260);

  // Location Badge
  const locText = shop?.building || 'Kantin Kwari Market';
  ctx.font = 'bold 18px sans-serif';
  const textWidth = ctx.measureText(locText).width;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.roundRect(centerX - (textWidth + 40) / 2, 285, textWidth + 40, 35, 20);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(locText, centerX, 310);

  // Address Details
  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  const details = [
    shop?.block ? `Block ${shop.block}` : '',
    shop?.floor ? `${shop.floor} Floor` : '',
    shop?.landmark ? `(${shop.landmark})` : ''
  ].filter(Boolean).join(' • ');
  ctx.fillText(details, centerX, 350);

  // Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.moveTo(100, 390);
  ctx.lineTo(500, 390);
  ctx.stroke();

  // "Our Patterns" section
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('LATEST PATTERNS', centerX, 440);

  // Top Items
  if (topItems && topItems.length > 0) {
    for (let i = 0; i < Math.min(topItems.length, 3); i++) {
      const item = topItems[i];
      const y = 480 + (i * 80);
      
      // Item row background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.roundRect(60, y, 480, 65, 15);
      ctx.fill();

      // Item Name
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(item.name, 80, y + 40);

      // Item Price
      ctx.textAlign = 'right';
      ctx.font = 'black 22px sans-serif';
      ctx.fillText(`₦ ${item.pricePerUnit.toLocaleString()}`, 520, y + 42);
    }
  } else {
    ctx.font = 'italic 18px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('New collection arriving soon...', centerX, 550);
  }

  // Footer / CTA
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Message us on WhatsApp to Order! 🚀', centerX, 740);
  
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText('Powered by KwariBook Digital', centerX, 775);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}
