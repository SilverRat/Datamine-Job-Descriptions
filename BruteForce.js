const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    for (let i = 16000; i <= 16002; i++) {
        const url = `https://www.governmentjobs.com/careers/sacramento/classspecs/${i}`;
        const outputPath = `output/classspecs_${i}.pdf`;

        console.log(`Processing: ${url}`);
        
        try {
            // Navigate to the URL with a timeout and check for errors
            const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

            // Check if the response status is not 200 (OK)
            if (response.status() !== 200) {
                console.warn(`Skipping ${url} due to bad status: ${response.status()}`);
                continue; // Skip PDF creation for this URL
            }

            // Generate PDF
            await page.pdf({ path: outputPath, format: 'A4' });
            console.log(`Saved PDF: ${outputPath}`);
        } catch (error) {
            // Catch and log errors, then continue to the next URL
            console.error(`Error processing ${url}:`, error.message);
            continue;
        }
    }

    await browser.close();
    console.log("All URLs processed.");
})();
