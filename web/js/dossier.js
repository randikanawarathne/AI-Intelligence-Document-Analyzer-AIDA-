/**
 * AIDA — Intelligence Briefing Dossier & Report Exporter
 * Generates and downloads publication-grade intelligence reports (PDF / MD / HTML / JSON).
 */

class DossierExporter {
  generateMarkdown(data) {
    const title = data.title || 'AIDA INTELLIGENCE ASSESSMENT DOSSIER';
    const classification = data.classification || 'CONFIDENTIAL // NOFORN';
    const date = new Date().toUTCString();
    const docs = data.documents || [];
    const entities = data.entities || {};

    const docRows = docs.map(d => `- **${d.name}** (${d.chunks || 0} chunks, ${d.tokens || 0} tokens, Ingested: ${d.ingested_at || 'Recent'})`).join('\n') || '- *No documents indexed.*';

    const threatList = (entities.threat_actors || []).map(e => e.name || e).join(', ') || 'No specific threat actors cataloged.';
    const cveList = (entities.cves || []).map(e => e.name || e).join(', ') || 'No CVE identifiers cataloged.';
    const finList = (entities.financials || []).map(e => e.name || e).join(', ') || 'No financial anomalies cataloged.';
    const orgList = (entities.organizations || []).map(e => e.name || e).join(', ') || 'No organizational entities cataloged.';
    const locList = (entities.locations || []).map(e => e.name || e).join(', ') || 'No locations cataloged.';

    return `# ${title}
**CLASSIFICATION LEVEL:** ${classification}  
**DATE OF GENERATION:** ${date}  
**ANALYST SYSTEM:** AIDA AI Intelligence Document Analyzer (v2.0)  

---

## 1. Executive Summary & Objective
This intelligence dossier consolidates multi-source document ingestion, automated entity correlation, and semantic vector indexing across **${docs.length} primary intelligence source(s)**.

## 2. Ingested Evidence Inventory
${docRows}

## 3. Threat Vector & Vulnerability Matrix
- **Identified Threat Actors & APTs:** ${threatList}
- **Cataloged CVE Vulnerabilities:** ${cveList}
- **Financial Forensics Signatures:** ${finList}

## 4. Entity Correlation & Relational Distribution
- **Organizations:** ${orgList}
- **Locations & Jurisdictions:** ${locList}

---
*Report generated automatically by AIDA RAG Platform. Analytical corroboration recommended.*
`;
  }

  generateHtml(data) {
    const md = this.generateMarkdown(data);
    const htmlContent = md
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>')
      .replace(/\n\n/gim, '<p></p>')
      .replace(/\n/gim, '<br>');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${data.title || 'AIDA Intelligence Dossier'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #040a17; color: #f1f5f9; padding: 40px; line-height: 1.6; max-width: 900px; margin: auto; }
    h1 { color: #4edea3; border-bottom: 2px solid #4edea3; padding-bottom: 8px; }
    h2 { color: #38bdf8; margin-top: 24px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; }
    strong { color: #ffffff; }
    li { margin-bottom: 6px; }
    .badge { background: #e11d48; color: white; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
    @media print {
      body { background: #fff; color: #000; padding: 20px; }
      h1 { color: #000; border-bottom-color: #000; }
      h2 { color: #333; border-bottom-color: #ccc; }
      strong { color: #000; }
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
  }

  downloadFile(filename, content, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  exportMarkdown(data) {
    const md = this.generateMarkdown(data);
    this.downloadFile(`AIDA_Dossier_${Date.now()}.md`, md, 'text/markdown');
  }

  exportHtml(data) {
    const html = this.generateHtml(data);
    this.downloadFile(`AIDA_Dossier_${Date.now()}.html`, html, 'text/html');
  }

  exportJson(data) {
    const json = JSON.stringify(data, null, 2);
    this.downloadFile(`AIDA_Dossier_${Date.now()}.json`, json, 'application/json');
  }

  exportPrint(data) {
    const html = this.generateHtml(data);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  }
}

window.dossierExporter = new DossierExporter();
