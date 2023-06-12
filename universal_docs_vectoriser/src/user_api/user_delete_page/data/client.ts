import { DynamoDBDocumentClient, GetCommand, } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

let ddbDocClient: DynamoDBClient | null = null;

export const getClient = (): DynamoDBClient => {
  if (ddbDocClient) return ddbDocClient;
  const dynamoClient = new DynamoDBClient({});
  ddbDocClient = DynamoDBDocumentClient.from(dynamoClient);
  return ddbDocClient;
};
