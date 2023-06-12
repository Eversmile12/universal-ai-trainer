import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDB } from 'aws-sdk';
import { Item } from './base';
import { getClient } from './client';
export interface UserObject {
    userId: string;
    email: string;
    password: string;
}
export class User extends Item {
    userId: string;
    email?: string;
    password?: string;

    constructor(userId: string, email?: string, password?: string) {
        super();
        this.userId = userId;
        this.email = email;
        this.password = password;
    }

    static fromItem(item?: UserObject): User {
        if (!item || !item.userId || !item.email) {
            throw new Error('Invalid item or missing email attribute');
        }
        return new User(item.userId, item.email, item.password);
    }

    get pk(): string {
        return `USER#${this.userId}`;
    }

    get sk(): string {
        return `USER#${this.userId}`;
    }

    toItem(): Record<string, unknown> {
        return {
            ...this.keys(),
            userId: this.userId,
            email: this.email,
            password: this.password,
        };
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
