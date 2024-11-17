import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import axios from 'axios';

interface WebsiteData {
  [key: string]: string; // All columns are now dynamic
}

interface OutputData extends WebsiteData {
  keyword_match_link: string;
  matched_keywords: string;
  keyword_status: 'MATCHED' | 'NO_MATCH' | 'UNKNOWN';
}

interface CachedResult {
  keyword_match_link: string;
  matched_keywords: string;
  keyword_status: 'MATCHED' | 'NO_MATCH' | 'UNKNOWN';
  timestamp: string;
  processed: boolean;
}

const PRIORITY_KEYWORDS = ['research', 'services', 'service', 'solutions', 'insights', 'case'];

const processedDomains = new Map<string, CachedResult>();

function prioritizeLinks(links: string[]): string[] {
  // Create buckets for prioritized links
  const priorityBuckets: { [key: string]: string[] } = {};
  const normalLinks: string[] = [];

  // Initialize buckets
  PRIORITY_KEYWORDS.forEach(keyword => {
    priorityBuckets[keyword] = [];
  });

  // Filter out sitemap URLs and sort remaining links into buckets
  links.filter(link => !link.toLowerCase().includes('sitemap')).forEach(link => {
    const lowercaseLink = link.toLowerCase();
    let assigned = false;

    for (const keyword of PRIORITY_KEYWORDS) {
      if (lowercaseLink.includes(keyword) && priorityBuckets[keyword].length < 5) {
        priorityBuckets[keyword].push(link);
        assigned = true;
        break; // Only put in first matching bucket
      }
    }

    if (!assigned) {
      normalLinks.push(link);
    }
  });

  // Combine links in priority order
  const prioritizedLinks = [
    ...PRIORITY_KEYWORDS.flatMap(keyword => priorityBuckets[keyword]),
    ...normalLinks.slice(0, 2) // Only take first 2 non-priority links
  ];

  console.log('\n  📊 Link prioritization summary:');
  PRIORITY_KEYWORDS.forEach(keyword => {
    console.log(`    - ${keyword}: ${priorityBuckets[keyword].length} links (max 5)`);
  });
  console.log(`    - other: ${normalLinks.length} links (using up to 2)`);

  return prioritizedLinks;
}

async function appendToCsv(data: OutputData, outputPath: string, isFirst: boolean) {
  const output = stringify(isFirst ? [data] : [data], { header: isFirst });
  fs.appendFileSync(outputPath, output);
}

async function fetchSitemap(domain: string): Promise<string[]> {
  const sitemapUrls = [
    `${domain}/sitemap.xml`,
    `${domain}/sitemap_index.xml`,
    `${domain}/sitemap-index.xml`,
  ];

  for (const url of sitemapUrls) {
    try {
      const response = await axios.get(url);
      if (response.status === 200) {
        const $ = cheerio.load(response.data, { xmlMode: true });
        return $('loc').map((_, el) => $(el).text()).get();
      }
    } catch (error) {
      continue;
    }
  }
  return [];
}

async function extractLinks(html: string, baseUrl: string): Promise<string[]> {
  const $ = cheerio.load(html);
  const links = new Set<string>();
  const baseUrlObj = new URL(baseUrl);
  
  $('a').each((_, element) => {
    const possibleHrefs = [
      $(element).attr('href'),
      $(element).attr('data-href'),
      $(element).attr('data-url'),
      $(element).data('href'),
      $(element).data('url')
    ].filter((href): href is string => typeof href === 'string');

    for (const href of possibleHrefs) {
      try {
        let fullUrl: string;
        
        if (href.startsWith('http')) {
          fullUrl = href;
        } else if (href.startsWith('//')) {
          fullUrl = `https:${href}`;
        } else if (href.startsWith('/')) {
          fullUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}${href}`;
        } else if (!href.startsWith('#') && !href.startsWith('javascript:')) {
          fullUrl = new URL(href, baseUrl).href;
        } else {
          continue;
        }

        const urlObj = new URL(fullUrl);
        
        if (urlObj.hostname === baseUrlObj.hostname) {
          urlObj.hash = '';
          links.add(urlObj.href);
        }
      } catch (error) {
        // Silently skip invalid URLs
      }
    }
  });
  
  return Array.from(links);
}

async function checkForProtection(page: Page): Promise<{ blocked: boolean; type: string }> {
  try {
    return await page.evaluate(() => {
      const html = document.documentElement.outerHTML.toLowerCase();
      const text = document.body.textContent?.toLowerCase() ?? '';
      
      // Cloudflare
      if (document.title.includes('Cloudflare') || 
          text.includes('please enable cookies') ||
          text.includes('sorry, you have been blocked')) {
        return { blocked: true, type: 'Cloudflare' };
      }
      
      // Akamai Bot Manager
      if (text.includes('akamai bot manager') || 
          html.includes('ak-challenge')) {
        return { blocked: true, type: 'Akamai' };
      }

      // PerimeterX/HUMAN
      if (html.includes('perimeterx') || 
          html.includes('_pxhd') ||
          html.includes('_px.js')) {
        return { blocked: true, type: 'PerimeterX' };
      }

      // DataDome
      if (html.includes('datadome') || 
          document.cookie.includes('datadome')) {
        return { blocked: true, type: 'DataDome' };
      }

      // Imperva/Incapsula
      if (text.includes('incapsula') || 
          html.includes('incap_ses') ||
          html.includes('visid_incap')) {
        return { blocked: true, type: 'Imperva' };
      }

      // reCAPTCHA
      if (html.includes('recaptcha') || 
          html.includes('g-recaptcha')) {
        return { blocked: true, type: 'reCAPTCHA' };
      }

      // hCaptcha
      if (html.includes('hcaptcha')) {
        return { blocked: true, type: 'hCaptcha' };
      }

      // Generic bot detection
      if (text.includes('automated access') ||
          text.includes('bot detected') ||
          text.includes('security check') ||
          text.includes('please verify you are human')) {
        return { blocked: true, type: 'Generic Bot Protection' };
      }

      return { blocked: false, type: 'none' };
    });
  } catch (error) {
    return { blocked: false, type: 'none' };
  }
}

async function checkForKeywords(url: string, keywords: string[], page: Page): Promise<string[]> {
  console.log(`  🔍 Checking: ${url}`);
  try {
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(5000);
    
    const protection = await checkForProtection(page);
    if (protection.blocked) {
      console.log(`  ❌ Access blocked by ${protection.type}: ${url}`);
      
      // Additional handling based on protection type
      switch (protection.type) {
        case 'Cloudflare':
          // Current Cloudflare handling...
          break;
        case 'reCAPTCHA':
          console.log(`  ⚠️ Detected reCAPTCHA, attempting alternative approach...`);
          // Try accessing through Google cache
          try {
            const googleCacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
            await page.goto(googleCacheUrl, { waitUntil: 'networkidle' });
            const cacheContent = await page.content();
            if (!cacheContent.includes('recaptcha')) {
              console.log(`  ✅ Successfully accessed Google cache version`);
              return keywords.filter(keyword => 
                cacheContent.toLowerCase().includes(keyword.toLowerCase())
              );
            }
          } catch (error) {
            console.log(`  ❌ Google cache attempt failed`);
          }

          // Try archive.org as fallback
          try {
            const archiveUrl = `https://web.archive.org/web/${url}`;
            await page.goto(archiveUrl, { waitUntil: 'networkidle' });
            const archiveContent = await page.content();
            if (!archiveContent.includes('recaptcha')) {
              console.log(`  ✅ Successfully accessed archive.org version`);
              return keywords.filter(keyword => 
                archiveContent.toLowerCase().includes(keyword.toLowerCase())
              );
            }
          } catch (error) {
            console.log(`  ❌ Archive.org attempt failed`);
          }

          console.log(`  ❌ All alternative approaches failed`);
          return [];
        case 'hCaptcha':
          // Can't handle automatically
          return [];
        case 'DataDome':
        case 'Akamai':
        case 'PerimeterX':
        case 'Imperva':
          // These usually need specialized handling
          await page.waitForTimeout(15000); // Longer wait
          const stillBlocked = (await checkForProtection(page)).blocked;
          if (stillBlocked) return [];
          break;
        default:
          // Generic handling
          await page.waitForTimeout(10000);
          break;
      }
    }

    const content = await page.content();
    const $ = cheerio.load(content);
    const text = $('body').text().toLowerCase();

    return keywords.filter(keyword => text.includes(keyword.toLowerCase()));
  } catch (error) {
    console.log(`  ❌ Error accessing: ${url} - ${error}`);
    return [];
  }
}

async function processWebsite(
  data: WebsiteData, 
  keywords: string[], 
  browser: Browser,
  outputPath: string,
  isFirst: boolean
): Promise<void> {
  const websiteColumn = process.argv[3];
  console.log(`\n📌 Processing website: ${data[websiteColumn]}`);
  
  // Check cache first
  const cachedResult = processedDomains.get(data[websiteColumn]);
  if (cachedResult?.processed) {
    console.log(`  📋 Found cached result from ${cachedResult.timestamp}`);
    const result: OutputData = {
      ...data,
      keyword_match_link: cachedResult.keyword_match_link,
      matched_keywords: cachedResult.matched_keywords,
      keyword_status: cachedResult.keyword_status
    };
    await appendToCsv(result, outputPath, isFirst);
    console.log(`  ✅ Wrote cached result to CSV`);
    return;
  }

  // Enhanced stealth configuration
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    permissions: ['geolocation'],
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'sec-ch-ua': '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    },
    javaScriptEnabled: true,
  });

  // Add browser fingerprint evasion
  await context.addInitScript(() => {
    // Override navigator properties
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    
    // Add fake WebGL
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter: number) {
      if (parameter === 37445) {
        return 'Intel Open Source Technology Center';
      }
      if (parameter === 37446) {
        return 'Mesa DRI Intel(R) HD Graphics (SKL GT2)';
      }
      return getParameter.call(this, parameter);
    };
  });

  const page = await context.newPage();
  
  // Add random mouse movements and scrolling
  await page.route('**/*', async route => {
    await route.continue();
    try {
      // Random mouse movements
      for (let i = 0; i < 3; i++) {
        await page.mouse.move(
          Math.floor(Math.random() * 1000),
          Math.floor(Math.random() * 1000),
          { steps: 10 }
        );
      }
      
      // Random scrolling
      await page.evaluate(() => {
        window.scrollTo({
          top: Math.random() * document.body.scrollHeight,
          behavior: 'smooth'
        });
      });
    } catch (e) {
      // Ignore errors during mouse movements
    }
  });

  // Add random delays between actions
  const randomDelay = async () => {
    const delay = 1000 + Math.random() * 2000;
    await page.waitForTimeout(delay);
  };

  let domain = data[websiteColumn];
  if (!domain.startsWith('http')) {
    domain = `https://${domain}`;
  }

  try {
    // Add delay before visiting
    await randomDelay();

    // Check homepage first before doing anything else
    console.log(`  🏠 Attempting to load homepage...`);
    try {
      // First attempt to load the page
      await page.goto(domain, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Initial wait
      await page.waitForTimeout(5000);

      // Function to check for Cloudflare
      const checkForCloudflare = async () => {
        return await page.evaluate(() => {
          return document.title.includes('Cloudflare') || 
                 document.body.textContent?.includes('Please enable cookies') ||
                 document.body.textContent?.includes('Sorry, you have been blocked');
        });
      };

      // Handle Cloudflare challenge with multiple attempts
      let attempts = 0;
      const maxAttempts = 3;
      
      while (await checkForCloudflare() && attempts < maxAttempts) {
        console.log(`  ⚠️ Detected Cloudflare protection, attempt ${attempts + 1}/${maxAttempts}...`);
        
        // Accept cookies if there's a button
        try {
          await page.click('button:has-text("Accept")');
          console.log(`  🍪 Clicked accept cookies button`);
        } catch (e) {
          // No cookie button found
        }
        
        // Wait longer with each attempt
        const waitTime = 10000 * (attempts + 1);
        await page.waitForTimeout(waitTime);
        attempts++;
        
        // Reload the page if still blocked
        if (await checkForCloudflare()) {
          await page.reload({ waitUntil: 'networkidle' });
          await page.waitForTimeout(5000);
        }
      }

      if (await checkForCloudflare()) {
        console.log(`  ❌ Still blocked by Cloudflare after ${maxAttempts} attempts`);
        throw new Error('Cloudflare blocking persisted');
      }

      console.log(`  ✅ Homepage loaded successfully`);
      
      // Check homepage for keywords immediately
      console.log(`  🔍 Checking homepage for keywords...`);
      const content = await page.content();
      const $ = cheerio.load(content);
      const text = $('body').text().toLowerCase();
      const homePageMatches = keywords.filter(keyword => 
        text.includes(keyword.toLowerCase())
      );

      if (homePageMatches.length > 0) {
        console.log(`  ✨ Found matches on homepage: ${homePageMatches.join(', ')}`);
        const result: OutputData = {
          ...data,
          keyword_match_link: domain,
          matched_keywords: homePageMatches.join(', '),
          keyword_status: 'MATCHED'
        };
        
        // Cache the positive result
        processedDomains.set(data[websiteColumn], {
          keyword_match_link: domain,
          matched_keywords: homePageMatches.join(', '),
          keyword_status: 'MATCHED',
          timestamp: new Date().toISOString(),
          processed: true
        });
        
        await appendToCsv(result, outputPath, isFirst);
        await page.close();
        await context.close();
        return;
      }

      console.log(`  ➖ No matches found on homepage, checking sitemap and internal links...`);
      
      // Get both sitemap URLs and internal links
      const sitemapUrls = await fetchSitemap(domain);
      const links = await extractLinks(content, domain);
      
      // Combine and prioritize all URLs
      const allUrls = [...new Set([...sitemapUrls, ...links])];
      const prioritizedLinks = prioritizeLinks(allUrls);
      
      console.log(`  📋 Found ${sitemapUrls.length} sitemap URLs and ${links.length} internal links`);
      console.log(`  🔄 Checking ${prioritizedLinks.length} total prioritized URLs...`);

      // Check all prioritized URLs
      for (const link of prioritizedLinks) {
        const matchedKeywords = await checkForKeywords(link, keywords, page);
        if (matchedKeywords.length > 0) {
          const result: OutputData = {
            ...data,
            keyword_match_link: link,
            matched_keywords: matchedKeywords.join(', '),
            keyword_status: 'MATCHED'
          };
          
          // Cache the positive result
          processedDomains.set(data[websiteColumn], {
            keyword_match_link: link,
            matched_keywords: matchedKeywords.join(', '),
            keyword_status: 'MATCHED',
            timestamp: new Date().toISOString(),
            processed: true
          });
          
          await appendToCsv(result, outputPath, isFirst);
          console.log(`  ✅ Found match! Result written to CSV`);
          await page.close();
          await context.close();
          return;
        }
      }

      // If we got here, we successfully checked pages but found no matches
      const noMatchResult: OutputData = {
        ...data,
        keyword_match_link: '',
        matched_keywords: '',
        keyword_status: 'NO_MATCH'
      };

      // Cache the negative result
      processedDomains.set(data[websiteColumn], {
        keyword_match_link: '',
        matched_keywords: '',
        keyword_status: 'NO_MATCH',
        timestamp: new Date().toISOString(),
        processed: true
      });

      await appendToCsv(noMatchResult, outputPath, isFirst);
      console.log(`  ⚠️ No matches found. Writing NO_MATCH result to CSV.`);
      await page.close();
      await context.close();

    } catch (error) {
      console.log(`  ❌ Error processing homepage: ${error}`);
      throw error;
    }

  } catch (error) {
    // Handle error case with UNKNOWN status
    const unknownResult: OutputData = {
      ...data,
      keyword_match_link: '',
      matched_keywords: '',
      keyword_status: 'UNKNOWN'
    };

    // Cache the error case
    processedDomains.set(data[websiteColumn], {
      keyword_match_link: '',
      matched_keywords: '',
      keyword_status: 'UNKNOWN',
      timestamp: new Date().toISOString(),
      processed: true
    });

    await appendToCsv(unknownResult, outputPath, isFirst);
    console.log(`  ❌ Error processing website. Writing UNKNOWN status to CSV.`);
    await page.close();
    await context.close();
  }
}

async function saveCacheToFile(): Promise<void> {
  const cacheFile = path.join(process.cwd(), 'outputs', 'domain_cache.json');
  const cacheData = Object.fromEntries(processedDomains);
  await fs.promises.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
  console.log(`\n💾 Cache saved to ${cacheFile}`);
}

async function loadCacheFromFile(): Promise<void> {
  const cacheFile = path.join(process.cwd(), 'outputs', 'domain_cache.json');
  try {
    const cacheData = JSON.parse(await fs.promises.readFile(cacheFile, 'utf-8'));
    Object.entries(cacheData).forEach(([domain, result]) => {
      processedDomains.set(domain, result as CachedResult);
    });
    console.log(`\n📂 Loaded ${processedDomains.size} cached results`);
  } catch (error) {
    console.log('\n📂 No existing cache found');
  }
}

async function main(): Promise<void> {
  console.log('🚀 Starting website filter process...');
  
  // Load cache at start
  await loadCacheFromFile();
  
  // Get command line arguments and handle quotes/spaces
  const args = process.argv.slice(2);
  let csvPath: string | undefined;
  let websiteColumn: string | undefined;
  const keywords: string[] = [];
  
  // Parse arguments handling quoted strings
  let currentArg = '';
  let inQuotes = false;
  
  // First two arguments are CSV path and website column name
  if (args.length < 3) {
    console.error('Usage: npm start -- path/to/your.csv website_column_name "keyword with spaces" keyword2');
    process.exit(1);
  }

  csvPath = args[0];
  websiteColumn = args[1];
  
  // Process remaining arguments as keywords
  for (const arg of args.slice(2)) {
    if (arg.startsWith('"') && !inQuotes) {
      inQuotes = true;
      currentArg = arg.slice(1);
    } else if (arg.endsWith('"') && inQuotes) {
      inQuotes = false;
      currentArg += ' ' + arg.slice(0, -1);
      keywords.push(currentArg.trim());
      currentArg = '';
    } else if (inQuotes) {
      currentArg += ' ' + arg;
    } else if (arg.includes('"')) {
      keywords.push(arg.replace(/"/g, '').trim());
    } else {
      keywords.push(arg.trim());
    }
  }

  // Add the last argument if we're still processing one
  if (currentArg) {
    keywords.push(currentArg.trim());
  }

  if (!csvPath || !websiteColumn || keywords.length === 0) {
    console.error('Usage: npm start -- path/to/your.csv website_column_name "keyword with spaces" keyword2');
    process.exit(1);
  }

  console.log('\n📋 Configuration:');
  console.log(`CSV Path: ${csvPath}`);
  console.log(`Website Column: ${websiteColumn}`);
  console.log(`Keywords: ${keywords.join(', ')}`);

  // Read CSV file
  console.log('\n📂 Reading CSV file...');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records = csv.parse(fileContent, { columns: true }) as WebsiteData[];

  // Validate that the specified column exists
  if (!records[0] || !(websiteColumn in records[0])) {
    console.error(`❌ Column "${websiteColumn}" not found in CSV file`);
    process.exit(1);
  }

  console.log(`📊 Found ${records.length} websites to process`);

  // Create output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), 'outputs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
    console.log('📁 Created outputs directory');
  }

  // Create output filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseFileName = path.basename(csvPath, path.extname(csvPath));
  const outputPath = path.join(
    outputDir,
    `${baseFileName}_${timestamp}_${keywords.join('_')}.csv`
  );
  console.log(`📝 Will write results to: ${outputPath}`);

  // Launch browser with specific arguments
  console.log('\n🌐 Launching browser...');
  const browser = await chromium.launch({
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certifcate-errors',
      '--ignore-certifcate-errors-spki-list',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-client-side-phishing-detection',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-hang-monitor',
      '--disable-ipc-flooding-protection',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-renderer-backgrounding',
      '--disable-sync',
      '--force-color-profile=srgb',
      '--metrics-recording-only',
      '--no-default-browser-check',
      '--password-store=basic',
      '--use-mock-keychain',
    ],
    headless: true,
  });

  // Process each website
  console.log('\n🔄 Starting website processing...');
  for (let i = 0; i < records.length; i++) {
    console.log(`\n[${i + 1}/${records.length}]`);
    const websiteData = records[i];
    const domain = websiteData[websiteColumn]; // Use the specified column
    if (!domain) {
      console.log(`⚠️ Skipping record ${i + 1}: No website URL found in column "${websiteColumn}"`);
      continue;
    }
    await processWebsite(websiteData, keywords, browser, outputPath, i === 0);
    await saveCacheToFile();
  }

  // Close browser
  await browser.close();

  // Save cache at end
  await saveCacheToFile();
  
  console.log('\n✅ Process completed!');
  console.log(`📊 Results written to ${outputPath}`);
}

// Run the main function
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
