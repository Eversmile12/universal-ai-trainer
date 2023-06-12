import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Item } from './base';
import { getClient } from './client';
import AWS from 'aws-sdk';

export interface PageObject {
    url: string;
    cached: boolean;
    chunks?: Chunk[] | undefined;
    lastScraped?: string | undefined;
}

export interface Chunk {
    id: string;
    embeddings: number[];
    metadata: {
        text: string;
        url: string;
    };
}

export class Page extends Item {
    url: string;
    chunks?: Chunk[];
    error?: string | undefined;
    lastScraped?: string | undefined;
    cached: boolean = false;

    constructor(url: string, chunks?: Chunk[], lastScraped?: string) {
        super();
        this.url = url;
        this.chunks = chunks;
        if (!lastScraped) this.lastScraped = new Date().toISOString();
        else this.lastScraped = lastScraped;
    }

    static fromItem(item?: PageObject): Page {
        if (!item || !item.url) {
            throw new Error('Invalid item or missing url attribute');
        }

        return new Page(item.url, item.chunks, item.lastScraped);
    }

    get pk(): string {
        return `PAGE#${this.url}`;
    }

    get sk(): string {
        return `PAGE#${this.url}`;
    }

    // get gsi1pk(): string {
    //   return this.sk
    // }

    get gsi1sk(): string {
        return `PAGE#${this.url}`;
    }

    toItem(): Record<string, unknown> {
        const item: Record<string, unknown> = {
            ...this.keys(),
            url: this.url,
            chunks: this.chunks,
        };
        if (this.lastScraped) item.lastScraped = this.lastScraped;
        return item;
    }
}

export const createPage = async (page: Page): Promise<Page> => {
    const client = getClient();

    try {
        const putCommand = new PutCommand({
            TableName: process.env.TABLE_NAME,
            Item: page.toItem(),
            ConditionExpression: 'attribute_not_exists(PK)',
        });
        await client.send(putCommand);

        return page;
    } catch (error: any) {
        if (error.name === 'ConditionalCheckFailedException') {
            console.log('Page already exists:', page);
            return page;
        } else {
            console.log(error);
            throw new Error('Error creating page');
        }
    }
};

export const updatePage = async (url: string, newChunks: Chunk[]): Promise<Page | undefined> => {
    const client = getClient();
    const page = new Page(url);
    const uploadedChunks = await Promise.all(
        newChunks.map(async (chunk) => {
            return {
                id: chunk.id,
                embeddings: await storeJSONToS3(chunk.embeddings, chunk.id),
                metadata: {
                    text: chunk.metadata.text,
                    url: chunk.metadata.url,
                },
            };
        }),
    );
    try {
        const updateCommand = new UpdateCommand({
            TableName: process.env.TABLE_NAME,
            Key: page.keys(),
            UpdateExpression: 'SET #chunks = :newChunks',
            ExpressionAttributeNames: {
                '#chunks': 'chunks',
            },
            ExpressionAttributeValues: {
                ':newChunks': uploadedChunks,
            },
        });
        await client.send(updateCommand);
        console.log('Page updated successfully');
        // Retrieve the updated page
        return page;
    } catch (error) {
        console.log(error);
        return undefined;
    }
};

export const getPage = async (url: string): Promise<Page | null> => {
    const client = getClient();
    const page = new Page(url);

    try {
        console.log(page.keys());
        const getCommand = new GetCommand({
            TableName: process.env.TABLE_NAME,
            Key: page.keys(),
        });
        const resp = await client.send(getCommand);
        if (resp.Item) {
            // @ts-ignore
            return Page.fromItem(resp.Item);
        } else {
            return null; // User not found
        }
    } catch (error) {
        console.log(error);
        throw new Error('Error retrieving page');
    }
};

export const getJobPage = async (url: string): Promise<Page | null> => {
    const client = getClient();
    const page = new Page(url);

    try {
        console.log(page.keys());
        const getCommand = new GetCommand({
            TableName: process.env.JOBS_TABLE,
            Key: page.keys(),
        });
        const resp = await client.send(getCommand);
        if (resp.Item) {
            // @ts-ignore
            return Page.fromItem(resp.Item);
        } else {
            return null; // User not found
        }
    } catch (error) {
        console.log(error);
        throw new Error('Error retrieving page');
    }
};

async function storeJSONToS3(payload: Object, objectKey: string): Promise<string> {
    const s3 = new AWS.S3();
    try {
        const params = {
            Bucket: process.env.S3_BUCKET!,
            Key: objectKey,
            Body: JSON.stringify({ embeddings: payload }),
            ContentType: 'application/json',
        };
        console.log(params);
        await s3.putObject(params).promise();
        return objectKey;
        console.log(`Successfully stored JSON object in S3: ${process.env.S3_BUCKET}/${objectKey}`);
    } catch (error) {
        console.error('Error storing JSON object in S3:', error);
        throw error;
    }
}
