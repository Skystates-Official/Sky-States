import * as cheerio from 'cheerio';

/**
 * Calculates a Flesch reading ease approximation.
 */
function calculateReadability(text) {
  const words = text.trim().split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).length - 1 || 1;
  const syllables = text.split(/[aeiouy]+/i).length - 1 || 1;

  if (words === 0) return 0;
  
  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Math.max(0, Math.min(100, score));
}

/**
 * Performs a case-insensitive keyword search.
 */
function countKeywordMatches(text, keyword) {
  if (!keyword || !text) return 0;
  const regex = new RegExp(`\\b${keyword.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

export function analyzeBlog(blogData) {
  const { title = '', content = '', focus_keyword = '', seo_title = '', seo_description = '' } = blogData;
  const keyword = focus_keyword.toLowerCase();
  
  const $ = cheerio.load(content);
  
  // ============================
  // 1. Content Analysis
  // ============================
  const textContent = $.text();
  const wordCount = textContent.trim().split(/\s+/).filter(w => w.length > 0).length;
  const charCount = textContent.length;
  const readingTime = Math.ceil(wordCount / 200); // 200 words per min
  const pTags = $('p');
  const paragraphCount = pTags.length;
  const avgParagraphLength = paragraphCount > 0 ? Math.round(wordCount / paragraphCount) : 0;
  const sentenceCount = textContent.split(/[.!?]+/).length - 1 || 1;
  const avgSentenceLength = Math.round(wordCount / sentenceCount);
  const readabilityScore = Math.round(calculateReadability(textContent));
  
  const contentAnalysis = {
    word_count: wordCount,
    reading_time_mins: readingTime,
    char_count: charCount,
    paragraph_count: paragraphCount,
    avg_paragraph_words: avgParagraphLength,
    avg_sentence_words: avgSentenceLength,
    readability_score: readabilityScore
  };

  // ============================
  // 2. Heading Analysis
  // ============================
  const h1Count = $('h1').length;
  const h2Count = $('h2').length;
  const h3Count = $('h3').length;
  
  const headingAnalysis = {
    h1_count: h1Count,
    h2_count: h2Count,
    h3_count: h3Count,
    warnings: [],
    success: []
  };

  if (h1Count === 1) headingAnalysis.success.push('One H1');
  else headingAnalysis.warnings.push(h1Count === 0 ? 'Missing H1' : 'Multiple H1s found');

  if (h2Count > 0) headingAnalysis.success.push(`${h2Count} H2(s)`);
  else headingAnalysis.warnings.push('No H2 found');
  
  if (h3Count === 0 && h2Count > 0) headingAnalysis.warnings.push('No H3 found (Good for structure, but not strictly required)');

  // ============================
  // 3. Keyword Analysis
  // ============================
  let keywordChecks = {};
  let keywordCount = 0;
  
  if (keyword) {
    const firstParagraph = $('p').first().text();
    const lastParagraph = $('p').last().text();
    
    keywordChecks = {
      in_title: title.toLowerCase().includes(keyword),
      in_seo_title: seo_title.toLowerCase().includes(keyword),
      in_seo_desc: seo_description.toLowerCase().includes(keyword),
      in_first_paragraph: firstParagraph.toLowerCase().includes(keyword),
      in_last_paragraph: lastParagraph.toLowerCase().includes(keyword),
      in_h1: $('h1').text().toLowerCase().includes(keyword),
      in_h2: $('h2').text().toLowerCase().includes(keyword),
    };
    
    keywordCount = countKeywordMatches(textContent, keyword);
  }
  
  const keywordDensity = wordCount > 0 ? ((keywordCount / wordCount) * 100).toFixed(2) : '0.00';
  
  const keywordAnalysis = {
    focus_keyword: keyword,
    frequency: keywordCount,
    density: parseFloat(keywordDensity),
    placement: keywordChecks
  };

  // ============================
  // 4. Image Analysis
  // ============================
  const images = $('img');
  let missingAlt = 0;
  let missingLazy = 0;
  let keywordInAlt = false;

  images.each((_, img) => {
    const alt = $(img).attr('alt') || '';
    const loading = $(img).attr('loading') || '';
    if (!alt.trim()) missingAlt++;
    if (loading !== 'lazy') missingLazy++;
    if (keyword && alt.toLowerCase().includes(keyword)) keywordInAlt = true;
  });

  const imageAnalysis = {
    total_images: images.length,
    missing_alt_text: missingAlt,
    missing_lazy_load: missingLazy,
    keyword_in_alt: keywordInAlt
  };

  // ============================
  // 5. Link Analysis
  // ============================
  const links = $('a');
  let internalLinks = 0;
  let externalLinks = 0;
  let nofollowLinks = 0;

  links.each((_, a) => {
    const href = $(a).attr('href') || '';
    const rel = $(a).attr('rel') || '';
    
    if (href.startsWith('http') && !href.includes('localhost') && !href.includes('skystates.us')) {
      externalLinks++;
    } else {
      internalLinks++;
    }
    
    if (rel.toLowerCase().includes('nofollow')) {
      nofollowLinks++;
    }
  });

  const linkAnalysis = {
    total_links: links.length,
    internal_links: internalLinks,
    external_links: externalLinks,
    nofollow_links: nofollowLinks
  };

  // ============================
  // 6. Score Calculation
  // ============================
  let score = 0;

  // Metadata (20)
  if (seo_title.length >= 40 && seo_title.length <= 60) score += 10;
  if (seo_description.length >= 120 && seo_description.length <= 160) score += 10;

  // Keywords (20)
  if (keyword) {
    let kwScore = 0;
    if (keywordChecks.in_seo_title) kwScore += 5;
    if (keywordChecks.in_seo_desc) kwScore += 5;
    if (keywordChecks.in_first_paragraph) kwScore += 3;
    if (keywordChecks.in_h1) kwScore += 3;
    if (keywordAnalysis.density >= 0.5 && keywordAnalysis.density <= 2.5) kwScore += 4;
    score += kwScore;
  }

  // Headings (15)
  if (h1Count === 1) score += 10;
  if (h2Count > 0) score += 5;

  // Images (10)
  if (images.length > 0) {
    if (missingAlt === 0) score += 6;
    if (missingLazy === 0) score += 4;
  } else {
    // slight penalty for no images, but award 5 points anyway
    score += 5; 
  }

  // Links (15)
  if (internalLinks > 0) score += 8;
  if (externalLinks > 0) score += 7;

  // Readability (10)
  if (readabilityScore > 60) score += 10;
  else if (readabilityScore > 40) score += 5;

  // Technical (10)
  if (wordCount >= 300) score += 10;
  else if (wordCount >= 150) score += 5;

  return {
    seo_score: Math.min(100, Math.max(0, score)),
    analysis: {
      content: contentAnalysis,
      headings: headingAnalysis,
      keywords: keywordAnalysis,
      images: imageAnalysis,
      links: linkAnalysis
    }
  };
}
