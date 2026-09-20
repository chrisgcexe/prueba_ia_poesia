import os
import re

for root, _, files in os.walk('.'):
    if 'node_modules' in root or '.gemini' in root: continue
    for file in files:
        if file.endswith('.js'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                for i, line in enumerate(content.split('\n')):
                    if 'import' in line and 'from' in line:
                        if not re.search(r'from\s+[\'\"].*?[\'\"]', line):
                            print(f'Invalid import in {filepath}:{i+1}: {line}')
