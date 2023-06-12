// Create a DocumentClient that represents the query to add an item
import { User, UserProperty } from './data/user';
import { BufferMemory } from 'langchain/memory';
import { DynamoDBChatMessageHistory } from 'langchain/stores/message/dynamodb';
import { PineconeHandler } from './pinecone/pinecone';
import {LLMChain}
// Get the DynamoDB table name from environment variables
const tableName = process.env.PAGES_TABLE;
// interface Page {
//     url: string;
//     chunks: Chunk[];
// }

export const handler = async (event: any, context: any): Promise<any> => {
    const { userId, message, chatSessionId, memoryId } = JSON.parse(event.body);
    console.log(event);
    if (userId) {
        if (!chatSessionId && !memoryId) {
            const user = new User(userId);
            const memory = user.getProperty(UserProperty.MEMORY);
            if (!memory) {
                user.addMemoryId('');
            }
        }
        const messageEmbedding = await getTextEmbeddings(message)
        const client = new PineconeHandler()
        await client.init({
            environment: 'us-east-1-aws',
            apiKey: process.env.PINECONE!,
        });
        try {
            const pineconeIndex = await client.getIndex('chat-web3-prod');
            if (pineconeIndex) {
                const response = await client.query(messageEmbedding);
                console.log('Pinecone response:', response);
                if (response) {
                    const context = response
                    .map((match) => match.metadata.text)
                        .join(" ");
                    console.log(context)
                }
            } else {
                
            }
        } catch (err) {
            console.log('Error:', err);
            return {
                statusCode: 500,
                message: `error: ${err}`,
            };
        }


        const memory = new BufferMemory({
            chatHistory: new DynamoDBChatMessageHistory({
                tableName: 'langchain',
                partitionKey: 'id',
                sessionId: new Date().toISOString(), // Or some other unique identifier for the conversation
                config: {
                    region: 'us-east-2',
                    credentials: {
                        accessKeyId: '<your AWS access key id>',
                        secretAccessKey: '<your AWS secret access key>',
                    },
                },
            }),
        });
    }
    return {
        statusCode: 200,
        body: JSON.stringify({ jobId: jobId }),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    };
};

async function getTextEmbeddings(message: string): Promise<number[]> {
    const url = 'https://api.openai.com/v1/embeddings';
    const headers = {
        Authorization: `Bearer ${process.env.OPEN_AI}`,
        'Content-Type': 'application/json',
    };
    const payload = {
        input: message,
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
    return response.data;
}

// async function storeJSONToS3(objectKey: string, payload: Object, s3: any): Promise<void> {
//     try {
//         const params = {
//             Bucket: process.env.S3_BUCKET,
//             Key: objectKey,
//             Body: JSON.stringify(payload),
//             ContentType: 'application/json',
//         };

//         await s3.putObject(params).promise();

//         console.log(`Successfully stored JSON object in S3: ${process.env.S3_BUCKET}/${objectKey}`);
//     } catch (error) {
//         console.error('Error storing JSON object in S3:', error);
//         throw error;
//     }
// }

// async function retrieveJSONFromS3(objectKey: string, s3: any): Promise<any> {
//     try {
//         const params = {
//             Bucket: process.env.S3_BUCKET,
//             Key: objectKey,
//         };

//         const response = await s3.getObject(params).promise();

//         const { pages } = JSON.parse(response.Body!.toString('utf-8'));

//         console.log('Retrieved JSON object:', pages);

//         return pages;
//     } catch (error) {
//         console.error('Error retrieving JSON object from S3:', error);
//         throw error;
//     }
// }
