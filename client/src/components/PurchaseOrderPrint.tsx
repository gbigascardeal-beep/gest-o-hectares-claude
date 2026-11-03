import React from 'react';

interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  unitValue: number;
  subtotal: number;
}

interface PurchaseOrderPrintProps {
  order: {
    id: number;
    orderNumber: string;
    supplierId: number;
    supplierName: string;
    supplierCNPJ?: string;
    supplierEmail?: string;
    supplierPhone?: string;
    supplierAddress?: string;
    supplierCity?: string;
    supplierState?: string;
    supplierCEP?: string;
    costCenterId: number;
    costCenterName: string;
    totalValue: string | number;
    freightValue?: string | number;
    paymentMethod: string;
    installments: number;
    observations?: string;
    createdAt: Date | string;
    status: string;
    items?: OrderItem[];
  };
}

export function generatePurchaseOrderPrint(order: PurchaseOrderPrintProps['order']) {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Solicitado';
      case 'aprovada':
        return 'Aprovado';
      case 'finalizada':
        return 'Finalizado';
      case 'cancelada':
        return 'Cancelado';
      default:
        return status;
    }
  };

  // Calculate totals
  const itemsTotal = (order.items || []).reduce((sum, item) => sum + item.subtotal, 0);
  const totalValue = typeof order.totalValue === 'string' ? parseFloat(order.totalValue) : order.totalValue;

  // Generate payment installments
  const generateInstallments = () => {
    if (order.paymentMethod === 'a_vista') {
      return [
        {
          dueDate: formatDate(order.createdAt),
          value: totalValue,
          method: 'À Vista',
          observation: '-'
        }
      ];
    } else {
      const installments = order.installments || 1;
      const installmentValue = totalValue / installments;
      const createdDate = new Date(order.createdAt);
      
      return Array.from({ length: installments }, (_, index) => {
        const dueDate = new Date(createdDate);
        dueDate.setMonth(dueDate.getMonth() + index + 1);
        
        return {
          dueDate: formatDate(dueDate),
          value: installmentValue,
          method: 'BOLETO BANCÁRIO - (OBRAS)',
          observation: '-'
        };
      });
    }
  };

  const installments = generateInstallments();
  const installmentRows = installments.map(inst => `
    <div class="payment-row">
      <div class="payment-cell">${inst.dueDate}</div>
      <div class="payment-cell">${formatCurrency(inst.value)}</div>
      <div class="payment-cell">${inst.method}</div>
      <div class="payment-cell">${inst.observation}</div>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ordem de Compra ${order.orderNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          color: #333;
          background-color: #fff;
          padding: 20px;
          line-height: 1.4;
        }
        
        .container {
          max-width: 900px;
          margin: 0 auto;
          background-color: white;
        }
        
        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border: 2px solid #333;
          padding: 20px;
          margin-bottom: 20px;
          min-height: 100px;
        }
        
        .company-info {
          flex: 1;
        }
        
        .company-logo {
          width: 100px;
          height: 100px;
          background-color: transparent;
          border-radius: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 20px;
          flex-shrink: 0;
        }
        
        .company-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .company-details {
          flex: 1;
        }
        
        .company-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .company-meta {
          font-size: 11px;
          line-height: 1.6;
          color: #555;
        }
        
        .company-contact {
          text-align: right;
          font-size: 11px;
          line-height: 1.6;
        }
        
        .company-contact strong {
          display: block;
          margin-bottom: 3px;
        }
        
        /* Order Title */
        .order-title {
          background-color: #e8e8e8;
          padding: 12px;
          font-size: 18px;
          font-weight: bold;
          border: 1px solid #999;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
        }
        
        .order-number {
          font-size: 16px;
          font-weight: bold;
          flex: 1;
          text-align: center;
        }
        
        .order-date {
          font-size: 14px;
          font-weight: bold;
          position: absolute;
          right: 12px;
        }
        
        /* Supplier Info Section */
        .supplier-section {
          margin-bottom: 20px;
        }
        
        .supplier-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          border: 1px solid #999;
          padding: 15px;
          background-color: #f9f9f9;
        }
        
        .supplier-field {
          display: grid;
          grid-template-columns: 150px 1fr;
          gap: 10px;
          font-size: 12px;
          margin-bottom: 8px;
        }
        
        .supplier-field:last-child {
          margin-bottom: 0;
        }
        
        .supplier-label {
          font-weight: bold;
          color: #333;
        }
        
        .supplier-value {
          color: #555;
          word-break: break-word;
        }
        
        /* Products Table */
        .products-section {
          margin-bottom: 20px;
        }
        
        .section-title {
          background-color: #e8e8e8;
          padding: 10px 15px;
          font-weight: bold;
          font-size: 12px;
          border: 1px solid #999;
          margin-bottom: 0;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #999;
          font-size: 11px;
        }
        
        th {
          background-color: #e8e8e8;
          padding: 10px 8px;
          text-align: left;
          font-weight: bold;
          border: 1px solid #999;
          font-size: 11px;
        }
        
        td {
          padding: 10px 8px;
          border: 1px solid #999;
          text-align: left;
        }
        
        td.numeric {
          text-align: right;
        }
        
        .total-row {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        
        /* Payment Section */
        .payment-section {
          margin-bottom: 20px;
        }
        
        .payment-grid {
          border: 1px solid #999;
          background-color: #f9f9f9;
        }
        
        .payment-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border-bottom: 1px solid #999;
        }
        
        .payment-row:last-child {
          border-bottom: none;
        }
        
        .payment-cell {
          padding: 10px 8px;
          font-size: 11px;
          border-right: 1px solid #999;
        }
        
        .payment-cell:last-child {
          border-right: none;
        }
        
        .payment-cell-label {
          font-weight: bold;
          background-color: #e8e8e8;
          padding: 8px;
          font-size: 11px;
        }
        
        /* Totals */
        .totals-section {
          margin-bottom: 20px;
          text-align: right;
          padding: 15px;
          background-color: #f9f9f9;
          border: 1px solid #999;
        }
        
        .total-line {
          font-size: 12px;
          margin-bottom: 8px;
        }
        
        .total-line.grand-total {
          font-size: 14px;
          font-weight: bold;
          border-top: 2px solid #333;
          padding-top: 8px;
          margin-top: 8px;
        }
        
        /* Observations */
        .observations-section {
          margin-bottom: 20px;
        }
        
        .observations-content {
          border: 1px solid #999;
          padding: 15px;
          background-color: #f9f9f9;
          font-size: 11px;
          min-height: 60px;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        
        /* Footer */
        .footer {
          text-align: center;
          font-size: 10px;
          color: #666;
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ccc;
        }
        
        @media print {
          body {
            padding: 0;
            margin: 0;
          }
          
          .container {
            box-shadow: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div style="display: flex; gap: 15px; flex: 1;">
            <div class="company-logo"><img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663282117022/TvykGNFMVvGDkChn.png" alt="Logo Hectares" /></div>
            <div class="company-details">
              <div class="company-name">Associação Hectares</div>
              <div class="company-meta">
                <div>CNPJ: 31.442.983/0001-40</div>
                <div>Alameda Hectares, 1015 (CONDOMINIO) - Hectares Park e Resort</div>
                <div>Dourados/MS - CEP: 79824-530</div>
              </div>
            </div>
          </div>
          <div class="company-contact">
            <strong>(67)99834-3147 - (67)99834-3147</strong>
            <div>compras@hectaresdourados.com.br</div>
          </div>
        </div>
        
        <!-- Order Title -->
        <div class="order-title">
          <span class="order-number">PEDIDO DE COMPRA Nº ${order.orderNumber}</span>
          <span class="order-date">${formatDate(order.createdAt)}</span>
        </div>
        
        <!-- Supplier Info -->
        <div class="supplier-section">
          <div class="supplier-grid">
            <div>
              <div class="supplier-field">
                <span class="supplier-label">Razão social:</span>
                <span class="supplier-value">${order.supplierName || 'N/A'}</span>
              </div>
              <div class="supplier-field">
                <span class="supplier-label">CNPJ/CPF:</span>
                <span class="supplier-value">${order.supplierCNPJ || 'N/A'}</span>
              </div>
              <div class="supplier-field">
                <span class="supplier-label">CEP:</span>
                <span class="supplier-value">${order.supplierCEP || 'N/A'}</span>
              </div>
              <div class="supplier-field">
                <span class="supplier-label">Telefone:</span>
                <span class="supplier-value">${order.supplierPhone || 'N/A'}</span>
              </div>
            </div>
            <div>
              <div class="supplier-field">
                <span class="supplier-label">Nome fantasia:</span>
                <span class="supplier-value">${order.supplierName || 'N/A'}</span>
              </div>
              <div class="supplier-field">
                <span class="supplier-label">Endereço:</span>
                <span class="supplier-value">${order.supplierAddress || 'N/A'}</span>
              </div>
              <div class="supplier-field">
                <span class="supplier-label">Cidade/UF:</span>
                <span class="supplier-value">${order.supplierCity || 'N/A'}/${order.supplierState || 'N/A'}</span>
              </div>
              <div class="supplier-field">
                <span class="supplier-label">E-mail:</span>
                <span class="supplier-value">${order.supplierEmail || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Products Table -->
        <div class="products-section">
          <div class="section-title">PRODUTOS</div>
          <table>
            <thead>
              <tr>
                <th style="width: 5%;">ITEM</th>
                <th style="width: 55%;">NOME</th>
                <th style="width: 10%;">UND.</th>
                <th style="width: 10%;">QTD.</th>
                <th style="width: 10%;">VR. UNIT.</th>
                <th style="width: 10%;">SUBTOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map((item, index) => `
                <tr>
                  <td class="numeric">${index + 1}</td>
                  <td>${item.productName || 'N/A'}</td>
                  <td class="numeric">UN</td>
                  <td class="numeric">${item.quantity.toFixed(2)}</td>
                  <td class="numeric">${formatCurrency(item.unitValue)}</td>
                  <td class="numeric">${formatCurrency(item.subtotal)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3" style="text-align: right; font-weight: bold;">TOTAL DOS PRODUTOS</td>
                <td class="numeric">${(order.items || []).reduce((sum, item) => sum + item.quantity, 0).toFixed(2)}</td>
                <td></td>
                <td class="numeric">${formatCurrency(itemsTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Payment Data -->
        <div class="payment-section">
          <div class="section-title">DADOS DO PAGAMENTO</div>
          <div class="payment-grid">
            <div class="payment-row">
              <div class="payment-cell-label">VENCIMENTO</div>
              <div class="payment-cell-label">VALOR DA PARCELA</div>
              <div class="payment-cell-label">FORMA DE PAGAMENTO</div>
              <div class="payment-cell-label">OBSERVAÇÃO</div>
            </div>
            ${installmentRows}
          </div>
        </div>
        
        <!-- Totals -->
        <div class="totals-section">
          <div class="total-line">VALOR DOS PRODUTOS: ${formatCurrency(itemsTotal)}</div>
          <div class="total-line">VALOR DO FRETE: ${formatCurrency(order.freightValue || 0)}</div>
          <div class="total-line grand-total">TOTAL DA COMPRA: ${formatCurrency(totalValue)}</div>
        </div>
        
        <!-- Observations -->
        <div class="observations-section">
          <div class="section-title">OBSERVAÇÕES</div>
          <div class="observations-content">${order.observations || 'Nenhuma observação'}</div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

export function PurchaseOrderPrint({ order }: PurchaseOrderPrintProps) {
  const handlePrint = () => {
    const html = generatePurchaseOrderPrint(order);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div>
      <button onClick={handlePrint} className="print-button">
        Imprimir
      </button>
    </div>
  );
}
