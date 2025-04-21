import type {
  IExecuteFunctions,
  ILoadOptionsFunctions,
  IHookFunctions,
  IWebhookFunctions,
  JsonObject,
  ICredentialDataDecryptedObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { SapoClient } from 'sapo-client-sdk';

export class SapoApiBase {
  private client!: SapoClient;

  constructor(
    private readonly thisArg:
      | IExecuteFunctions
      | ILoadOptionsFunctions
      | IHookFunctions
      | IWebhookFunctions,
  ) {}

  private async initialize(): Promise<void> {
    try {
      const credentials = (await this.thisArg.getCredentials(
        'sapoApi',
      )) as ICredentialDataDecryptedObject;
      // Initialize client with required auth config
      this.client = new SapoClient({
				type: 'private',
        apiKey: credentials.apiKey as string,
        secretKey: credentials.secretKey as string,
        store: credentials.store as string,
      } as any); // Cast as any to bypass type checking
      const token = credentials.accessToken as string;
      if (token) {
        this.client.setAccessToken(token);
      }
    } catch (error) {
      throw new NodeApiError(this.thisArg.getNode(), {
        message: 'Failed to initialize Sapo client',
        description: (error as Error).message,
      } as JsonObject);
    }
  }

  private async getClient(): Promise<SapoClient> {
    if (!this.client) {
      await this.initialize();
    }
    return this.client;
  }

  async products() {
    const client = await this.getClient();
    return client.products;
  }

  async orders() {
    const client = await this.getClient();
    return client.orders;
  }

  async customers() {
    const client = await this.getClient();
    return client.customers;
  }

  async collections() {
    const client = await this.getClient();
    return client.collections;
  }

  async inventory() {
    const client = await this.getClient();
    return client.inventory;
  }

  async priceRules() {
    const client = await this.getClient();
    return client.priceRules;
  }

  async fulfillments() {
    const client = await this.getClient();
    return client.fulfillments;
  }

  async metafields() {
    const client = await this.getClient();
    return client.metafields;
  }

  async pages() {
    const client = await this.getClient();
    return client.pages;
  }

  async blogs() {
    const client = await this.getClient();
    return client.blogs;
  }

  async webhooks() {
    const client = await this.getClient();
    return client.webhooks;
  }
}
