from bs4 import BeautifulSoup
from typing import List

def parse_html_table(html_content: str) -> List[str]:
    """
    Parses an HTML financial statement and extracts text row by row.
    Useful for the Kaggle Financial Statements Clustering dataset where data is tabular.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    chunks = []
    
    # Financial statements in the dataset are usually in <table> tags
    tables = soup.find_all('table')
    
    if not tables:
        # Fallback if no tables are found, just get text chunks
        text = soup.get_text(separator=' ', strip=True)
        return chunk_text(text)
        
    for table in tables:
        rows = table.find_all('tr')
        for row in rows:
            cols = row.find_all(['td', 'th'])
            row_text = " | ".join(col.get_text(strip=True) for col in cols if col.get_text(strip=True))
            if row_text:
                chunks.append(row_text)
                
    return chunks

def chunk_text(text: str, max_tokens: int = 400) -> List[str]:
    """
    Naive word-based chunking for raw text fallback.
    Assuming ~1 token = 1.3 words.
    """
    words = text.split()
    word_limit = int(max_tokens * 1.3)
    chunks = []
    
    for i in range(0, len(words), word_limit):
        chunk = " ".join(words[i:i + word_limit])
        chunks.append(chunk)
        
    return chunks
