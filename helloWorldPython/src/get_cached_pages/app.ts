// Create a DocumentClient that represents the query to add an item
import AWS from 'aws-sdk';
import { Status, updateJob } from './data/job';
import { Page, getPage } from './data/page';

// Get the DynamoDB table name from environment variables
const tableName = process.env.PAGES_TABLE;
// interface Page {
//     url: string;
//     chunks: Chunk[];
// }

export const handler = async (event: any, context: any): Promise<any> => {
    console.log(event);
    const { pages, userId, jobId, indexName } = event;
    await updateJob(jobId, Status.VECTORIZING);
    try {
        console.log('Pages: ', pages);
        if (!Array.isArray(pages) || !pages.every((page) => typeof page === 'object')) {
            throw new Error();
        }
    } catch {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ msg: 'Invalid links data' }),
        };
    }

    for (const page of pages) {
        const url = page.url;

        try {
            const cachedPage: Page | null = await getPage(url);
            console.log(cachedPage);
            if (cachedPage?.chunks && cachedPage.chunks[0].embeddings?.length && cachedPage?.lastScraped) {
                // parse the lastScraped date
                const lastScrapedDate = new Date(cachedPage.lastScraped);
                // get the date a month ago
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                // check if the lastScraped date is newer than a month ago
                if (lastScrapedDate >= monthAgo) {
                    page.cached = true;
                } else {
                    page.cached = false;
                }
            } else {
                page.cached = false;
                console.log('no embeddings found');
            }
        } catch (err) {
            console.log('Error', err);
        }
    }

    return {
        userId,
        jobId,
        indexName,
        pages,
    };
};

// async function storeJSONToS3(objectKey: string, payload: Object, s3: any): Promise<void> {
//     try {
//         const params = {
//             Bucket: process.env.S3_BUCKET,
//             Key: objectKey,
//             Body: JSON.stringify(payload),
//             ContentType: 'application/json',
//         };

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

//         const response = await s3.getObject(params).promise();

//         const { pages } = JSON.parse(response.Body!.toString('utf-8'));

//         console.log('Retrieved JSON object:', pages);

//         return pages;
//     } catch (error) {
//         console.error('Error retrieving JSON object from S3:', error);
//         throw error;
//     }
// }
