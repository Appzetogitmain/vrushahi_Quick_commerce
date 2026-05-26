const fs = require('fs');
const path = require('path');

const dir = 'c:/Appzeto/vrushahi_Quick_commerce/frontend/src/modules/admin/pages';
const filesToUpdate = [
  'AdminAllOrders.tsx',
  'AdminPendingOrders.tsx',
  'AdminReceivedOrders.tsx',
  'AdminProcessedOrders.tsx',
  'AdminShippedOrders.tsx',
  'AdminOutForDeliveryOrders.tsx',
  'AdminDeliveredOrders.tsx',
  'AdminCancelledOrders.tsx'
];

for (const file of filesToUpdate) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Remove "D. Date", from headers array
  content = content.replace(/'D\. Date',\s*/g, '');
  content = content.replace(/"D\. Date",\s*/g, '');

  // 2. Remove order.estimatedDeliveryDate from csvContent mapping
  // order.estimatedDeliveryDate || "",\n
  // or
  // order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString() : '',
  content = content.replace(/order\.estimatedDeliveryDate\s*\|\|\s*""\s*,\s*\n?/g, '');
  content = content.replace(/order\.estimatedDeliveryDate\s*\?\s*new\s*Date\(order\.estimatedDeliveryDate\)\.toLocaleDateString\(\)\s*:\s*''\s*,\s*\n?/g, '');

  // 3. Remove 'deliveryDate' from SortField type
  content = content.replace(/'deliveryDate'\s*\|\s*/g, '');
  
  // 4. Remove case 'deliveryDate' switch block in useMemo sorting
  const sortCaseRegex = /case\s+'deliveryDate':[\s\S]*?break;/g;
  content = content.replace(sortCaseRegex, '');

  // 5. Remove <th> for D. Date
  const thRegex = /<th[^>]*onClick=\{\(\)\s*=>\s*handleSort\((['"])deliveryDate\1\)\}[^>]*>[\s\S]*?<\/th>/g;
  content = content.replace(thRegex, '');

  // 6. Remove <td> for estimatedDeliveryDate in tbody
  //   <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600">
  //     {order.estimatedDeliveryDate
  //       ? new Date(
  //           order.estimatedDeliveryDate
  //         ).toLocaleDateString()
  //       : "-"}
  const tdRegex = /<td[^>]*>\s*\{order\.estimatedDeliveryDate[\s\S]*?<\/td>/g;
  content = content.replace(tdRegex, '');

  // Also adjust colSpan for Loading/Error rows from 9 to 8
  content = content.replace(/colSpan=\{9\}/g, 'colSpan={8}');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.log(`No changes made to ${file}`);
  }
}
