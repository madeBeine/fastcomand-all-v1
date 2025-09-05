export const generateInvoiceHTML = (data: any, isQuote: boolean = false, isPartiallyPaid: boolean = false) => {
  const documentTitle = isQuote ? 'عرض سعر' : isPartiallyPaid ? 'فاتورة مدفوعة جزئياً' : 'فاتورة';
  const documentType = isQuote ? 'عرض سعر' : isPartiallyPaid ? 'فاتورة مدفوعة جزئياً' : 'فتورة';

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${documentTitle} رقم ${data.orderNumber}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
          color: #000;
          line-height: 1.4;
        }

        .invoice {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          position: relative;
        }

        .header {
          background: linear-gradient(135deg, #3d4ed8 0%, #8b5cf6 100%);
          color: white;
          padding: 30px;
          text-align: left;
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #f59e0b, #fbbf24);
        }

        .company-section {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .logo-box {
          width: 80px;
          height: 80px;
          background: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: #3d4ed8;
          font-size: 24px;
        }

        .company-info {
          color: white;
          font-size: 14px;
          line-height: 1.3;
        }

        .company-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .invoice-title {
          font-size: 42px;
          font-weight: bold;
          color: white;
          letter-spacing: 2px;
        }

        .content {
          padding: 30px;
          background: white;
        }

        .bill-to-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 30px;
        }

        .bill-to h3 {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 15px;
          color: #000;
        }

        .bill-to-info {
          line-height: 1.6;
          color: #000;
        }

        .invoice-info {
          text-align: right;
        }

        .invoice-info h3 {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 15px;
          color: #000;
        }

        .info-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          color: #000;
        }

        .info-line span:first-child {
          font-weight: bold;
        }

        .products-table {
          width: 100%;
          border-collapse: collapse;
          margin: 30px 0;
          border: 1px solid #000;
        }

        .products-table th {
          background: #3d4ed8;
          color: white;
          padding: 12px;
          text-align: center;
          font-weight: bold;
          border: 1px solid #000;
        }

        .products-table td {
          padding: 12px;
          text-align: center;
          border: 1px solid #000;
          background: white;
        }

        .products-table tbody tr:nth-child(even) {
          background: #f8f9fa;
        }

        .total-section {
          background: #3d4ed8;
          color: white;
          padding: 15px;
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          margin: 20px 0;
        }

        .payment-method {
          margin: 30px 0;
        }

        .payment-method h3 {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #000;
        }

        .terms-section {
          margin-top: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .terms-section h3 {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 15px;
          color: #000;
        }

        .terms-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .terms-list li {
          margin-bottom: 10px;
          padding: 8px;
          background: white;
          border-radius: 4px;
          font-size: 14px;
          line-height: 1.4;
          position: relative;
          padding-right: 30px;
        }

        .terms-list li::before {
          content: counter(term-counter);
          counter-increment: term-counter;
          position: absolute;
          right: 8px;
          top: 8px;
          background: #3d4ed8;
          color: white;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }

        .terms-section {
          counter-reset: term-counter;
        }

        .paid-stamp {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-15deg);
          background: ${isQuote ? 'rgba(59, 130, 246, 0.1)' : isPartiallyPaid ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)'};
          border: 4px solid ${isQuote ? '#3b82f6' : isPartiallyPaid ? '#f59e0b' : '#22c55e'};
          color: ${isQuote ? '#3b82f6' : isPartiallyPaid ? '#f59e0b' : '#22c55e'};
          padding: 15px 30px;
          font-size: ${isPartiallyPaid ? '26px' : '32px'};
          font-weight: bold;
          border-radius: 10px;
          z-index: 10;
          display: block;
        }

        .quote-watermark {
          position: absolute;
          top: 20%;
          right: 10%;
          opacity: 0.1;
          font-size: 120px;
          font-weight: bold;
          color: #3b82f6;
          transform: rotate(30deg);
          z-index: 1;
          display: ${isQuote ? 'block' : 'none'};
        }

        /* Print Styles */
        @media print {
          body {
            background: white !important;
            padding: 0 !important;
          }
          .invoice {
            max-width: none !important;
          }
          .header {
            background: #3d4ed8 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .products-table th {
            background: #3d4ed8 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .total-section {
            background: #3d4ed8 !important;
            -webkit-print-color-adjust: exact !important;
          }
          .paid-stamp {
            border-color: ${isPartiallyPaid ? '#f59e0b' : '#22c55e'} !important;
            color: ${isPartiallyPaid ? '#f59e0b' : '#22c55e'} !important;
            -webkit-print-color-adjust: exact !important;
          }
          .terms-list li::before {
            background: #3d4ed8 !important;
            -webkit-print-color-adjust: exact !important;
          }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .bill-to-section {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .header {
            flex-direction: column;
            text-align: center;
            gap: 20px;
          }
          .invoice-title {
            font-size: 32px;
          }
          .content {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice">
        <div class="quote-watermark">عرض سعر</div>
        <div class="paid-stamp">${isQuote ? 'عرض سعر' : isPartiallyPaid ? 'مدفوع جزئياً' : 'PAID'}</div>

        <div class="header">
          <div class="company-section">
            <div class="logo-box">FC</div>
            <div class="company-info">
              <div class="company-name">Fast Command</div>
              <div>Mauritania</div>
              <div>Nouakchott</div>
              <div>32768057</div>
              <div>fastcomand28@gmail.com</div>
            </div>
          </div>
          <div class="invoice-title">${documentType.toUpperCase()}</div>
        </div>

        <div class="content">
          <div class="bill-to-section">
            <div class="bill-to">
              <h3>BILL TO</h3>
              <div class="bill-to-info">
                ${data.customerName}<br>
                ${data.customerPhone}<br>
                ${data.customerEmail || ''}
              </div>
            </div>

            <div class="invoice-info">
              <div class="info-line">
                <span>${documentType} #</span>
                <span>FD${data.orderNumber}</span>
              </div>
              <div class="info-line">
                <span>ISSUE DATE</span>
                <span>${data.date}</span>
              </div>
              <div class="info-line">
                <span>DUE DATE</span>
                <span>${data.date}</span>
              </div>
            </div>
          </div>

          <table class="products-table">
            <thead>
              <tr>
                <th>DESCRIPTION</th>
                <th>QTY</th>
                <th>PRICE</th>
                <th>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: right;">${data.storeName} - عدد ${data.products.length}</td>
                <td>1</td>
                <td>UM${Math.round(data.originalPrice * (data.originalCurrency === 'USD' ? 390 : data.originalCurrency === 'EUR' ? 420 : 106))}.00</td>
                <td>UM${Math.round(data.originalPrice * (data.originalCurrency === 'USD' ? 390 : data.originalCurrency === 'EUR' ? 420 : 106))}.00</td>
              </tr>
              <tr style="background: #f8f9fa;">
                <td style="text-align: right;">عمولة</td>
                <td>1</td>
                <td>UM${Math.round(data.commission)}.00</td>
                <td>UM${Math.round(data.commission)}.00</td>
              </tr>
            </tbody>
          </table>

          <div class="payment-method">
            <h3>${isQuote ? 'طريقة الدفع المقترحة' : 'تم الدفع عبر'}</h3>
            <div style="font-weight: bold; color: #3d4ed8;">بنكيلي</div>
            <div style="font-family: monospace; font-size: 16px; font-weight: bold;">38404363</div>
            ${isQuote ? '<div style="color: #666; font-size: 12px; margin-top: 5px;">سيتم تأكيد بيانات الدفع عند الطلب</div>' : ''}
          </div>

          ${isPartiallyPaid && data.paidAmount ? `
          <div style="background: #f59e0b; color: white; padding: 15px; text-align: center; font-size: 16px; font-weight: bold; margin: 10px 0; border-radius: 8px;">
            المبلغ المدفوع: UM${Math.round(data.paidAmount)}.00
          </div>
          <div style="background: #ef4444; color: white; padding: 15px; text-align: center; font-size: 16px; font-weight: bold; margin: 10px 0; border-radius: 8px;">
            المبلغ المتبقي: UM${Math.round(data.finalPrice - data.paidAmount)}.00
          </div>
          ` : ''}

          <div class="total-section">
            ${isPartiallyPaid ? 'إجمالي المبلغ:' : 'TOTAL'} UM${Math.round(data.finalPrice)}.00
          </div>

          <div class="terms-section">
            <h3>${isQuote ? 'شروط عرض السعر' : 'شروط وأحكام الفاتورة'}</h3>
            <ul class="terms-list">
              ${isQuote ? `
                <li>هذا عرض سعر مبدئي وقابل للتغيير حسب تقلبات الأسعار.</li>
                <li>لا يعتبر هذا العرض ملزماً إلا بعد تأكيد ودفع العربون.</li>
                <li>يجب تأكيد الطلب خلال 7 أيام من تاريخ العرض.</li>
                <li>قد تتغير الأسعار حسب تقلبات العملة والشحن.</li>
                <li>للتأكيد والطلب، يرجى التواصل معنا.</li>
              ` : `
                <li>في حالة تحققت شروط استرجاع المبلغ، لا يمكن استرجاع العمولة بعد تأكيد الطلب.</li>
                <li>لا يتم تسليم الطلب إلا بعد دفع جميع المستحقات بالكامل.</li>
                <li>نتحمل مسؤولية ضياع المنتج أو كسره أثناء النقل حتى استلامه من قبل الزبون.</li>
                <li>لا يمكن استرجاع المبلغ لمدفوع بعد تأكيد الطلب.</li>
                <li>عند ارسال الفاتورة، يعني ذلك أن الطلب قد تم تأكيده نهائياً.</li>
              `}
            </ul>
          </div>
        </div>
      </div>

      <script>
        // منع طباعة أي عناصر خارج الفاتورة
        window.onload = function() {
          // إخفاء جمي العناصر الأخرى عند الطباعة
          const style = document.createElement('style');
          style.innerHTML = \`
            @media print {
              body * { visibility: hidden; }
              .invoice, .invoice * { visibility: visible; }
              .invoice {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0;
              }
            }
          \`;
          document.head.appendChild(style);

          setTimeout(function() {
            window.print();
          }, 750);
        }
      </script>
    </body>
    </html>
  `;
};
