import { DynamoDB } from 'aws-sdk';

type executeTransactWriteInput = {
    params: DynamoDB.Types.TransactWriteItemsInput;
};

// Thanks, Paul Swail! https://github.com/aws/aws-sdk-js/issues/2464#issuecomment-503524701
export const executeTransactWrite = async ({ params }: executeTransactWriteInput) => {
   const client = new DynamoDB({
        httpOptions: {
            connectTimeout: 1000,
            timeout: 1000,
        },
    });
    const transactionRequest = client.transactWriteItems(params);
    let cancellationReasons: object;
    transactionRequest.on('extractError', (response) => {
        try {
            cancellationReasons = JSON.parse(response.httpResponse.body.toString()).CancellationReasons;
        } catch (err) {
            // suppress this just in case some types of errors aren't JSON parseable
            console.error('Error extracting cancellation error', err);
        }
    });
    return new Promise((resolve, reject) => {
        transactionRequest.send((err, response) => {
            if (err) {
                // @ts-ignore
                err.cancellationReasons = cancellationReasons;
                return reject(err);
            }
            return resolve(response);
        });
    });
};
