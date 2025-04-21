import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IDataObject,
  JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { SapoApiBase } from '../../SapoApiBase/SapoApiBase';

interface SapoResponse extends IDataObject {
  [key: string]: any;
}

export class SapoWebhook implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Sapo Webhook',
    name: 'sapoWebhook',
		icon: 'file:../shared/sapo.svg',
    group: ['transform'],
    version: 1,
    description: 'Manage Sapo webhooks',
    defaults: {
      name: 'Sapo Webhook',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'sapoApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Create', value: 'create' },
          { name: 'Delete', value: 'delete' },
          { name: 'Get', value: 'get' },
          { name: 'Get Many', value: 'getMany' },
          { name: 'Update', value: 'update' },
        ],
        default: 'getMany',
      },
      {
        displayName: 'Webhook ID',
        name: 'webhookId',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['get', 'update', 'delete'],
          },
        },
        default: 0,
        required: true,
      },
      {
        displayName: 'Return All',
        name: 'returnAll',
        type: 'boolean',
        displayOptions: {
          show: {
            operation: ['getMany'],
          },
        },
        default: false,
        description: 'Whether to return all results or only up to a given limit',
        noDataExpression: true,
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['getMany'],
            returnAll: [false],
          },
        },
        typeOptions: {
          minValue: 1,
        },
        default: 50,
        description: 'Max number of results to return',
      },
      {
        displayName: 'Webhook Data',
        name: 'data',
        type: 'json',
        displayOptions: {
          show: {
            operation: ['create', 'update'],
          },
        },
        default: '{\n  "topic": "orders/create",\n  "address": "https://example.com/webhook",\n  "format": "json",\n  "fields": ["id", "total_price", "created_on"],\n  "metafield_namespaces": ["inventory"]\n}',
        required: true,
        noDataExpression: true,
      },
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        displayOptions: {
          show: {
            operation: ['getMany'],
          },
        },
        default: {},
        description: 'Additional fields to add',
        placeholder: 'Add Field',
        options: [
          {
            displayName: 'Topic',
            name: 'topic',
            type: 'options',
            options: [
              { name: 'Articles Create', value: 'articles/create' },
              { name: 'Articles Delete', value: 'articles/delete' },
              { name: 'Articles Update', value: 'articles/update' },
              { name: 'Collections Create', value: 'collections/create' },
              { name: 'Collections Delete', value: 'collections/delete' },
              { name: 'Collections Update', value: 'collections/update' },
              { name: 'Customers Create', value: 'customers/create' },
              { name: 'Customers Delete', value: 'customers/delete' },
              { name: 'Customers Update', value: 'customers/update' },
              { name: 'Orders Create', value: 'orders/create' },
              { name: 'Orders Delete', value: 'orders/delete' },
              { name: 'Orders Paid', value: 'orders/paid' },
              { name: 'Orders Updated', value: 'orders/updated' },
              { name: 'Products Create', value: 'products/create' },
              { name: 'Products Delete', value: 'products/delete' },
              { name: 'Products Update', value: 'products/update' },
            ],
            default: 'orders/create',
          },
          {
            displayName: 'Created After',
            name: 'created_at_min',
            type: 'dateTime',
            default: '',
          },
          {
            displayName: 'Created Before',
            name: 'created_at_max',
            type: 'dateTime',
            default: '',
          },
          {
            displayName: 'Updated After',
            name: 'updated_at_min',
            type: 'dateTime',
            default: '',
          },
          {
            displayName: 'Updated Before',
            name: 'updated_at_max',
            type: 'dateTime',
            default: '',
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    try {
      const apiBase = new SapoApiBase(this);
      const webhooks = await apiBase.webhooks();

      let responseData: SapoResponse = {};

      if (operation === 'create') {
        const data = this.getNodeParameter('data', 0) as IDataObject;
        const response = await webhooks.create(data as any);
        responseData = response as SapoResponse;
      } else if (operation === 'get') {
        const webhookId = this.getNodeParameter('webhookId', 0) as number;
        const response = await webhooks.get(webhookId);
        responseData = response as SapoResponse;
      } else if (operation === 'getMany') {
        const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
        const filters = this.getNodeParameter('additionalFields', 0) as IDataObject;
        if (returnAll) {
          const response = await webhooks.list(filters as any);
          responseData = response as unknown as SapoResponse;
        } else {
          const limit = this.getNodeParameter('limit', 0) as number;
          const response = await webhooks.list({ ...filters, limit } as any);
          responseData = response as unknown as SapoResponse;
        }
      } else if (operation === 'update') {
        const webhookId = this.getNodeParameter('webhookId', 0) as number;
        const data = this.getNodeParameter('data', 0) as IDataObject;
        const response = await webhooks.update(webhookId, data as any);
        responseData = response as SapoResponse;
      } else if (operation === 'delete') {
        const webhookId = this.getNodeParameter('webhookId', 0) as number;
        await webhooks.delete(webhookId);
        responseData = { success: true };
      }

      returnData.push({ json: responseData });

    } catch (error) {
      if (this.continueOnFail()) {
        returnData.push({ json: { error: (error as Error).message } });
      } else {
        throw new NodeApiError(this.getNode(), {
          message: (error as Error).message,
          description: (error as Error).stack,
        } as JsonObject);
      }
    }

    return [returnData];
  }
}
