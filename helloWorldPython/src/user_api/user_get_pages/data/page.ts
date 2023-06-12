import { GetCommand, PutCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { Item } from './base';
import { getClient } from './client';

export interface PageObject {
    url: string;
    chunks?: Chunk[] | undefined;
    lastScraped?: Date | undefined;
    cached: boolean;
}

export interface Chunk {
    id: string;
    values: number[];
    metadata: {
        text: string;
        url: string;
    };
}

export class Page extends Item {
    url: string;
    chunks?: Chunk[];
    error?: string | undefined;
    cached: boolean = false;

    constructor(url: string, chunks?: Chunk[]) {
        super();
        this.url = url;
        this.chunks = chunks;
    }

    static fromItem(item?: PageObject): Page {
        if (!item || !item.url || !item.chunks) {
            throw new Error('Invalid item or missing url attribute');
        }

        return new Page(item.url, item.chunks);
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
        return {
            ...this.keys(),
            url: this.url,
            chunks: this.chunks,
            lastScraped: Date.now().toLocaleString(),
        };
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
