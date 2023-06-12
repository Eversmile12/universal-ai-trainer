import { getPage, Page, PageObject, updatePage } from './lib/data/page';
import { PineconeHandler } from './lib/pinecone/pinecone';
import AWS from 'aws-sdk';

// TODO: ADD WORKFLOW WITHOUT USER ID TO TEST OUT

export async function handler(event: any, context: any): Promise<any> {
    console.log(event);
    const pages = event.Items.filter((page: PageObject) => !page.cached);
    console.log(pages);

    // let cachedPages: PageObject[] = [];
    // let newPages: any[] = [];

    const retrievedPages = await getPages(pages);

    const idsVectors: any[] = [];

    for (const page of retrievedPages) {
        if (page.chunks) {
            let processedPage: Page;
            console.log(page);
            processedPage = await processPageWithoutEmbeddings(page);
            if (processedPage.chunks)
                idsVectors.push(...processedPage.chunks.filter((chunk) => chunk.embeddings?.length));
            // if (page.cached && page.chunks && page.chunks[0]?.embeddings) {
            //     processPageWithEmbeddings(page);
            //     // idsVectors.push(...page.chunks);
            // } else if (page.chunks) {
            //     processedPage = await processPageWithoutEmbeddings(page);
            //     if (processedPage.chunks)
            //         idsVectors.push(...processedPage.chunks.filter((chunk) => chunk.embeddings?.length));
            // }
            //     await processPageWithEmbeddings(page, userId);
        }
    }

    // for (const page of cachedPages) {
    //     if (page.chunks) idsVectors.push(...page.chunks);
    // }

    if (idsVectors.length > 0) {
        const client = new PineconeHandler();
        await client.init({
            environment: 'us-east-1-aws',
            apiKey: process.env.PINECONE!,
        });
        try {
            const pineconeIndex = await client.getIndex('chat-web3-prod');
            if (pineconeIndex) {
                const response = await client.upsert(idsVectors, pineconeIndex);
                console.log('Pinecone response:', response);
                console.log('In', pineconeIndex);
                return {
                    statusCode: 200,
                    message: 'success',
                };
            } else {
                return {
                    statusCode: 404,
                    message: 'Pinecone index not found',
                };
            }
        } catch (err) {
            console.log('Error:', err);
            return {
                statusCode: 500,
                message: `error: ${err}`,
            };
        }
    }

    console.log('Processed pages without embeddings:', pages);
}

async function processPageWithoutEmbeddings(page: any, userId?: string): Promise<Page> {
    console.log('Processing page without embeddings:', page);
    const processedPage = await getTextEmbeddings(page);
    if (processedPage.chunks && processedPage.chunks[0]?.embeddings) {
        await updatePage(page.url, processedPage.chunks);
    } else {
        console.log('error updating the chunks - embedding or text not found?');
    }
    // const relation = new Relation(page.url, userId);
    // await createRelationship(relation);
    console.log('Page without embeddings processed:', page.url);
    return processedPage;
}

async function processPageWithEmbeddings(page: any, userId?: string): Promise<void> {
    console.log('Processing page with embeddings:', page);
    // const relation = new Relation(page.url, userId);
    // await createRelationship(relation);
    console.log('Page with embeddings processed:', page);
}

async function getTextEmbeddings(page: any): Promise<Page> {
    for (const chunk of page.chunks) {
        const url = 'https://api.openai.com/v1/embeddings';
        const headers = {
            Authorization: `Bearer ${process.env.OPEN_AI}`,
            'Content-Type': 'application/json',
        };
        const payload = {
            input: chunk.metadata.text,
            model: 'text-embedding-ada-002',
        };
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
        }).then((res) => res.json());

        if (!response) {
            console.log(`Failed to get embeddings for text: ${JSON.stringify(response.data)}`);
        }
        if (response.data) {
            const embeddings = response.data[0].embedding;
            if (!embeddings?.length) {
                chunk.error = 'Error:001 - unable to get chunks';
                console.log(response.data)
            } else {
                chunk.embeddings = embeddings;
                console.log('Embeddings processed for:', page);
            }
        }
    }

    return page;
}

async function getPages(pages: PageObject[]) {
    for (const page of pages) {
        const url = page.url;

        try {
            const retrievedPage: Page | null = await getPage(url);
            console.log('URL:', url);
            console.log('Retrieved page:', retrievedPage);
            if (retrievedPage && retrievedPage.chunks) {
                page.chunks = retrievedPage.chunks;
                if (retrievedPage.chunks[0].embeddings?.length) {
                    console.log('embeddings found for cached page: ', page.url);

                    page.cached = true;
                    page.chunks = retrievedPage.chunks;
                }
            } else {
                console.log('no embeddings found');
            }
        } catch (err) {
            console.log('Error', err);
        }
    }

    return pages;
}

async function deleteObjectFromS3(objectKey: string, s3: AWS.S3): Promise<void> {
    try {
        const params: AWS.S3.DeleteObjectRequest = {
            Bucket: process.env.S3_BUCKET!,
            Key: objectKey,
        };

        await s3.deleteObject(params).promise();

        console.log(`Successfully deleted object from S3: ${process.env.S3_BUCKET}/${objectKey}`);
    } catch (error) {
        console.error('Error deleting object from S3:', error);
        throw error;
    }
}

async function retrieveJSONFromS3(objectKey: string, s3: any): Promise<any> {
    try {
        const params = {
            Bucket: process.env.S3_BUCKET,
            Key: objectKey,
        };

        const response = await s3.getObject(params).promise();
        let pages = JSON.parse(response.Body.toString('utf-8'));
        console.log(pages);
        pages = pages.updatedPages;
        console.log('Retrieved JSON object:', pages);

        return pages;
    } catch (error) {
        console.error('Error retrieving JSON object from S3:', error);
        throw error;
    }
}
