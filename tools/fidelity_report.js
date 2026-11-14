import fs from 'fs';
import path from 'path';

const EXTRACTED_DIR = 'data/extracted';
const SECTIONS_DIR = 'sections';
const REPORT_FILE = 'reports/fidelity-report.json';

function normalizeText(str) {
  return str
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/[^\w\s]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function runFidelityCheck() {
  console.log('--- Running Content Fidelity Audit ---');

  const results = [];
  let totalSourceWords = 0;
  let totalRenderedWords = 0;
  let totalMatches = 0;

  for (let i = 1; i <= 30; i++) {
    const secStr = String(i).padStart(2, '0');
    const secJsonFile = path.join(EXTRACTED_DIR, `section-${secStr}.json`);
    const htmlFile = path.join(SECTIONS_DIR, `section-${secStr}.html`);

    const secJson = JSON.parse(fs.readFileSync(secJsonFile, 'utf8'));
    const htmlContent = fs.readFileSync(htmlFile, 'utf8');

    // Extract main text from HTML (article content only)
    const articleMatch = htmlContent.match(/<article class="docs-content">([\s\S]*?)<\/article>/);
    const renderedText = articleMatch ? articleMatch[1] : htmlContent;
    const normRendered = normalizeText(renderedText);
    const renderedWords = new Set(normRendered.split(' '));

    let secSourceWords = 0;
    let secFoundWords = 0;

    secJson.pages.forEach(p => {
      const normPage = normalizeText(p.repaired_text || p.raw_text);
      const pageWords = normPage.split(' ').filter(w => w.length > 2);
      secSourceWords += pageWords.length;

      pageWords.forEach(w => {
        if (renderedWords.has(w)) {
          secFoundWords++;
        }
      });
    });

    const fidelityRatio = secSourceWords > 0 ? (secFoundWords / secSourceWords) : 1;
    totalSourceWords += secSourceWords;
    totalRenderedWords += renderedWords.size;
    totalMatches += secFoundWords;

    results.push({
      section: secStr,
      title: secJson.title,
      source_words: secSourceWords,
      matched_words: secFoundWords,
      fidelity_score: (fidelityRatio * 100).toFixed(2) + '%',
      status: fidelityRatio >= 0.95 ? 'EXCELLENT' : fidelityRatio >= 0.85 ? 'GOOD' : 'REVIEW'
    });
  }

  const overallScore = ((totalMatches / totalSourceWords) * 100).toFixed(2);
  const report = {
    timestamp: new Date().toISOString(),
    overall_fidelity_score: overallScore + '%',
    total_source_words: totalSourceWords,
    total_matched_words: totalMatches,
    status: overallScore >= 95 ? 'PASSED' : 'FLAGGED',
    sections: results
  };

  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');

  console.log(`✓ Overall Content Fidelity: ${overallScore}%`);
  console.log(`✓ Source words verified: ${totalMatches.toLocaleString()} / ${totalSourceWords.toLocaleString()}`);
  console.log(`✓ Wrote ${REPORT_FILE}`);
}

runFidelityCheck().catch(err => {
  console.error('Fatal Fidelity Error:', err);
  process.exit(1);
});
