import { Status, updateJob } from './lib/data/job';
import { PageObject } from './lib/data/page';
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
let response;

exports.handler = async (event: any, context: any, callback: any) => {
    let browser = null;
    console.log(event);

    try {
        const { MAX_PAGES, pages, userId, jobId, indexName } = event;
        await updateJob(jobId, Status.SCRAPING);
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });
        console.log('Browser launched');

        const flattenUrls = (pages: PageObject[]) => {
            const urls: string[] = [];

            pages.forEach((page) => {
                urls.push(page.url);
            });

            return urls;
        };

        const urls = flattenUrls(pages);
        let page = await browser.newPage();
        let noFoundException = 0;
        for (let url of urls) {
            try {
                if (urls.length < MAX_PAGES) {
                    console.log(`Processing ${url}`);
                    await page.goto(url, { waitUntil: 'networkidle0', timeout: 0 });
                    const pageLinks = await page.$$eval('a', (links: any) => links.map((a: any) => a.href));
                    const filteredPageLinks = pageLinks.filter((pageLink: any) => {
                        const pageUrl = new URL(pageLink);
                        const domainUrl = new URL(url);
                        return (
                            pageUrl.hostname === domainUrl.hostname &&
                            !urls.includes(pageLink) &&
                            !pageLink.includes('#')
                        );
                    });

                    console.log(`Filtered links: ${filteredPageLinks}`);
                    if (filteredPageLinks.length) {
                        urls.push(...filteredPageLinks);
                        noFoundException = 0;
                    } else {
                        noFoundException += 1;
                    }
                    if (noFoundException > 50) {
                        return {
                            userId: userId,
                            pages:
                                urls.length > MAX_PAGES
                                    ? urls.slice(0, MAX_PAGES).map((url: string) => {
                                          return { url: url };
                                      })
                                    : urls.map((url: string) => {
                                          return { url: url };
                                      }),
                        };
                    }
                }
            } catch (error) {
                console.log('Error:', error);
            }
        }

        return {
            userId: userId,
            jobId: jobId,
            indexName: indexName,
            pages:
                urls.length > MAX_PAGES
                    ? urls.slice(0, MAX_PAGES).map((url: string) => {
                          return { url: url };
                      })
                    : urls.map((url: string) => {
                          return { url: url };
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

// async function storeJSONToS3(objectKey: string, payload: Object, s3: any): Promise<void> {
//     try {
//         const params = {
//             Bucket: process.env.S3_BUCKET,
//             Key: objectKey,
//             Body: JSON.stringify(payload),
//             ContentType: 'application/json',
//         };
//         console.log(params);
//         await s3.putObject(params).promise();

//         console.log(`Successfully stored JSON object in S3: ${process.env.S3_BUCKET}/${objectKey}`);
//     } catch (error) {
//         console.error('Error storing JSON object in S3:', error);
//         throw error;
//     }
// }

// async function retrieveJSONFromS3(objectKey: string, s3: any): Promise<any> {
//     try {
//         const params = {
//             Bucket: process.env.S3_BUCKET,
//             Key: objectKey,
//         };
//         console.log(params);

//         const response = await s3.getObject(params).promise();

//         const { pages } = JSON.parse(response.Body!.toString('utf-8'));

//         console.log('Retrieved JSON object:', pages);

//         return pages;
//     } catch (error) {
//         console.error('Error retrieving JSON object from S3:', error);
//         throw error;
//     }
// }
