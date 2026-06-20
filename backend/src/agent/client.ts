import { CopilotClient } from "@github/copilot-sdk";

let _client: CopilotClient | null = null;

export async function getCopilotClient(): Promise<CopilotClient> {
  if (!_client) {
    _client = new CopilotClient({
      ...(process.env.GITHUB_TOKEN ? { githubToken: process.env.GITHUB_TOKEN } : {}),
    });
    await _client.start();
  }
  return _client;
}

export async function stopCopilotClient(): Promise<void> {
  if (_client) {
    await _client.stop();
    _client = null;
  }
}
