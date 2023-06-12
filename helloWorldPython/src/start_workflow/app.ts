import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { addJob, Job } from './data/job';
const sqsClient = new SQSClient({ region: 'eu-central-1' });

export const handler = async (event: any) => {
    try {
        const { url, userId, MAX_PAGES } = JSON.parse(event.body);
        console.log(event);
        const job = new Job();
        const jobId = await addJob(job);
        const params = {
            DelaySeconds: 5,
            MessageBody: JSON.stringify({
                userId,
                pages: [{ url }],
                MAX_PAGES,
                jobId,
            }),
            QueueUrl: process.env.SQS_QUEUE_URL,
        };
        try {
            const data = await sqsClient.send(new SendMessageCommand(params));
            if (data) {
                console.log('Success, message sent. MessageID:', data.MessageId);
                const bodyMessage = 'Message Send to SQS- Here is MessageId: ' + data.MessageId;
                return {
                    statusCode: 200,
                    body: JSON.stringify({ jobId: jobId }),
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Credentials': true,
                    },
                };
            } else {
                return {
                    statusCode: 500,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Credentials': true,
                    },
                };
            }
        } catch (err) {
            console.log(err);
            return {
                statusCode: 500,
                body: JSON.stringify(err),
            };
        }
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'error occurred', event }),
        };
    }
};
