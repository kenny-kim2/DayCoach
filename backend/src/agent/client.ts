import OpenAI from "openai";

const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY ?? "";
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT ?? "";
const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o";

export function createAzureClient(): OpenAI {
  return new OpenAI({
    apiKey: AZURE_API_KEY,
    baseURL: `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}`,
    defaultQuery: { "api-version": "2024-02-15-preview" },
    defaultHeaders: { "api-key": AZURE_API_KEY },
  });
}

export { AZURE_DEPLOYMENT };
