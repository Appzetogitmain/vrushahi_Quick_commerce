import os
import glob

directories = [
    r'c:\Appzeto\vrushahi_Quick_commerce\frontend\src\modules\admin\pages',
    r'c:\Appzeto\vrushahi_Quick_commerce\frontend\src\modules\seller\pages'
]

for d in directories:
    for filepath in glob.glob(os.path.join(d, '*.tsx')):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        orig_content = content
        
        # Replace the mangled template string
        mangled1 = r"const toDateStr = p.length === 3 ? ${p[2]}-- : '';"
        fixed1 = r"const toDateStr = p.length === 3 ? `${p[2]}-${p[0].padStart(2, '0')}-${p[1].padStart(2, '0')}` : '';"
        
        mangled2 = r"const fromDateStr = p.length === 3 ? ${p[2]}-- : '';"
        fixed2 = r"const fromDateStr = p.length === 3 ? `${p[2]}-${p[0].padStart(2, '0')}-${p[1].padStart(2, '0')}` : '';"
        
        content = content.replace(mangled1, fixed1)
        content = content.replace(mangled2, fixed2)

        if content != orig_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Fixed {filepath}')
