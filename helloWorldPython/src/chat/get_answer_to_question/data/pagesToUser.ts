import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Item } from './base';
import { getClient } from './client';
import { Page, PageObject } from './page';
import { User } from './user';

interface RelationItem {
    url: string;
    userId: string;
}

export class Relation extends Item {
    user: User;
    page: Page;

    constructor(url: string, userId: string) {
        super();
        this.page = new Page(url);
        this.user = new User(userId);
    }

    static fromItem(item?: RelationItem): Relation {
        if (!item || !item.url || item.userId) {
            throw new Error('Invalid item or missing url attribute');
        }

        return new Relation(item.url, item.userId);
    }

    get pk(): string {
        return this.user.pk;
    }

    get sk(): string {
        return this.page.pk;
    }

    get gsi1pk(): string {
        return this.page.pk;
    }

    get gsi1sk(): string {
        return this.user.pk;
    }

    toItem(): Record<string, unknown> {
        return {
            ...this.keys(),
            GSI1PK: this.gsi1pk,
            GSI1SK: this.gsi1sk,
            id: this.user.userId,
            url: this.page.url,
        };
    }
}

export const createRelationship = async (relation: Relation): Promise<Relation> => {
    // TODO: check that page exists
    const client = getClient();
    console.log('Creating relationship', relation);

    try {
        const putCommand = new PutCommand({
            TableName: process.env.TABLE_NAME,
            Item: relation.toItem(),
            ConditionExpression: 'attribute_not_exists(PK)',
        });
        await client.send(putCommand);

        return relation;
    } catch (error: any) {
        if (error.name === 'ConditionalCheckFailedException') {
            console.log('Relationship already exists:', relation);
            return relation;
        } else {
            console.log(error);
            throw new Error(`Error creating relation: ${error} \n ${JSON.stringify(relation)}`);
        }
    }
};

// export const batchCreateRelationship = async (MTM: MTMHandler): Promise<MTMHandler> => {
//     const client = getClient();

//     try {
//         const putCommand = new PutCommand({
//             TableName: process.env.TABLE_NAME,
//             Item: MTM.toItem(),
//             ConditionExpression: 'attribute_not_exists(PK)',
//         });
//         await client.send(putCommand);

//         return MTM;
//     } catch (error) {
//         console.log(error);
//         throw new Error('Error creating user');
//     }
// };

export const getAllPagesForUser = async (userId: string): Promise<Relation[] | undefined> => {
    const client = getClient();
    const user = new User(userId);

    let relations: Relation[];

    try {
        const params = {
            TableName: process.env.TABLE_NAME,
            IndexName: 'GSI1',
            KeyConditionExpression: 'PK = :userPK and begins_with(SK, :pageSK)',
            ExpressionAttributeValues: {
                ':userPK': { S: user.pk },
                ':pageSK': { S: 'PAGE#' },
            },
        };
        const queryCommand = new QueryCommand(params);
        const resp = await client.send(queryCommand);
        if (resp.Items) {
            relations = resp.Items.map((item) => Relation.fromItem(item as RelationItem));
            return relations;
        } else {
            return undefined; // User not found
        }
    } catch (error) {
        console.log(error);
        throw error;
    }
};

export const getAllUsersForPage = async (url: string): Promise<Relation[] | undefined> => {
    const client = getClient();
    const page = new Page(url);

    let relations: Relation[];

    try {
        const params = {
            TableName: process.env.TABLE_NAME,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pagePK and begins_with(GSI1SK, :userSK)',
            ExpressionAttributeValues: {
                ':pagePK': { S: page.pk },
                ':userSK': { S: 'USER#' },
            },
        };
        const queryCommand = new QueryCommand(params);
        const resp = await client.send(queryCommand);
        if (resp.Items) {
            relations = resp.Items.map((item) => Relation.fromItem(item as RelationItem));
            return relations;
        } else {
            return undefined; // User not found
        }
    } catch (error) {
        console.log(error);
        throw error;
    }
};

export const getConnection = async (url: string): Promise<Page | null> => {
    const client = getClient();
    const page = new Page(url);

    try {
        const getCommand = new GetCommand({
            TableName: process.env.TABLE_NAME,
            Key: page.keys(),
        });
        const resp = await client.send(getCommand);
        if (resp.Item) {
            return Page.fromItem(resp.Item as PageObject);
        } else {
            return null; // User not found
        }
    } catch (error) {
        console.log(error);
        throw new Error('Error retrieving page');
    }
};
