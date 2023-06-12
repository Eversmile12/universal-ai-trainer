import { GetCommand, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Item } from './base';
import { getClient } from './client';
import { v4 as uuidv4 } from 'uuid';

export enum Status {
    'INITIALIZING' = 0,
    'SCRAPING' = 1,
    'VECTORIZING' = 2,
    'COMPLETE' = 3,
}

export interface JobObject {
    id: string;
    status: Status;
    error?: string | undefined;
}

export class Job extends Item {
    id: string;
    status: Status;
    error?: string | undefined;

    constructor(id?: string, status?: Status) {
        super();
        this.id = id ? id : uuidv4();
        this.status = status ? status : Status.INITIALIZING;
    }

    static fromItem(item?: JobObject): Job {
        if (!item || !item.id || !item.status) {
            throw new Error('Invalid item or missing id/status attribute');
        }

        return new Job(item.id, item.status);
    }

    get pk(): string {
        return `JOB#${this.id}`;
    }

    get sk(): string {
        return `JOB#${this.id}`;
    }

    toItem(): Record<string, unknown> {
        return {
            ...this.keys(),
            id: this.id,
            status: this.status,
        };
    }
}

export const addJob = async (job: Job): Promise<string> => {
    const client = getClient();

    try {
        const putCommand = new PutCommand({
            TableName: process.env.JOBS_TABLE,
            Item: job.toItem(),
            ConditionExpression: 'attribute_not_exists(PK)',
        });
        await client.send(putCommand);

        return job.id;
    } catch (error: any) {
        if (error.name === 'ConditionalCheckFailedException') {
            console.log('Job already exists:', job);
            return job.id;
        } else {
            console.log(error);
            throw new Error('Error creating job');
        }
    }
};

export const updateJob = async (id: string, status: Status): Promise<Job> => {
    const client = getClient();
    const job = new Job(id);

    try {
        const updateCommand = new UpdateCommand({
            TableName: process.env.JOBS_TABLE,
            Key: job.keys(),
            UpdateExpression: 'SET #status = :newStatus',
            ExpressionAttributeNames: {
                '#status': 'status',
            },
            ExpressionAttributeValues: {
                ':newStatus': status,
            },
        });
        await client.send(updateCommand);
        console.log('Job updated successfully');
        // Retrieve the updated job
        return job;
    } catch (error) {
        console.log(error);
        throw new Error('Error updating job');
    }
};

export const getJob = async (id: string): Promise<Job | null> => {
    const client = getClient();
    const job = new Job(id);

    try {
        console.log(job.keys());
        const getCommand = new GetCommand({
            TableName: process.env.JOBS_TABLE,
            Key: job.keys(),
        });
        const resp = await client.send(getCommand);
        if (resp.Item) {
            // @ts-ignore
            return Job.fromItem(resp.Item);
        } else {
            return null; // User not found
        }
    } catch (error) {
        console.log(error);
        throw new Error('Error retrieving job');
    }
};

export const getAllJobs = async (
    pageSize: number = 10,
    exclusiveStartKey?: string,
): Promise<{ jobs: Job[]; lastEvaluatedKey?: string }> => {
    const client = getClient();
    const scanCommand = new ScanCommand({
        TableName: process.env.JOBS_TABLE,
        Limit: pageSize,
        ExclusiveStartKey: exclusiveStartKey ? { id: exclusiveStartKey } : undefined,
    });

    try {
        const resp = await client.send(scanCommand);
        const jobs = resp.Items ? resp.Items.map((item: any) => Job.fromItem(item)) : [];

        const result: { jobs: Job[]; lastEvaluatedKey?: string } = { jobs };

        if (resp.LastEvaluatedKey) {
            result.lastEvaluatedKey = resp.LastEvaluatedKey.id;
        }

        return result;
    } catch (error) {
        console.log(error);
        throw new Error('Error retrieving jobs');
    }
};

export const getJobsByStatus = async (status: Status): Promise<Job[]> => {
    const client = getClient();
    const scanCommand = new ScanCommand({
        TableName: process.env.JOBS_TABLE,
        FilterExpression: 'status = :status',
        ExpressionAttributeValues: {
            ':status': status,
        },
    });

    try {
        const resp = await client.send(scanCommand);
        if (resp.Items) {
            return resp.Items.map((item: any) => Job.fromItem(item));
        } else {
            return []; // No jobs found with the given status
        }
    } catch (error) {
        console.log(error);
        throw new Error('Error retrieving jobs by status');
    }
};
