import os

BASE_DIR = r"C:\Proiecte\Livada\content\Gemini_Research"

def cleanup_file(filename):
    filepath = os.path.join(BASE_DIR, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    seen_blocks = set()
    current_block = []
    in_block = False
    
    # Simple deduplication for specific headers
    blocks_to_dedupe = [
        "### ATENTIE — VIABILITATE LA NADLAC",
        "### CLARIFICARE: \"incompatibilitatea\" Clapp-Williams",
        "### ATENTIE — IMPLICATII COMERCIALE ALE PERISABILITATII",
        "### Pozitia in fenologia livadei Roland"
    ]
    
    skip_mode = False
    for line in lines:
        matched = False
        for header in blocks_to_dedupe:
            if header in line:
                if header in seen_blocks:
                    skip_mode = True
                else:
                    seen_blocks.add(header)
                    skip_mode = False
                break
        
        # If we hit a new section or main header, stop skip mode
        if line.startswith("## ") or line.startswith("---"):
            skip_mode = False
            
        if not skip_mode:
            new_lines.append(line)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f"Cleaned {filename}")

all_files = [f for f in os.listdir(BASE_DIR) if f.endswith("_IZ.md")]
for filename in all_files:
    cleanup_file(filename)
