import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { t } from 'i18next';

export function generateBankStatement(sales: any[], expenses: any[], shop: any) {
  const doc = new jsPDF();
  const shopName = shop?.name || t('appName');
  const shopAddress = shop?.address || 'Kantin Kwari, Kano';

  // Header
  doc.setFontSize(22);
  doc.setTextColor(5, 150, 105); // Kwari Green
  doc.text(shopName, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(shopAddress, 14, 28);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 34);

  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('FINANCIAL TURNOVER STATEMENT', 14, 48);

  // Summary Table
  const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const net = totalSales - totalExpenses;

  autoTable(doc, {
    startY: 55,
    head: [['Description', 'Amount (NGN)']],
    body: [
      ['Total Sales Volume', totalSales.toLocaleString()],
      ['Total Operational Expenses', totalExpenses.toLocaleString()],
      ['Net Position', net.toLocaleString()],
    ],
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105] as any }
  });

  // Recent Sales Table
  doc.setFontSize(14);
  doc.text('Recent Sales History', 14, (doc as any).lastAutoTable.finalY + 15);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [['Date', 'Customer', 'Status', 'Amount']],
    body: sales.slice(0, 50).map(s => [
      new Date(s.date).toLocaleDateString(),
      s.customerName,
      s.status.toUpperCase(),
      s.totalAmount.toLocaleString()
    ]),
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`KwariBook - Digital Bookkeeping for Northern Nigeria. Page ${i} of ${pageCount}`, 14, 285);
  }

  doc.save(`KwariBook_Statement_${new Date().getTime()}.pdf`);
}

export function generateCustomerStatement(customer: any, sales: any[], shop: any) {
  const doc = new jsPDF();
  const shopName = shop?.name || t('appName');

  // Header
  doc.setFontSize(20);
  doc.setTextColor(5, 150, 105);
  doc.text(shopName, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('CUSTOMER TRANSACTION HISTORY', 14, 28);

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(`Statement for: ${customer.name}`, 14, 45);
  doc.setFontSize(10);
  doc.text(`Phone: ${customer.phone || 'N/A'}`, 14, 52);
  doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, 58);

  const totalBought = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalPaid = sales.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.totalAmount, 0);
  const outstanding = totalBought - totalPaid;

  autoTable(doc, {
    startY: 65,
    head: [['Total Purchases', 'Total Paid', 'Outstanding Balance']],
    body: [[
      `₦ ${totalBought.toLocaleString()}`,
      `₦ ${totalPaid.toLocaleString()}`,
      `₦ ${outstanding.toLocaleString()}`
    ]],
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105] as any }
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 15,
    head: [['Date', 'Status', 'Amount']],
    body: sales.map(s => [
      new Date(s.date).toLocaleDateString(),
      s.status.toUpperCase(),
      `₦ ${s.totalAmount.toLocaleString()}`
    ]),
  });

  doc.save(`${customer.name.replace(/\s+/g, '_')}_Statement.pdf`);
}
