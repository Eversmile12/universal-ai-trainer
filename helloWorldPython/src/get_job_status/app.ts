import { getJob } from './data/job';

export const handler = async (event: any) => {
    try {
        console.log(event.queryStringParameters);
        const jobId = event.queryStringParameters.jobId;

        if (!jobId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing jobId parameter' }),
            };
        }

        try {
            const job = await getJob(jobId);

            return {
                statusCode: 200,
                body: JSON.stringify({ job }),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
            };
        } catch (err) {
            console.log(err);
            return {
                statusCode: 500,
                body: JSON.stringify(err),
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
            body: JSON.stringify({ message: 'Error occurred', event }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        };
    }
};



