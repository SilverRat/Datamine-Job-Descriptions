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
                try {
                    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

                    // Extract the Class Title from the page
                    const classTitle = await page.evaluate(() => {
                        const dtElements = Array.from(document.querySelectorAll('dt.term-description'));
                        for (const dt of dtElements) {
                            if (dt.textContent.trim() === 'Class Title') {
                                const dd = dt.nextElementSibling; // Get the corresponding <dd> tag
                                return dd ? dd.textContent.trim() : null;
                            }
                        }
                        return 'Unknown_Class_Title'; // Fallback title if not found
                    });

                    // Sanitize the class title for safe file naming
                    const sanitizedTitle = classTitle.replace(/[<>:"/\\|?*]/g, '_');
                    const fileName = `${sanitizedTitle}.pdf`;
                    const filePath = path.join(outputDir, fileName);

                    // Remove all links (URLs) from the page
                    await page.evaluate(() => {
                        const links = document.querySelectorAll('a');
                        links.forEach(link => link.remove());
                    });

                    // Save the modified page as a PDF
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

            // Check if the "Next" button is disabled
            const isNextButtonDisabled = await page.evaluate(() => {
                const nextButtonLi = document.querySelector('li.PagedList-skipToNext');
                return nextButtonLi && nextButtonLi.classList.contains('disabled');
            });

            if (isNextButtonDisabled) {
                console.log('No more pages to process. Exiting pagination.');
                hasNextPage = false;
            } else {
                currentPageNumber += 1; // Increment the page number for the next page
            }
        }
    } catch (error) {
        console.error(`Error during pagination: ${error.message}`);
    } finally {
        await browser.close();
        console.log('All pages processed.');
    }
})();
