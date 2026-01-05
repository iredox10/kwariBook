import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { X, Printer } from 'lucide-react';

interface BarcodeLabelModalProps {
  item: any;
  onClose: () => void;
}

export function BarcodeLabelModal({ item, onClose }: BarcodeLabelModalProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      // Use item ID as fallback if barcode is missing
      const barcodeValue = item.barcode || `KB-${item.id}`;
      JsBarcode(barcodeRef.current, barcodeValue, {
        format: "CODE128",
        width: 2,
        height: 100,
        displayValue: true
      });
    }
  }, [item]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const svgContent = barcodeRef.current?.outerHTML;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label - ${item.name}</title>
          <style>
            body { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              font-family: sans-serif;
              padding: 20px;
            }
            .label-container {
              border: 1px solid #eee;
              padding: 20px;
              text-align: center;
              width: 300px;
            }
            h2 { margin: 0 0 10px 0; font-size: 18px; }
            p { margin: 5px 0; font-size: 14px; font-weight: bold; }
            .price { font-size: 20px; color: #059669; }
          </style>
        </head>
        <body>
          <div class="label-container">
            <h2>${item.name}</h2>
            <div id="barcode-wrap">${svgContent}</div>
            <p class="price">₦ ${item.pricePerUnit.toLocaleString()}</p>
            <p style="font-size: 10px; color: #666;">KwariBook Digital Record</p>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-lg">Product Label</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center space-y-6">
          <div className="text-center">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">{item.category}</p>
            <h2 className="text-xl font-black text-gray-900">{item.name}</h2>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-inner">
            <svg ref={barcodeRef}></svg>
          </div>

          <p className="text-2xl font-black text-kwari-green">₦ {item.pricePerUnit.toLocaleString()}</p>
        </div>

        <div className="p-6 bg-gray-50 flex space-x-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg flex items-center justify-center space-x-2 hover:bg-black transition-all"
          >
            <Printer size={18} />
            <span>Print Label</span>
          </button>
        </div>
      </div>
    </div>
  );
}
