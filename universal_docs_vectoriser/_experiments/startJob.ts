const AWS = require("aws-sdk");
const stepfunctions = new AWS.StepFunctions();

exports.lambdaHandler = async (event, context) => {
  // Specify the ARN of the target Lambda function to invoke
  const targetLambdaArn =
    "arn:aws:lambda:REGION:ACCOUNT_ID:function:TARGET_LAMBDA_FUNCTION_NAME";

  // Create an input object containing the event to pass to the target Lambda function
  const input = {
    // Add your event data here
    key1: "value1",
    key2: "value2",
    // ...
  };

  // Start the execution of the Step Functions state machine
  const params = {
    stateMachineArn:
      "arn:aws:states:REGION:ACCOUNT_ID:stateMachine:STATE_MACHINE_NAME",
    input: JSON.stringify(input),
  };

  try {
    const response = await stepfunctions.startExecution(params).promise();
    console.log("Step Functions execution started:", response.executionArn);
    return response.executionArn;
  } catch (error) {
    console.error("Failed to start Step Functions execution:", error);
    throw error;
  }
};
