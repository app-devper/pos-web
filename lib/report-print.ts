import type { Branch, Customer, Order, OrderDetail, PharmacyReportItem, PharmacyReportResponse, Product, ProductHistory, Receive, Setting } from "@/types/pos";
import { getOrderPayments, getPaymentSummary } from "@/lib/payment-summary";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "สำเร็จ",
  COMPLETED: "สำเร็จ",
  VOIDED: "ยกเลิก",
  CANCELLED: "ยกเลิก",
};

const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  General: "ทั่วไป",
  Wholesaler: "ขายส่ง",
  Regular: "สมาชิก",
};

const currency = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

function buildDocument(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; background: #fff; }
  .page { padding: 24px; }
  .header { margin-bottom: 20px; }
  .title { font-size: 24px; font-weight: 700; margin: 0; }
  .subtitle { font-size: 12px; color: #6b7280; margin-top: 6px; }
  .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 18px 0; }
  .meta-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
  .meta-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
  .meta-value { font-size: 16px; font-weight: 700; }
  .section { margin-top: 18px; }
  .section-title { font-size: 14px; font-weight: 700; margin: 0 0 10px; }
  .note { font-size: 12px; color: #6b7280; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #e5e7eb; padding: 8px 10px; vertical-align: top; font-size: 12px; }
  th { background: #f9fafb; text-align: left; font-weight: 700; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .muted { color: #6b7280; }
  .strong { font-weight: 700; }
  .totals { margin-top: 16px; margin-left: auto; width: 320px; }
  .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
  .totals-row.total { font-size: 16px; font-weight: 700; }
  @media print {
    @page { size: A4; margin: 12mm; }
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page { padding: 0; }
  }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

export function openPrintDocument(title: string, body: string) {
  const html = buildDocument(title, body);
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
  if (!printWindow) throw new Error("PRINT_WINDOW_BLOCKED");
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
}

function renderHeader(title: string, setting?: Setting, subtitle?: string) {
  return `
    <div class="header">
      <h1 class="title">${escapeHtml(title)}</h1>
      <div class="subtitle">
        <div>${escapeHtml(setting?.companyName || "POS Report")}</div>
        ${setting?.companyAddress ? `<div>${escapeHtml(setting.companyAddress)}</div>` : ""}
        ${setting?.companyPhone ? `<div>โทร ${escapeHtml(setting.companyPhone)}</div>` : ""}
        ${subtitle ? `<div>${escapeHtml(subtitle)}</div>` : ""}
      </div>
    </div>
  `;
}

export function printSalesReport(params: {
  startDate: string;
  endDate: string;
  orders: Order[];
  setting?: Setting;
  branches?: Branch[];
}) {
  const { startDate, endDate, orders, setting, branches = [] } = params;
  const validOrders = orders.filter((order) => order.status !== "VOIDED" && order.status !== "CANCELLED");
  const totalSales = validOrders.reduce((sum, order) => sum + (order.total ?? 0), 0);
  const totalCost = validOrders.reduce((sum, order) => sum + (order.totalCost ?? 0), 0);
  const branchMap = new Map(branches.map((branch) => [branch.id, branch.name]));

  const body = `
    <div class="page">
      ${renderHeader("รายงานการขาย", setting, `ช่วงวันที่ ${fmtDate(startDate)} - ${fmtDate(endDate)}`)}
      <div class="meta">
        <div class="meta-card"><div class="meta-label">จำนวนออเดอร์</div><div class="meta-value">${validOrders.length}</div></div>
        <div class="meta-card"><div class="meta-label">ยอดขายรวม</div><div class="meta-value">฿${currency.format(totalSales)}</div></div>
      </div>
      <div class="section">
        <h2 class="section-title">รายการขาย</h2>
        <table>
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>วันที่</th>
              <th>สาขา</th>
              <th>ลูกค้า</th>
              <th>สถานะ</th>
              <th class="text-right">ยอดขาย</th>
            </tr>
          </thead>
          <tbody>
            ${orders.length === 0 ? `<tr><td colspan="6" class="text-center muted">ไม่พบข้อมูล</td></tr>` : orders.map((order) => `
              <tr>
                <td>${escapeHtml(order.code || order.id)}</td>
                <td>${escapeHtml(fmtDateTime(order.createdDate))}</td>
                <td>${escapeHtml(branchMap.get(order.branchId) || "-")}</td>
                <td>${escapeHtml(order.customerName || order.customerCode || "-")}</td>
                <td>${escapeHtml(STATUS_LABEL[order.status] || order.status)}</td>
                <td class="text-right">฿${currency.format(order.total ?? 0)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="totals">
        <div class="totals-row"><span>ต้นทุนรวม</span><span>฿${currency.format(totalCost)}</span></div>
        <div class="totals-row total"><span>ยอดขายสุทธิ</span><span>฿${currency.format(totalSales)}</span></div>
      </div>
    </div>
  `;

  openPrintDocument("sales-report", body);
}

export function printCustomerHistoryReport(params: {
  customerCode: string;
  customer?: Customer | null;
  orders: Array<Order | OrderDetail>;
  setting?: Setting;
}) {
  const { customerCode, customer, orders, setting } = params;
  const total = orders
    .filter((order) => order.status !== "VOIDED" && order.status !== "CANCELLED")
    .reduce((sum, order) => sum + (order.total ?? 0), 0);

  const body = `
    <div class="page">
      ${renderHeader("ประวัติลูกค้า", setting, `รหัสลูกค้า ${customerCode}`)}
      <div class="meta">
        <div class="meta-card"><div class="meta-label">ชื่อลูกค้า</div><div class="meta-value">${escapeHtml(customer?.name || "-")}</div></div>
        <div class="meta-card"><div class="meta-label">ประเภทลูกค้า</div><div class="meta-value">${escapeHtml(CUSTOMER_TYPE_LABEL[customer?.customerType ?? ""] || customer?.customerType || "-")}</div></div>
        <div class="meta-card"><div class="meta-label">เบอร์โทร</div><div class="meta-value">${escapeHtml(customer?.phone || "-")}</div></div>
        <div class="meta-card"><div class="meta-label">ยอดซื้อรวม</div><div class="meta-value">฿${currency.format(total)}</div></div>
      </div>
      <div class="section">
        <h2 class="section-title">ประวัติการสั่งซื้อ</h2>
        <table>
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>วันที่</th>
              <th>สถานะ</th>
              <th>ช่องทางชำระ</th>
              <th class="text-right">ยอดรวม</th>
            </tr>
          </thead>
          <tbody>
            ${orders.length === 0 ? `<tr><td colspan="5" class="text-center muted">ไม่พบข้อมูล</td></tr>` : orders.map((order) => `
              <tr>
                <td>${escapeHtml(order.code || order.id)}</td>
                <td>${escapeHtml(fmtDateTime(order.createdDate))}</td>
                <td>${escapeHtml(STATUS_LABEL[order.status] || order.status)}</td>
                <td>${escapeHtml(getPaymentSummary(order, (amount) => `฿${currency.format(amount)}`))}</td>
                <td class="text-right">฿${currency.format(order.total ?? 0)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  openPrintDocument("customer-history", body);
}

export function printReceiptDocument(params: {
  title: string;
  order: OrderDetail;
  setting?: Setting;
  branch?: Branch;
  showTaxId?: boolean;
}) {
  const { title, order, setting, branch, showTaxId = false } = params;
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = order.items.reduce((sum, item) => sum + (item.discount ?? 0), 0) + (order.discount ?? 0);
  const payments = getOrderPayments(order);
  const paymentSummary = getPaymentSummary(order, (amount) => `฿${currency.format(amount)}`);
  const receivedAmount = payments.length > 0
    ? payments.reduce((sum, payment) => sum + (payment.amount ?? 0), 0)
    : order.payment?.amount ?? order.total;
  const changeAmount = payments.length > 0
    ? payments[payments.length - 1]?.change ?? 0
    : order.payment?.change ?? 0;

  const body = `
    <div class="page">
      ${renderHeader(title, setting, branch?.name ? `สาขา ${branch.name}` : undefined)}
      <div class="meta">
        <div class="meta-card"><div class="meta-label">เลขที่เอกสาร</div><div class="meta-value">${escapeHtml(order.code || order.id)}</div></div>
        <div class="meta-card"><div class="meta-label">วันที่</div><div class="meta-value">${escapeHtml(fmtDateTime(order.createdDate))}</div></div>
        <div class="meta-card"><div class="meta-label">ลูกค้า</div><div class="meta-value">${escapeHtml(order.customerName || order.customerCode || "ลูกค้าทั่วไป")}</div></div>
        <div class="meta-card"><div class="meta-label">ชำระเงิน</div><div class="meta-value">${escapeHtml(paymentSummary)}</div></div>
      </div>
      ${showTaxId && setting?.companyTaxId ? `<div class="note">เลขประจำตัวผู้เสียภาษี: ${escapeHtml(setting.companyTaxId)}</div>` : ""}
      <div class="section">
        <h2 class="section-title">รายการสินค้า</h2>
        <table>
          <thead>
            <tr>
              <th>สินค้า</th>
              <th class="text-right">จำนวน</th>
              <th class="text-right">ราคา</th>
              <th class="text-right">ส่วนลด</th>
              <th class="text-right">รวม</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map((item) => `
              <tr>
                <td>${escapeHtml(item.product?.name || item.productId)}</td>
                <td class="text-right">${escapeHtml(item.quantity)}</td>
                <td class="text-right">฿${currency.format(item.price ?? 0)}</td>
                <td class="text-right">฿${currency.format(item.discount ?? 0)}</td>
                <td class="text-right">฿${currency.format(item.quantity * item.price - (item.discount ?? 0))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="totals">
        <div class="totals-row"><span>ยอดก่อนส่วนลด</span><span>฿${currency.format(subtotal)}</span></div>
        <div class="totals-row"><span>ส่วนลด</span><span>฿${currency.format(discount)}</span></div>
        <div class="totals-row"><span>รับชำระ</span><span>฿${currency.format(receivedAmount)}</span></div>
        <div class="totals-row"><span>เงินทอน</span><span>฿${currency.format(changeAmount)}</span></div>
        <div class="totals-row total"><span>ยอดสุทธิ</span><span>฿${currency.format(order.total ?? 0)}</span></div>
      </div>
      ${setting?.receiptFooter ? `<div class="section note">${escapeHtml(setting.receiptFooter)}</div>` : ""}
    </div>
  `;

  openPrintDocument(title, body);
}

export function printReceivesSummaryReport(params: {
  startDate: string;
  endDate: string;
  receives: Receive[];
  setting?: Setting;
}) {
  const { startDate, endDate, receives, setting } = params;
  const totalCost = receives.reduce((sum, receive) => sum + (receive.totalCost ?? 0), 0);
  const totalItems = receives.reduce((sum, receive) => sum + (receive.items?.reduce((itemSum, item) => itemSum + (item.quantity ?? 0), 0) ?? 0), 0);

  const body = `
    <div class="page">
      ${renderHeader("สรุปรายงานรับสินค้า", setting, `ช่วงวันที่ ${fmtDate(startDate)} - ${fmtDate(endDate)}`)}
      <div class="meta">
        <div class="meta-card"><div class="meta-label">จำนวนใบรับสินค้า</div><div class="meta-value">${receives.length}</div></div>
        <div class="meta-card"><div class="meta-label">จำนวนชิ้นรวม</div><div class="meta-value">${totalItems}</div></div>
        <div class="meta-card"><div class="meta-label">มูลค่ารวม</div><div class="meta-value">฿${currency.format(totalCost)}</div></div>
      </div>
      <div class="section">
        <h2 class="section-title">รายการรับสินค้า</h2>
        <table>
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>วันที่</th>
              <th>อ้างอิง</th>
              <th>สถานะ</th>
              <th class="text-right">จำนวนรายการ</th>
              <th class="text-right">ต้นทุนรวม</th>
            </tr>
          </thead>
          <tbody>
            ${receives.length === 0 ? `<tr><td colspan="6" class="text-center muted">ไม่พบข้อมูล</td></tr>` : receives.map((receive) => `
              <tr>
                <td>${escapeHtml(receive.code || receive.id)}</td>
                <td>${escapeHtml(fmtDateTime(receive.createdDate))}</td>
                <td>${escapeHtml(receive.reference || "-")}</td>
                <td>${escapeHtml(receive.status || "-")}</td>
                <td class="text-right">${receive.items?.length ?? 0}</td>
                <td class="text-right">฿${currency.format(receive.totalCost ?? 0)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  openPrintDocument("receives-summary", body);
}

export function printProductHistoryReport(params: {
  product: Product;
  histories: ProductHistory[];
  setting?: Setting;
}) {
  const { product, histories, setting } = params;
  const body = `
    <div class="page">
      ${renderHeader("ประวัติสินค้า", setting, `${product.name} (${product.serialNumber || "-"})`)}
      <div class="meta">
        <div class="meta-card"><div class="meta-label">สินค้า</div><div class="meta-value">${escapeHtml(product.name)}</div></div>
        <div class="meta-card"><div class="meta-label">รหัส</div><div class="meta-value">${escapeHtml(product.serialNumber || "-")}</div></div>
        <div class="meta-card"><div class="meta-label">ราคาขาย</div><div class="meta-value">฿${currency.format(product.price ?? 0)}</div></div>
        <div class="meta-card"><div class="meta-label">คงเหลือ</div><div class="meta-value">${escapeHtml(product.quantity ?? "-")}</div></div>
      </div>
      <div class="section">
        <h2 class="section-title">ความเคลื่อนไหว</h2>
        <table>
          <thead>
            <tr>
              <th>วันที่</th>
              <th>ประเภท</th>
              <th>รายละเอียด</th>
              <th class="text-right">เข้า</th>
              <th class="text-right">ออก</th>
              <th class="text-right">คงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            ${histories.length === 0 ? `<tr><td colspan="6" class="text-center muted">ไม่พบข้อมูล</td></tr>` : histories.map((item) => `
              <tr>
                <td>${escapeHtml(fmtDateTime(item.createdDate))}</td>
                <td>${escapeHtml(item.type || "-")}</td>
                <td>${escapeHtml(item.description || "-")}</td>
                <td class="text-right">${item.import && item.import > 0 ? escapeHtml(item.quantity) : "-"}</td>
                <td class="text-right">${item.import === 0 ? escapeHtml(item.quantity) : "-"}</td>
                <td class="text-right">${escapeHtml(item.balance)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  openPrintDocument("product-history", body);
}

export function printPriceListReport(params: {
  products: Product[];
  setting?: Setting;
}) {
  const { products, setting } = params;
  const body = `
    <div class="page">
      ${renderHeader("รายการราคา", setting, `จำนวนสินค้า ${products.length} รายการ`)}
      <div class="section">
        <table>
          <thead>
            <tr>
              <th>รหัส</th>
              <th>สินค้า</th>
              <th>หน่วย</th>
              <th class="text-right">ต้นทุน</th>
              <th class="text-right">ราคาขาย</th>
            </tr>
          </thead>
          <tbody>
            ${products.length === 0 ? `<tr><td colspan="5" class="text-center muted">ไม่พบข้อมูล</td></tr>` : products.map((product) => `
              <tr>
                <td>${escapeHtml(product.serialNumber || "-")}</td>
                <td>${escapeHtml(product.name)}</td>
                <td>${escapeHtml(product.unit || "-")}</td>
                <td class="text-right">฿${currency.format(product.costPrice ?? 0)}</td>
                <td class="text-right">฿${currency.format(product.price ?? 0)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  openPrintDocument("price-list", body);
}

export function printPriceTagsReport(params: {
  products: Product[];
  setting?: Setting;
}) {
  const { products, setting } = params;
  const body = `
    <div class="page">
      ${renderHeader("ป้ายราคา", setting, `จำนวนสินค้า ${products.length} รายการ`)}
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;">
        ${products.map((product) => `
          <div style="border:1px solid #e5e7eb;border-radius:14px;padding:14px;min-height:140px;display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="font-size:11px;color:#6b7280;">${escapeHtml(product.serialNumber || "-")}</div>
              <div style="font-size:15px;font-weight:700;line-height:1.4;margin-top:6px;">${escapeHtml(product.name)}</div>
            </div>
            <div style="display:flex;align-items:end;justify-content:space-between;gap:8px;">
              <div style="font-size:11px;color:#6b7280;">${escapeHtml(product.unit || "-")}</div>
              <div style="font-size:22px;font-weight:700;">฿${currency.format(product.price ?? 0)}</div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  openPrintDocument("price-tags", body);
}

export function printPharmacyReport(params: {
  report: PharmacyReportResponse;
  setting?: Setting;
}) {
  const { report, setting } = params;
  const isPurchase = report.key === "khy9";

  const KHY_TITLE: Record<string, string> = {
    khy9: "ข.ย.9 บัญชีการซื้อยา",
    khy10: "ข.ย.10 บัญชีการขายยาควบคุมพิเศษ",
    khy11: "ข.ย.11 บัญชีการขายยาอันตราย",
    khy12: "ข.ย.12 บัญชีการขายยาตามใบสั่งของผู้ประกอบวิชาชีพ",
    khy13: "ข.ย.13 รายงานการขายยาตามที่เลขาธิการ อย. กำหนด",
  };
  const formTitle = KHY_TITLE[report.key] || report.title;

  const totalQty = report.items.reduce((s, i) => s + i.quantity, 0);
  const totalCost = isPurchase ? report.items.reduce((s, i) => s + (i.costPrice ?? 0), 0) : 0;

  const purchaseHead = `
    <tr>
      <th class="text-center" style="width:36px">ลำดับ</th>
      <th>วันที่ซื้อ</th>
      <th>เลขที่ใบรับ</th>
      <th>ชื่อยา</th>
      <th>ชื่อสามัญ</th>
      <th>ความแรง</th>
      <th>ล็อต</th>
      <th>วันหมดอายุ</th>
      <th class="text-right">จำนวน</th>
      <th>หน่วย</th>
      <th class="text-right">ต้นทุน</th>
      <th>ผู้จำหน่าย</th>
    </tr>`;

  const dispensingHead = `
    <tr>
      <th class="text-center" style="width:36px">ลำดับ</th>
      <th>วันที่ขาย</th>
      <th>ชื่อยา</th>
      <th>ชื่อสามัญ</th>
      <th>ความแรง</th>
      <th>รูปแบบยา</th>
      <th class="text-right">จำนวน</th>
      <th>หน่วย</th>
      <th>วิธีใช้</th>
      <th>เภสัชกรผู้จ่ายยา</th>
      <th>เลขใบอนุญาต</th>
    </tr>`;

  const colCount = isPurchase ? 12 : 11;

  const purchaseRow = (item: PharmacyReportItem, idx: number) => `
    <tr>
      <td class="text-center">${idx + 1}</td>
      <td>${escapeHtml(fmtDate(item.date))}</td>
      <td>${escapeHtml(item.code || "-")}</td>
      <td>${escapeHtml(item.productName)}</td>
      <td>${escapeHtml(item.genericName || "-")}</td>
      <td>${escapeHtml(item.strength || "-")}</td>
      <td>${escapeHtml(item.lotNumber || "-")}</td>
      <td>${escapeHtml(item.expireDate ? fmtDate(item.expireDate) : "-")}</td>
      <td class="text-right">${escapeHtml(item.quantity)}</td>
      <td>${escapeHtml(item.unit || "-")}</td>
      <td class="text-right">฿${currency.format(item.costPrice ?? 0)}</td>
      <td>${escapeHtml(item.supplierName || "-")}</td>
    </tr>`;

  const dispensingRow = (item: PharmacyReportItem, idx: number) => `
    <tr>
      <td class="text-center">${idx + 1}</td>
      <td>${escapeHtml(fmtDate(item.date))}</td>
      <td>${escapeHtml(item.productName)}</td>
      <td>${escapeHtml(item.genericName || "-")}</td>
      <td>${escapeHtml(item.strength || "-")}</td>
      <td>${escapeHtml(item.dosageForm || "-")}</td>
      <td class="text-right">${escapeHtml(item.quantity)}</td>
      <td>${escapeHtml(item.unit || "-")}</td>
      <td>${escapeHtml(item.dosage || "-")}</td>
      <td>${escapeHtml(item.pharmacistName || "-")}</td>
      <td>${escapeHtml(item.licenseNo || "-")}</td>
    </tr>`;

  const body = `
    <div class="page">
      ${renderHeader(formTitle, setting, `ช่วงวันที่ ${fmtDate(report.startDate)} - ${fmtDate(report.endDate)}`)}
      <div class="meta">
        <div class="meta-card"><div class="meta-label">แบบฟอร์ม</div><div class="meta-value">${escapeHtml(formTitle)}</div></div>
        <div class="meta-card"><div class="meta-label">จำนวนรายการ</div><div class="meta-value">${report.items.length} รายการ</div></div>
        ${isPurchase ? `<div class="meta-card"><div class="meta-label">มูลค่ารวม</div><div class="meta-value">฿${currency.format(totalCost)}</div></div>` : ""}
        <div class="meta-card"><div class="meta-label">จำนวนรวม</div><div class="meta-value">${totalQty}</div></div>
      </div>
      <div class="section">
        <table>
          <thead>${isPurchase ? purchaseHead : dispensingHead}</thead>
          <tbody>
            ${report.items.length === 0
              ? `<tr><td colspan="${colCount}" class="text-center muted">ไม่พบข้อมูล</td></tr>`
              : report.items.map((item, idx) => isPurchase ? purchaseRow(item, idx) : dispensingRow(item, idx)).join("")}
          </tbody>
        </table>
      </div>
      ${isPurchase ? `
        <div class="totals">
          <div class="totals-row"><span>จำนวนรายการ</span><span>${report.items.length}</span></div>
          <div class="totals-row"><span>จำนวนรวม</span><span>${totalQty}</span></div>
          <div class="totals-row total"><span>มูลค่าต้นทุนรวม</span><span>฿${currency.format(totalCost)}</span></div>
        </div>
      ` : `
        <div class="totals">
          <div class="totals-row"><span>จำนวนรายการ</span><span>${report.items.length}</span></div>
          <div class="totals-row total"><span>จำนวนรวม</span><span>${totalQty}</span></div>
        </div>
      `}
      <div style="margin-top:48px;display:flex;justify-content:space-between;gap:32px;">
        <div style="text-align:center;flex:1;">
          <div style="border-top:1px solid #d1d5db;padding-top:8px;font-size:12px;">ผู้จัดทำรายงาน</div>
          <div style="font-size:11px;color:#6b7280;margin-top:4px;">วันที่ ............/............/............</div>
        </div>
        <div style="text-align:center;flex:1;">
          <div style="border-top:1px solid #d1d5db;padding-top:8px;font-size:12px;">เภสัชกรผู้มีหน้าที่ปฏิบัติการ</div>
          <div style="font-size:11px;color:#6b7280;margin-top:4px;">วันที่ ............/............/............</div>
        </div>
      </div>
    </div>
  `;

  openPrintDocument(report.key, body);
}
