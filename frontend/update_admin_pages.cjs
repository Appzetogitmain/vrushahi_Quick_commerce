const fs = require('fs');
const path = require('path');

const dir = 'c:/Appzeto/vrushahi_Quick_commerce/frontend/src/modules/admin/pages';
const filesToUpdate = [
  'AdminStockManagement.tsx',
  'AdminCategory.tsx',
  'AdminTaxes.tsx',
  'AdminManageSellerList.tsx',
  'AdminManageDeliveryBoy.tsx',
  'AdminFAQ.tsx',
  'AdminAllOrders.tsx',
  'AdminPendingOrders.tsx',
  'AdminReceivedOrders.tsx',
  'AdminProcessedOrders.tsx',
  'AdminShippedOrders.tsx',
  'AdminOutForDeliveryOrders.tsx',
  'AdminDeliveredOrders.tsx',
  'AdminCancelledOrders.tsx',
  'AdminReturnRequest.tsx'
];

for (const file of filesToUpdate) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Add isExportOpen state if not exists
  if (!content.includes('isExportOpen')) {
    const stateRegex = /(const \[loading,\s*setLoading\]\s*=\s*useState[^;]+;)/;
    if (stateRegex.test(content)) {
      content = content.replace(stateRegex, '$1\n  const [isExportOpen, setIsExportOpen] = useState(false);');
      modified = true;
    } else {
      // fallback for some pages that might not have loading state
      const stateRegex2 = /(const \[[a-zA-Z]+,\s*set[a-zA-Z]+\]\s*=\s*useState[^;]+;)/;
      content = content.replace(stateRegex2, '$1\n  const [isExportOpen, setIsExportOpen] = useState(false);');
      modified = true;
    }
  }

  // 2. Fix Search Query Logic
  const searchRegex1 = /if\s*\(\s*searchQuery\s*\)\s*\{\s*params\.search\s*=\s*searchQuery;\s*\}/g;
  if (searchRegex1.test(content)) {
    content = content.replace(searchRegex1, `if (searchQuery && searchQuery.trim().length >= 1) {\n          params.search = searchQuery.trim().toLowerCase();\n        }`);
    modified = true;
  } else {
    // try finding just params.search = searchQuery;
    const searchAssignment = /params\.search\s*=\s*searchQuery;/g;
    if (searchAssignment.test(content)) {
      content = content.replace(searchAssignment, `params.search = searchQuery.trim().toLowerCase();`);
      modified = true;
    }
  }

  // 3. Export Dropdown Replacement
  const exportBtnRegex = /<button\s+onClick=\{handleExport\}[^>]*>[\s\S]*?Export[\s\S]*?<\/button>/;
  if (exportBtnRegex.test(content)) {
    const replacement = `<button
                    onClick={() => setIsExportOpen(!isExportOpen)}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium transition-colors w-full sm:w-auto">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0"><path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Export
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  {isExportOpen && (
                    <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg z-10 border border-neutral-200">
                      <button
                        onClick={() => { setIsExportOpen(false); handleExport(); }}
                        className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-green-50 hover:text-green-700 rounded-md"
                      >
                        CSV
                      </button>
                    </div>
                  )}`;
    content = content.replace(exportBtnRegex, replacement);
    modified = true;
  }

  // 4. Date Range filter Replacement
  const dateInputRegex = /<input\s+type="text"\s+value=\{dateRange\}\s+onChange=\{\(e\)\s*=>\s*\{[\s\S]*?\}\}\s+className="[^"]*"\s+placeholder="MM\/DD\/YYYY - MM\/DD\/YYYY"\s*\/>/;
  if (dateInputRegex.test(content)) {
    const dateHtml = `{(() => {
                    const [from, to] = dateRange ? dateRange.split(' - ') : ['', ''];
                    return (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          type="date"
                          value={from ? (() => { const p=from.split('/'); return p.length===3 ? p[2]+'-'+p[0].padStart(2,'0')+'-'+p[1].padStart(2,'0') : '' })() : ''}
                          onChange={(e) => {
                            const d = e.target.value;
                            if(!d) { setDateRange(to ? ' - '+to : ''); } else {
                              const [y,m,day] = d.split('-');
                              setDateRange(m+'/'+day+'/'+y + ' - ' + (to || ''));
                            }
                            setCurrentPage(1);
                          }}
                          className="flex-1 sm:w-32 text-xs sm:text-sm text-neutral-600 bg-transparent focus:outline-none cursor-pointer"
                        />
                        <span className="text-neutral-400">-</span>
                        <input
                          type="date"
                          value={to ? (() => { const p=to.split('/'); return p.length===3 ? p[2]+'-'+p[0].padStart(2,'0')+'-'+p[1].padStart(2,'0') : '' })() : ''}
                          onChange={(e) => {
                            const d = e.target.value;
                            if(!d) { setDateRange(from ? from+' - ' : ''); } else {
                              const [y,m,day] = d.split('-');
                              setDateRange((from || '') + ' - ' + m+'/'+day+'/'+y);
                            }
                            setCurrentPage(1);
                          }}
                          className="flex-1 sm:w-32 text-xs sm:text-sm text-neutral-600 bg-transparent focus:outline-none cursor-pointer"
                        />
                      </div>
                    );
                  })()}`;
    content = content.replace(dateInputRegex, dateHtml);
    
    const svgRegex = /<svg\s+width="16"\s+height="16"\s+viewBox="0 0 24 24"\s+fill="none"\s+xmlns="http:\/\/www.w3.org\/2000\/svg"\s+className="text-neutral-500 flex-shrink-0">\s*<path\s+d="[^"]*"\s+stroke="currentColor"\s+strokeWidth="2"\s+strokeLinecap="round"\s+strokeLinejoin="round"\s*\/>\s*<\/svg>/;
    content = content.replace(svgRegex, '');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
