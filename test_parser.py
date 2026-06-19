import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import copy
import json

def parse_release_notes():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    response = requests.get(url, timeout=10)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch feed: {response.status_code}")
        
    root = ET.fromstring(response.content)
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    
    feed_data = []
    
    for entry in root.findall("atom:entry", ns):
        title = entry.find("atom:title", ns).text
        entry_id = entry.find("atom:id", ns).text
        updated = entry.find("atom:updated", ns).text
        
        link_elem = entry.find("atom:link[@rel='alternate']", ns)
        if link_elem is None:
            link_elem = entry.find("atom:link", ns)
        link = link_elem.get("href") if link_elem is not None else ""
        
        content_elem = entry.find("atom:content", ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        soup = BeautifulSoup(content_html, "html.parser")
        
        updates = []
        current_type = None
        current_tags = []
        
        def add_current_update():
            nonlocal current_type, current_tags
            if current_type and current_tags:
                update_soup = BeautifulSoup("", "html.parser")
                for tag in current_tags:
                    update_soup.append(copy.copy(tag))
                
                html_str = str(update_soup)
                text_str = update_soup.get_text().strip()
                
                updates.append({
                    "type": current_type,
                    "html": html_str,
                    "text": text_str
                })
        
        headings = soup.find_all(["h3", "h4"])
        if not headings:
            updates.append({
                "type": "Update",
                "html": content_html,
                "text": soup.get_text().strip()
            })
        else:
            for child in soup.contents:
                if child.name in ["h3", "h4"]:
                    add_current_update()
                    current_type = child.get_text().strip()
                    current_tags = []
                elif child.name is not None:
                    current_tags.append(child)
            add_current_update()
            
        feed_data.append({
            "id": entry_id,
            "date": title,
            "updated": updated,
            "link": link,
            "updates": updates
        })
        
    return feed_data

try:
    data = parse_release_notes()
    print(f"Successfully parsed {len(data)} entries.")
    print("Preview of the first entry parsed:")
    print(json.dumps(data[0], indent=2))
except Exception as e:
    import traceback
    traceback.print_exc()
