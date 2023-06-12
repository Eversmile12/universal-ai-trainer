const chromium = require("chrome-aws-lambda");
import { URL as UURL } from "url";
let response;

interface Chunk {
  id: string;
  url: string;
  text: string;
  embeddings?: string;
}
interface PageObject {
  url: string;
  text?: string;
  chunks?: Chunk[];
}

exports.handler = async (event: any, context: any, callback: any) => {
  let browser: any;
  browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });
  try {
    console.log("Browser launched");

    const flattenUrls = (pages: PageObject[]) => {
      const urls: string[] = [];
      const pagesWithChunks: PageObject[] = [];

      pages.forEach((page) => {
        if (!page.chunks) {
          urls.push(page.url);
        } else if (page.chunks) {
          pagesWithChunks.push(page);
        }
      });

      return { urls, pagesWithChunks };
    };

    const { pages } = JSON.parse(event.body);
    const { urls, pagesWithChunks } = flattenUrls(pages);
    let newPagesWithChunks: PageObject[] = [];

    let page = await browser.newPage();

    const MAX_PAGES = 50;
    let index = 1;

    for (let url of urls) {
      console.log(`Processing ${url}`);

      await page.goto(url);

      const pageText = await page.$$eval("*", (elements: any) =>
        elements.map((el: any) => el.textContent)
      );
      console.log(`Page text: ${pageText}`);

      newPagesWithChunks.push({
        url: url,
        text: pageText.join("\n"),
      });

      const pageLinks = await page.$$eval("a", (links: any) =>
        links.map((a: any) => a.href)
      );
      const filteredPageLinks = pageLinks.filter((pageLink: any) => {
        const pageUrl = new UURL(pageLink);
        const domainUrl = new UURL(url);
        return (
          pageUrl.hostname == domainUrl.hostname && !urls.includes(pageLink)
        );
      });
      console.log(`Filtered links: ${filteredPageLinks}`);

      if (filteredPageLinks.length) urls.push(...filteredPageLinks);
      index++;
      if (index >= MAX_PAGES) break;
    }

    response = {
      statusCode: 200,
      body: JSON.stringify({
        pages: pagesWithChunks.concat(newPagesWithChunks),
      }),
    };
  } catch (error) {
    console.log(error);

    response = {
      statusCode: 200,
      body: JSON.stringify({
        message: "An error occurred.",
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
