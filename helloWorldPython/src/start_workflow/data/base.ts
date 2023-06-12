import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export abstract class Item {
    abstract get pk(): string;
    abstract get sk(): string;

    public keys(): { PK: string; SK: string } {
        return {
            PK: this.pk,
            SK: this.sk,
        };
    }

    abstract toItem(): Record<string, unknown>;
}
