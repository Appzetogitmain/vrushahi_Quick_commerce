import os
import re

dir_path = r'c:\Appzeto\vrushahi_Quick_commerce\frontend\src\modules\admin\pages'
files = [f for f in os.listdir(dir_path) if f.startswith('Admin') and f.endswith('Orders.tsx') and f != 'AdminAllOrders.tsx']

for file in files:
    filepath = os.path.join(dir_path, file)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Add paginationData state
    if 'paginationData' not in content:
        content = re.sub(
            r'(const \[error, setError\] = useState<string \| null>\(null\);)',
            r'\1\n  const [paginationData, setPaginationData] = useState({ total: 0, pages: 1 });',
            content
        )
    
    # 2. Update fetch logic
    fetch_pattern = r'(const response = await [a-zA-Z]+\(.*?\);\s*if \(response\.success\) \{\s*setOrders\(response\.data\);\s*\})'
    
    def repl_fetch(match):
        original = match.group(1)
        original = original.rsplit('}', 1)[0]
        return original + '''
          if ((response as any).pagination) {
            setPaginationData((response as any).pagination);
          } else {
            setPaginationData({ total: response.data.length, pages: 1 });
          }
        }'''
    
    content = re.sub(fetch_pattern, repl_fetch, content)
    
    # 3. Update pagination variables
    pagination_pattern = r'const totalPages = Math\.ceil\([\s\S]*?const paginatedOrders = filteredAndSortedOrders\.slice\(startIndex, endIndex\);'
    pagination_repl = r'''const totalPages = paginationData.pages || 1;
  const startIndex = (currentPage - 1) * parseInt(entriesPerPage);
  const endIndex = Math.min(startIndex + parseInt(entriesPerPage), paginationData.total);
  const paginatedOrders = filteredAndSortedOrders;'''
    content = re.sub(pagination_pattern, pagination_repl, content)
    
    # 4. Update footer
    footer_pattern = r'Showing\{" "\}\s*\{filteredAndSortedOrders\.length === 0 \? 0 : startIndex \+ 1\} to\{" "\}\s*\{Math\.min\(endIndex, filteredAndSortedOrders\.length\)\} of\{" "\}\s*\{filteredAndSortedOrders\.length\} entries'
    footer_repl = r'''Showing{" "}
              {paginationData.total === 0 ? 0 : startIndex + 1} to{" "}
              {endIndex} of{" "}
              {paginationData.total} entries'''
    content = re.sub(footer_pattern, footer_repl, content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed', file)
