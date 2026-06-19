import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup

url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
response = requests.get(url)
root = ET.fromstring(response.content)

# Atom namespace
ns = {"atom": "http://www.w3.org/2005/Atom"}

print("Parsing entries:")
for i, entry in enumerate(root.findall("atom:entry", ns)[:3]):
    title = entry.find("atom:title", ns).text
    updated = entry.find("atom:updated", ns).text
    content_elem = entry.find("atom:content", ns)
    content_html = content_elem.text if content_elem is not None else ""
    
    print(f"\n--- Entry {i+1} ---")
    print(f"Title (Date): {title}")
    print(f"Updated: {updated}")
    
    # Parse HTML content
    soup = BeautifulSoup(content_html, "html.parser")
    
    # Let's inspect headings and their following content
    current_type = None
    current_content = []
    
    for child in soup.children:
        if child.name in ["h3", "h4"]:
            if current_type:
                print(f"  [{current_type}]: {' '.join(current_content)[:100]}...")
            current_type = child.get_text().strip()
            current_content = []
        elif child.name is not None:
            current_content.append(child.get_text().strip())
            
    if current_type:
        print(f"  [{current_type}]: {' '.join(current_content)[:100]}...")
    else:
        # Fallback if no headings
        print(f"  [No Headings]: {soup.get_text().strip()[:200]}...")
