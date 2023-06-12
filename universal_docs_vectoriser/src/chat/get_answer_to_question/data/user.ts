import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDB } from 'aws-sdk';
import { Item } from './base';
import { getClient } from './client';
export enum UserProperty {
    MEMORY = 'memory',
    EMAIL = 'email',
    // Add other properties here
}
export interface UserObject {
    userId: string;
    email: string;
    password: string;
    memory?: string; // Added optional memory property
}

export class User extends Item {
    userId: string;
    email?: string;
    password?: string;
    memory?: string; // Added optional memory property

    constructor(userId: string, email?: string, password?: string, memory?: string) {
        super();
        this.userId = userId;
        this.email = email;
        this.password = password;
        this.memory = memory;
    }

    static fromItem(item?: UserObject): User {
        if (!item || !item.userId || !item.email) {
            throw new Error('Invalid item or missing email attribute');
        }
        return new User(item.userId, item.email, item.password, item.memory);
    }

    get pk(): string {
        return `USER#${this.userId}`;
    }

    get sk(): string {
        return `USER#${this.userId}`;
    }
    toItem(): Record<string, unknown> {
        const item: Record<string, unknown> = {
            ...this.keys(),
            userId: this.userId,
            email: this.email,
            password: this.password,
        };

        if (this.memory) {
            item.memory = this.memory;
        }

        return item;
    }

    // Generic function to get a property from the user on DynamoDB
    async getProperty<T>(property: UserProperty): Promise<T | null> {
        if (!property) {
            throw new Error('Invalid property');
        }

        const propertyName = property.toString();
        const client = getClient();

        try {
            const getCommand = new GetCommand({
                TableName: process.env.TABLE_NAME,
                Key: this.keys(),
                ProjectionExpression: propertyName, // Specify the desired property
            });
            const resp = await client.send(getCommand);
            if (resp.Item && resp.Item[propertyName]) {
                return resp.Item[propertyName] as T;
            } else {
                return null; // Property not found
            }
        } catch (error) {
            console.log(error);
            throw new Error(`Error retrieving user property: ${propertyName}`);
        }
    }
    async addMemoryId(memoryId: string): Promise<void> {
        this.memory = memoryId;
        const client = getClient();

        try {
            const updateCommand = new UpdateCommand({
                TableName: process.env.TABLE_NAME,
                Key: this.keys(),
                UpdateExpression: 'SET #mem = :mem',
                ExpressionAttributeNames: {
                    '#mem': 'memory',
                },
                ExpressionAttributeValues: {
                    ':mem': memoryId,
                },
            });
            await client.send(updateCommand);
        } catch (error) {
            console.log(error);
            throw new Error('Error adding memory ID to the user');
        }
    }
}

export const createUser = async (user: User): Promise<User> => {
    const client = getClient();

    try {
        const putCommand = new PutCommand({
            TableName: process.env.TABLE_NAME,
            Item: user.toItem(),
            ConditionExpression: 'attribute_not_exists(PK)',
        });
        await client.send(putCommand);

        return user;
    } catch (error) {
        console.log(error);
        throw new Error('Error creating user');
    }
};

export const getUser = async (userId: string): Promise<User | null> => {
    const client = getClient();
    const user = new User(userId);

    try {
        const getCommand = new GetCommand({
            TableName: process.env.TABLE_NAME,
            Key: user.keys(),
        });
        const resp = await client.send(getCommand);
        if (resp.Item) {
            return User.fromItem(resp.Item as UserObject);
        } else {
            return null; // User not found
        }
    } catch (error) {
        console.log(error);
        throw new Error('Error retrieving user');
    }
};
