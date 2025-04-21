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

export class SapoCollection implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Sapo Collection',
    name: 'sapoCollection',
    group: ['transform'],
    version: 1,
    description: 'Manage Sapo product collections',
    defaults: {
      name: 'Sapo Collection',
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
          { name: 'Add Product', value: 'addProduct' },
          { name: 'Count', value: 'count' },
          { name: 'Create Custom Collection', value: 'createCustom' },
          { name: 'Create Smart Collection', value: 'createSmart' },
          { name: 'Delete Custom Collection', value: 'deleteCustom' },
          { name: 'Delete Smart Collection', value: 'deleteSmart' },
          { name: 'Get', value: 'get' },
          { name: 'Get Many', value: 'getMany' },
          { name: 'Remove Product', value: 'removeProduct' },
          { name: 'Set Product Order', value: 'setProductOrder' },
          { name: 'Update Custom Collection', value: 'updateCustom' },
          { name: 'Update Smart Collection', value: 'updateSmart' },
        ],
        default: 'getMany',
      },
      {
        displayName: 'Collection ID',
        name: 'collectionId',
        type: 'number',
        displayOptions: {
          show: {
            operation: [
              'get',
              'updateCustom',
              'updateSmart',
              'deleteCustom',
              'deleteSmart',
              'addProduct',
              'removeProduct',
              'setProductOrder',
            ],
          },
        },
        default: 0,
        required: true,
        description: 'ID of the collection',
      },
      {
        displayName: 'Product ID',
        name: 'productId',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['addProduct', 'removeProduct'],
          },
        },
        default: 0,
        required: true,
        description: 'ID of the product to add/remove',
      },
      {
        displayName: 'Product IDs',
        name: 'productIds',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['setProductOrder'],
          },
        },
        default: '',
        required: true,
        description: 'Comma-separated list of product IDs in desired order',
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
            displayName: 'Handle',
            name: 'handle',
            type: 'string',
            default: '',
            placeholder: 'my-collection',
            description: 'URL-friendly identifier for the collection',
          },
          {
            displayName: 'Published Status',
            name: 'published_status',
            type: 'options',
            options: [
              { name: 'Published', value: 'published' },
              { name: 'Unpublished', value: 'unpublished' },
              { name: 'Any', value: 'any' },
            ],
            default: 'any',
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
      {
        displayName: 'Custom Collection Data',
        name: 'data',
        type: 'json',
        displayOptions: {
          show: {
            operation: ['createCustom', 'updateCustom'],
          },
        },
        default: '{\n  "title": "My Collection",\n  "body_html": "<p>Collection description</p>",\n  "published": true\n}',
        required: true,
        description: 'The data to create/update a custom collection',
      },
      {
        displayName: 'Smart Collection Data',
        name: 'data',
        type: 'json',
        displayOptions: {
          show: {
            operation: ['createSmart', 'updateSmart'],
          },
        },
        default: '{\n  "title": "My Smart Collection",\n  "rules": [\n    {\n      "column": "title",\n      "relation": "contains",\n      "condition": "shirt"\n    }\n  ]\n}',
        required: true,
        description: 'The data to create/update a smart collection',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    try {
      const apiBase = new SapoApiBase(this);
      const collections = await apiBase.collections();

      let responseData: SapoResponse = {};

      if (operation === 'createCustom') {
        const data = this.getNodeParameter('data', 0) as IDataObject;
        const response = await collections.createCustomCollection(data as any);
        responseData = response as SapoResponse;
      } else if (operation === 'createSmart') {
        const data = this.getNodeParameter('data', 0) as IDataObject;
        const response = await collections.createSmartCollection(data as any);
        responseData = response as SapoResponse;
      } else if (operation === 'get') {
        const collectionId = this.getNodeParameter('collectionId', 0) as number;
        const response = await collections.get(collectionId);
        responseData = response as SapoResponse;
      } else if (operation === 'getMany') {
        const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
        const filters = this.getNodeParameter('additionalFields', 0) as IDataObject;
        if (returnAll) {
          const response = await collections.list(filters as any);
          responseData = response as unknown as SapoResponse;
        } else {
          const limit = this.getNodeParameter('limit', 0) as number;
          const response = await collections.list({ ...filters, limit } as any);
          responseData = response as unknown as SapoResponse;
        }
      } else if (operation === 'updateCustom') {
        const collectionId = this.getNodeParameter('collectionId', 0) as number;
        const data = this.getNodeParameter('data', 0) as IDataObject;
        const response = await collections.updateCustomCollection(collectionId, data as any);
        responseData = response as SapoResponse;
      } else if (operation === 'updateSmart') {
        const collectionId = this.getNodeParameter('collectionId', 0) as number;
        const data = this.getNodeParameter('data', 0) as IDataObject;
        const response = await collections.updateSmartCollection(collectionId, data as any);
        responseData = response as SapoResponse;
      } else if (operation === 'deleteCustom') {
        const collectionId = this.getNodeParameter('collectionId', 0) as number;
        await collections.deleteCustomCollection(collectionId);
        responseData = { success: true };
      } else if (operation === 'deleteSmart') {
        const collectionId = this.getNodeParameter('collectionId', 0) as number;
        await collections.deleteSmartCollection(collectionId);
        responseData = { success: true };
      } else if (operation === 'addProduct') {
        const collectionId = this.getNodeParameter('collectionId', 0) as number;
        const productId = this.getNodeParameter('productId', 0) as number;
        await collections.addProduct(collectionId, productId);
        responseData = { success: true };
      } else if (operation === 'removeProduct') {
        const collectionId = this.getNodeParameter('collectionId', 0) as number;
        const productId = this.getNodeParameter('productId', 0) as number;
        await collections.removeProduct(collectionId, productId);
        responseData = { success: true };
      } else if (operation === 'setProductOrder') {
        const collectionId = this.getNodeParameter('collectionId', 0) as number;
        const productIdsStr = this.getNodeParameter('productIds', 0) as string;
        const productIds = productIdsStr.split(',').map(id => parseInt(id.trim(), 10));
        const response = await collections.setProductOrder(collectionId, productIds);
        responseData = response as SapoResponse;
      } else if (operation === 'count') {
        const count = await collections.count();
        responseData = { count };
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
