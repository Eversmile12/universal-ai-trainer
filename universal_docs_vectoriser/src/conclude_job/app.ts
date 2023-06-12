// Create a DocumentClient that represents the query to add an item
import { completeJob, Status, updateJob } from './data/job';

// Get the DynamoDB table name from environment variables
const tableName = process.env.JOBS_TABLE;
// interface Page {
//     url: string;
//     chunks: Chunk[];
// }

export const handler = async (event: any, context: any): Promise<any> => {
    console.log(event);
    const { jobId } = event;
    await completeJob(jobId);
    return {
        status: Status.COMPLETE,
        jobId: jobId,
    };
};

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
