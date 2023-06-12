// Create a DocumentClient that represents the query to add an item
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Page, PageObject, Chunk, getPage } from './data/page';

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

// Get the DynamoDB table name from environment variables
const tableName = process.env.PAGES_TABLE;
// interface Page {
//     url: string;
//     chunks: Chunk[];
// }

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (!event.body || event.httpMethod !== 'POST') {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ msg: 'Bad Request' }),
        };
    }

    const body = JSON.parse(event.body);
    const pages: PageObject[] = body.pages;
    const userId = body.userId;

    try {
        console.log(tableName);
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
        console.log(url);

        try {
            const cachedPage: Page | null = await getPage(url);
            if (cachedPage) {
                page.cached = true;
            } else {
                console.log('no embeddings found');
            }
        } catch (err) {
            console.log('Error', err);
        }
    }

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages, userId }),
    };
};
