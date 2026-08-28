/**
 * AIDA — Client-Side Document Parser & Intelligence NER Engine
 * Supports PDF, DOCX, TXT, CSV, JSON, MD with in-browser regex entity recognition.
 */

class DocumentParserEngine {
  constructor() {
    this.patterns = {
      threat_actor: /\b(?:APT[- ]?\d+|Lazarus|Fancy Bear|Cozy Bear|LockBit|BlackCat|Volt Typhoon|Sandworm|DarkSide|REvil|FIN\d+)\b/gi,
      cve: /\bCVE-\d{4}-\d{4,7}\b/gi,
      ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      domain: /\b(?:[a-zA-Z0-9-]+\.)+(?:com|org|net|gov|mil|edu|io|ru|cn|ir|kp|cc|xyz)\b/gi,
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      money: /(?:\$|€|£|¥)\s?\d+(?:,\d{3})*(?:\.\d{2})?(?:\s?(?:million|billion|trillion|k|m|b))?\b|\b\d+(?:,\d{3})*(?:\.\d{2})?\s?(?:USD|EUR|GBP|BTC|USDT)\b/gi,
      org: /\b[A-Z][A-Za-z0-9&\-\.]{2,}(?:\s+[A-Z][A-Za-z0-9&\-\.]{2,})*\s+(?:Inc|Corp|Corporation|LLC|Ltd|Group|Holdings|Bank|Department|Agency|DoD|CISA|Interpol|FBI|NSA|CIA|Treasury|Ministry)\b/g,
      location: /\b(?:United States|Russia|China|Iran|North Korea|Ukraine|Germany|United Kingdom|Japan|Taiwan|Switzerland|Geneva|London|Moscow|Beijing|Tehran|Pyongyang|Washington|New York|Dubai|Singapore|Frankfurt)\b/gi,
      hash_sha256: /\b[a-fA-F0-9]{64}\b/g,
    };
  }

  extractEntities(text) {
    const results = {};
    for (const [key, regex] of Object.entries(this.patterns)) {
      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        // Unique and clean
        results[key] = Array.from(new Set(matches)).slice(0, 10);
      }
    }
    return results;
  }

  chunkText(text, filename, chunkSize = 400, overlap = 50) {
    const clean = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
    const words = clean.split(/\s+/);
    const chunks = [];
    let start = 0;
    const step = Math.max(10, chunkSize - overlap);

    let id = 0;
    while (start < words.length) {
      const end = Math.min(start + chunkSize, words.length);
      const chunkStr = words.slice(start, end).join(' ');
      if (chunkStr.trim().length > 10) {
        const ents = this.extractEntities(chunkStr);
        chunks.push({
          chunk_id: id++,
          text: chunkStr.trim(),
          source: filename,
          token_count: words.slice(start, end).length,
          entities: ents,
          created_at: new Date().toISOString()
        });
      }
      start += step;
    }
    return chunks;
  }

  async parseFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    let text = '';

    if (ext === 'pdf') {
      text = await this.parsePdf(file);
    } else if (ext === 'docx') {
      text = await this.parseDocx(file);
    } else {
      text = await this.readAsText(file);
    }

    if (!text || !text.trim()) {
      throw new Error(`Could not extract text from ${file.name}`);
    }

    return {
      filename: file.name,
      text: text,
      size: file.size,
      chunks: this.chunkText(text, file.name),
      entities: this.extractEntities(text)
    };
  }

  readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  }

  async parsePdf(file) {
    // If PDF.js is loaded in browser
    if (window.pdfjsLib) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageStr = textContent.items.map(item => item.str).join(' ');
          fullText += `[Page ${i}]\n` + pageStr + '\n\n';
        }
        return fullText;
      } catch (e) {
        console.warn('PDF.js client parse error, falling back to raw read:', e);
      }
    }
    // Fallback: simple text extraction from raw bytes
    const raw = await this.readAsText(file);
    return raw;
  }

  async parseDocx(file) {
    // If Mammoth.js is loaded
    if (window.mammoth) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        return result.value;
      } catch (e) {
        console.warn('Mammoth docx parse error:', e);
      }
    }
    return await this.readAsText(file);
  }
}

window.docParser = new DocumentParserEngine();
