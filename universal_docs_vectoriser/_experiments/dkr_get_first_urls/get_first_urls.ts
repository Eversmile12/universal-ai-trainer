// const chromium = require("chrome-aws-lambda");
// const { URL } = require("url");
// let response;

// exports.handler = async (event, context, callback) => {
//   let browser = null;

//   try {
//     browser = await chromium.puppeteer.launch({
//       args: chromium.args,
//       defaultViewport: chromium.defaultViewport,
//       executablePath: await chromium.executablePath,
//       headless: chromium.headless,
//       ignoreHTTPSErrors: true,
//     });

//     let page = await browser.newPage();
//     console.log("Event:");
//     console.log(event);

//     const url = event.pathParameters.url;
//     const fullUrl = url.includes("https://") ? url : `https://${url}`;

//     console.log("Full URL:", fullUrl);

//     await page.goto(fullUrl);

//     const links = await page.$$eval("a", (links) => links.map((a) => a.href));

//     const filteredLinks = links.filter((link) => {
//       const pageUrl = new URL(link);
//       const domainUrl = new URL(fullUrl);
//       return pageUrl.hostname == domainUrl.hostname;
//     });
//     console.log("filteredLinks", filteredLinks.length);

//     console.log(filteredLinks);

//     if (filteredLinks.length < 10) {
//       for (let link of filteredLinks) {
//         await page.goto(link);
//         console.log("Scraping ====>> ", link);
//         const pageLinks = await page.$$eval("a", (links) =>
//           links.map((a) => a.href)
//         );
//         const filteredPageLinks = pageLinks.filter((pageLink) => {
//           const pageUrl = new URL(pageLink);
//           const domainUrl = new URL(fullUrl);

//           return (
//             pageUrl.hostname == domainUrl.hostname &&
//             !filteredLinks.includes(pageLink)
//           );
//         });

//         if (filteredPageLinks) {
//           filteredLinks.push(...filteredPageLinks);
//         }
//         if (filteredLinks.length() >= 10) {
//           break;
//         }
//       }
//     }

//     const removeDuplicates = (array) => {
//       return [...new Set(array)];
//     };

//     function sortArrayAlphabetically(arr) {
//       return arr.sort((a, b) => a.localeCompare(b));
//     }

//     const pagesObject = sortArrayAlphabetically(
//       removeDuplicates(filteredLinks).slice(0, 10)
//     ).map((page) => {
//       return {
//         url: page,
//       };
//     });
//     console.log(pagesObject);

//     response = {
//       statusCode: 200,
//       body: JSON.stringify({
//         pages: pagesObject,
//       }),
//     };
//   } catch (error) {
//     console.log(error);

//     response = {
//       statusCode: 200,
//       body: JSON.stringify({
//         message: "An error occurred.",
//         error: error,
//       }),
//     };
//   } finally {
//     if (browser !== null) {
//       await browser.close();
//     }
//   }

//   return response;
// };
