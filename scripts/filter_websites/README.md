# Website Keyword Filter

This tool scans websites for specific keywords by crawling their pages and checking content. It processes a list of domains from a CSV file and outputs matches to a new CSV file.

## Features

- Processes multiple domains from a CSV file
- Supports keywords with spaces
- Checks sitemaps for efficient crawling
- Prioritizes specific types of pages (research, services, insights, etc.)
- Handles various bot protection systems (Cloudflare, Akamai, etc.)
- Outputs results to a timestamped CSV file

## Installation

1. Make sure you have Node.js installed (version 16 or higher)

2. Clone this repository or copy the files to your local machine

3. Install dependencies:
```bash
npm install
```

4. Install Playwright browsers:
```bash
npx playwright install chromium
```

## Usage

### Input CSV Format

Your input CSV must have a `domain` column. Other columns will be preserved in the output. Example:
```csv
domain,company_name,industry
example.com,Example Corp,Technology
another.com,Another Inc,Healthcare
```

### Running the Script

Basic usage:
```bash
npm start -- path/to/input.csv "keyword phrase" another_keyword "third keyword phrase"
```

Example:
```bash
npm start -- ./input_csvs/companies.csv "market research" consulting "data analytics"
```

### Output

The script will create an `outputs` directory containing the results CSV. The output filename includes:
- Original CSV name
- Timestamp
- Keywords used

Example output file: `companies_2024-01-20T12-30-45-123Z_market_research_consulting_data_analytics.csv`

The output CSV will contain all columns from the input CSV plus:
- `keyword_match_link`: The URL where keywords were found
- `matched_keywords`: The keywords that were found

Only websites where matches were found will be included in the output CSV.

## Behavior

The script will:
1. Check the homepage first
2. If no matches found, check the sitemap (if available)
3. If no sitemap or no matches, check internal links in this priority order:
   - Pages containing "research"
   - Pages containing "services"
   - Pages containing "service"
   - Pages containing "insights"
   - Pages containing "case"
   - Up to 5 other pages
4. Stop checking a domain as soon as a match is found

## Protection Handling

The script handles various website protection systems:
- Cloudflare
- Akamai Bot Manager
- PerimeterX/HUMAN
- DataDome
- Imperva/Incapsula
- reCAPTCHA/hCaptcha
- Generic bot protection

When encountering protection:
- Multiple attempts will be made to bypass
- Different waiting periods are used based on protection type
- Protection type will be logged in console

## Error Handling

The script handles:
- Invalid URLs
- Network timeouts
- Bot protection systems
- Missing pages
- Invalid HTML

All errors are logged to the console but won't stop the script from processing other domains.

## Tips

- Use quotes around keywords that contain spaces
- The script respects robots.txt and includes reasonable delays between requests
- For better results, ensure domains in the CSV are clean (no http/https, no trailing slashes)
- Check console output for detailed progress and any protection/access issues
- The script only writes successful matches to the output CSV

## Directory Structure

```
scripts/filter_websites/
├── index.ts           # Main script
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── input_csvs/        # Place input CSV files here
└── outputs/           # Results will be written here
```

## Troubleshooting

If you encounter:
- **Cloudflare blocks**: The script will make multiple attempts with increasing delays
- **Other protection systems**: Different waiting strategies are applied based on the type
- **Timeout errors**: The script will log these and continue with the next domain
- **Invalid domains**: These will be skipped and logged