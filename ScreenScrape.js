const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ headless: true }); // Set to true for headless operation
    const page = await browser.newPage();

    const baseUrl = 'https://www.governmentjobs.com/careers/sacramento/classspecs'; // Starting URL
    const outputDir = './output';

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    let currentPageNumber = 1;
    let hasNextPage = true;

    try {
        while (hasNextPage) {
            const currentPageUrl = `${baseUrl}?page=${currentPageNumber}`;
            console.log(`Processing page: ${currentPageUrl}`);
            await page.goto(currentPageUrl, { waitUntil: 'networkidle2', timeout: 30000 });

            // Extract all relevant URLs from the current page
            const urls = await page.evaluate(() => {
                const links = [];
                document.querySelectorAll('a[href*="classspecs"]').forEach(link => {
                    links.push(link.href);
                });
                return links;
            });

            console.log(`Found ${urls.length} URLs on the page.`);

            // Process each URL
            for (const url of urls) {
                console.log(`Processing URL: ${url}`);
                const fileName = `classspecs_${path.basename(url)}.pdf`;
                const filePath = path.join(outputDir, fileName);

                try {
                    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

                    // Save the page as a PDF
                    await page.pdf({
                        path: filePath,
                        format: 'A4',
                        printBackground: true, // Include background graphics
                    });

                    console.log(`Saved PDF: ${filePath}`);
                } catch (urlError) {
                    console.error(`Error processing URL ${url}: ${urlError.message}`);
                    continue;
                }
            }

            // Check if a "Next" button exists
            const isNextButtonVisible = await page.evaluate(() => {
                const nextButton = document.querySelector('a[rel="next"]');
                return !!nextButton; // Returns true if the "Next" button exists
            });

            if (isNextButtonVisible) {
                currentPageNumber += 1; // Increment the page number for the next page
            } else {
                console.log('No more pages found. Exiting pagination.');
                hasNextPage = false;
            }
        }
    } catch (error) {
        console.error(`Error during pagination: ${error.message}`);
    } finally {
        await browser.close();
        console.log('All pages processed.');
    }
})();
