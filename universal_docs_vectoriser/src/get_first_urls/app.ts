import * as chromium from 'chrome-aws-lambda';
import { URL as UURL } from 'url';
let response;

exports.handler = async (event: any, context: any, callback: any) => {
    let browser = null;

    try {
        browser = await chromium.puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        let page = await browser.newPage();
     

        const url = event.pathParameters.url;
        const fullUrl = url.includes('https://') ? url : `https://${url}`;

        await page.goto(fullUrl);

        const links = await page.$$eval('a', (links: any) => links.map((a: any) => a.href));

        const filteredLinks = links.filter((link: any) => {
            const pageUrl = new UURL(link);
            const domainUrl = new UURL(fullUrl);
            return pageUrl.hostname == domainUrl.hostname;
        });
        console.log('filteredLinks', filteredLinks.length);

        console.log(filteredLinks);

        if (filteredLinks.length < 10) {
            for (let link of filteredLinks) {
                await page.goto(link);
                console.log('Scraping ====>> ', link);
                const pageLinks = await page.$$eval('a', (links: any) => links.map((a: any) => a.href));
                const filteredPageLinks = pageLinks.filter((pageLink: any) => {
                    const pageUrl = new UURL(pageLink);
                    const domainUrl = new UURL(fullUrl);

                    return pageUrl.hostname == domainUrl.hostname && !filteredLinks.includes(pageLink);
                });

                if (filteredPageLinks) {
                    filteredLinks.push(...filteredPageLinks);
                }
                if (filteredLinks.length() >= 10) {
                    break;
                }
            }
        }

        const removeDuplicates = (array: any) => {
            return [...new Set(array)];
        };

        function sortArrayAlphabetically(arr: any) {
            return arr.sort((a: any, b: any) => a.localeCompare(b));
        }

        const pagesObject = sortArrayAlphabetically(removeDuplicates(filteredLinks).slice(0, 10)).map((page: any) => {
            return {
                url: page,
            };
        });
        console.log(pagesObject);

        response = {
            statusCode: 200,
            body: JSON.stringify({
                pages: pagesObject,
            }),
        };
    } catch (error) {
        console.log(error);

        response = {
            statusCode: 200,
            body: JSON.stringify({
                message: 'An error occurred.',
                error: error,
            }),
        };
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }

    return response;
};
