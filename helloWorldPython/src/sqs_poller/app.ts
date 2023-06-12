import { StepFunctions } from 'aws-sdk';

const stepFunctions = new StepFunctions();
export const handler = async (event: any) => {
    try {
        const records = event.Records;

        for (const record of records) {
            const input = record.body; // Assuming the body contains the input data for the Step Function
            const startExecutionParams = {
                stateMachineArn: process.env.STEP_FUNCTION_ARN!,
                input: input,
            };

            await stepFunctions.startExecution(startExecutionParams).promise();

            console.log(`Started Step Function execution for record: ${JSON.stringify(record)}`);
        }
    } catch (error) {
        console.error('Error processing records:', error);
        throw error;
    }
};
