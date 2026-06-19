import time
import copy
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# In-memory cache configuration
CACHE_EXPIRY_SECONDS = 600  # 10 minutes
feed_cache = {
    "data": None,
    "last_fetched": 0
}

def parse_release_notes():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    response = requests.get(url, timeout=15)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch feed: HTTP {response.status_code}")
        
    root = ET.fromstring(response.content)
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    
    feed_data = []
    
    for entry in root.findall("atom:entry", ns):
        title = entry.find("atom:title", ns).text  # e.g., "June 17, 2026"
        entry_id = entry.find("atom:id", ns).text
        updated = entry.find("atom:updated", ns).text
        
        # Try to find alternate link, fallback to first link
        link_elem = entry.find("atom:link[@rel='alternate']", ns)
        if link_elem is None:
            link_elem = entry.find("atom:link", ns)
        link = link_elem.get("href") if link_elem is not None else ""
        
        content_elem = entry.find("atom:content", ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Parse HTML using BeautifulSoup
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
            # Fallback if no sub-headings found
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

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def get_releases():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    current_time = time.time()
    
    # Check if cache is valid
    if (not force_refresh and 
        feed_cache["data"] is not None and 
        (current_time - feed_cache["last_fetched"]) < CACHE_EXPIRY_SECONDS):
        return jsonify({
            "source": "cache",
            "last_fetched": feed_cache["last_fetched"],
            "releases": feed_cache["data"]
        })
        
    try:
        data = parse_release_notes()
        feed_cache["data"] = data
        feed_cache["last_fetched"] = current_time
        return jsonify({
            "source": "network",
            "last_fetched": current_time,
            "releases": data
        })
    except Exception as e:
        # Fallback to cache on network failure if cache is populated
        if feed_cache["data"] is not None:
            return jsonify({
                "source": "cache_fallback",
                "last_fetched": feed_cache["last_fetched"],
                "releases": feed_cache["data"],
                "error": str(e)
            }), 200
        return jsonify({
            "error": "Failed to fetch release notes and no cache available.",
            "details": str(e)
        }), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
