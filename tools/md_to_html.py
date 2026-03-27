"""Convert species MD files to HTML tab content for Livada Dashboard."""
import re
import sys
import os

def md_to_html(md_text, tab_id):
    """Convert markdown content to dashboard HTML."""
    lines = md_text.split('\n')
    html_parts = []
    in_section = False
    in_table = False
    in_list = False
    in_ol = False
    table_rows = []
    list_items = []
    current_section_body = []

    def flush_list():
        nonlocal in_list, in_ol, list_items
        if list_items:
            tag = 'ol' if in_ol else 'ul'
            items = ''.join(f'  <li>{format_inline(item)}</li>\n' for item in list_items)
            current_section_body.append(f'<{tag}>\n{items}</{tag}>\n')
            list_items = []
            in_list = False
            in_ol = False

    def flush_table():
        nonlocal in_table, table_rows
        if table_rows:
            html = '<div class="table-wrap"><table>\n'
            for i, row in enumerate(table_rows):
                cells = [c.strip() for c in row.split('|')[1:-1]]
                if i == 0:
                    html += '<tr>' + ''.join(f'<th>{format_inline(c)}</th>' for c in cells) + '</tr>\n'
                elif i == 1:
                    continue  # separator row
                else:
                    html += '<tr>' + ''.join(f'<td>{format_inline(c)}</td>' for c in cells) + '</tr>\n'
            html += '</table></div>\n'
            current_section_body.append(html)
            table_rows = []
            in_table = False

    def close_section():
        nonlocal in_section
        flush_list()
        flush_table()
        if in_section and current_section_body:
            html_parts.append(''.join(current_section_body))
            html_parts.append('</div>\n</div>\n\n')
            current_section_body.clear()
            in_section = False

    def format_inline(text):
        """Convert inline markdown to HTML."""
        # Bold
        text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
        # Italic
        text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
        # Inline code
        text = re.sub(r'`(.+?)`', r'<code>\1</code>', text)
        return text

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Skip main title (# SPECIE)
        if stripped.startswith('# ') and not stripped.startswith('## '):
            if i < 5:  # Only skip the first title
                continue

        # Section headers (## A. through ## G.)
        section_match = re.match(r'^## ([A-G])\.\s*(.*)', stripped)
        if section_match:
            close_section()
            letter = section_match.group(1)
            title = section_match.group(2)
            in_section = True
            html_parts.append(f'<div class="section">\n')
            html_parts.append(f'  <h2 class="section-title">{letter}. {format_inline(title)}</h2>\n')
            html_parts.append(f'  <div class="section-body">\n')
            continue

        # Sub-headers
        if stripped.startswith('### '):
            flush_list()
            flush_table()
            title = stripped[4:]
            current_section_body.append(f'<h3>{format_inline(title)}</h3>\n')
            continue

        if stripped.startswith('#### '):
            flush_list()
            flush_table()
            title = stripped[5:]
            current_section_body.append(f'<h4>{format_inline(title)}</h4>\n')
            continue

        # Alert boxes
        if stripped.startswith('> **') or stripped.startswith('>**'):
            flush_list()
            flush_table()
            text = stripped.lstrip('> ').strip()
            alert_type = 'info'
            lower = text.lower()
            if any(w in lower for w in ['atentie', 'atenție', 'risc', 'pericol', 'critic', 'greseal', 'greșeal', 'nu ', 'interzis', 'obligatori']):
                alert_type = 'danger'
            elif any(w in lower for w in ['important', 'sfat', 'recomand', 'tip']):
                alert_type = 'warning'
            elif any(w in lower for w in ['verdict', 'bine', 'succes', 'avantaj', 'ideal']):
                alert_type = 'success'
            current_section_body.append(f'<div class="alert alert-{alert_type}">{format_inline(text)}</div>\n')
            continue

        # Simpler alert detection for lines starting with special markers
        if stripped.startswith('⚠') or stripped.startswith('🚫') or stripped.startswith('ATENTIE') or stripped.startswith('ATENȚIE'):
            flush_list()
            flush_table()
            current_section_body.append(f'<div class="alert alert-danger">{format_inline(stripped)}</div>\n')
            continue

        if stripped.startswith('✅') or stripped.startswith('VERDICT'):
            flush_list()
            flush_table()
            current_section_body.append(f'<div class="alert alert-success">{format_inline(stripped)}</div>\n')
            continue

        # Tables
        if stripped.startswith('|') and '|' in stripped[1:]:
            flush_list()
            if stripped.replace('|', '').replace('-', '').replace(' ', '').replace(':', '') == '':
                # Separator row
                table_rows.append(stripped)
                continue
            if not in_table:
                in_table = True
            table_rows.append(stripped)
            continue
        elif in_table:
            flush_table()

        # Ordered lists
        ol_match = re.match(r'^(\d+)\.\s+(.*)', stripped)
        if ol_match:
            flush_table()
            if not in_ol:
                flush_list()
                in_ol = True
                in_list = True
            list_items.append(ol_match.group(2))
            continue

        # Unordered lists
        if stripped.startswith('- ') or stripped.startswith('* '):
            flush_table()
            if in_ol:
                flush_list()
            if not in_list:
                in_list = True
            list_items.append(stripped[2:])
            continue

        # Continuation of list item (indented)
        if (in_list or in_ol) and line.startswith('  ') and stripped:
            if list_items:
                list_items[-1] += ' ' + stripped
            continue

        # Empty line
        if not stripped:
            flush_list()
            flush_table()
            continue

        # Regular paragraph
        flush_list()
        flush_table()
        if in_section:
            current_section_body.append(f'<p>{format_inline(stripped)}</p>\n')

    close_section()

    # Add footer
    html_parts.append('<div class="section">\n')
    html_parts.append('  <p style="color:var(--text-dim);font-size:0.82rem;"><em>Consulta un specialist agronom pentru cazul tau specific. Dozele sunt orientative — citeste MEREU eticheta produsului.</em></p>\n')
    html_parts.append('</div>\n')

    return ''.join(html_parts)


def process_file(md_path, tab_id):
    """Read MD file and return HTML tab content."""
    with open(md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()
    return md_to_html(md_text, tab_id)


if __name__ == '__main__':
    content_dir = os.path.join(os.path.dirname(__file__), '..', 'content')
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'tools', 'html_output')
    os.makedirs(output_dir, exist_ok=True)

    species = {
        'Cais': 'cais',
        'Rodiu': 'rodiu',
        'Piersic': 'piersic',
        'Prun': 'prun',
        'Cires': 'cires',
        'Visin': 'visin',
    }

    for name, tab_id in species.items():
        md_path = os.path.join(content_dir, f'{name}.md')
        if os.path.exists(md_path):
            html = process_file(md_path, tab_id)
            out_path = os.path.join(output_dir, f'{tab_id}.html')
            with open(out_path, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f'OK: {name} -> {out_path} ({len(html)} bytes)')
        else:
            print(f'SKIP: {md_path} not found')
