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

export class SapoCustomer implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Sapo Customer',
    name: 'sapoCustomer',
    group: ['transform'],
    version: 1,
    description: 'Manage Sapo customers',
    defaults: {
      name: 'Sapo Customer',
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
          { name: 'Count', value: 'count' },
          { name: 'Create', value: 'create' },
          { name: 'Delete', value: 'delete' },
          { name: 'Get', value: 'get' },
          { name: 'Get Many', value: 'getMany' },
          { name: 'Update', value: 'update' },
        ],
        default: 'getMany',
      },
      {
        displayName: 'Customer ID',
        name: 'customerId',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['get', 'update', 'delete'],
          },
        },
        default: 0,
        required: true,
        description: 'ID of the customer',
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
          {
            displayName: 'Email',
            name: 'email',
            type: 'string',
            placeholder: 'name@email.com',
            default: '',
          },
          {
            displayName: 'Phone',
            name: 'phone',
            type: 'string',
            placeholder: '+84123456789',
            default: '',
          },
        ],
      },
      {
        displayName: 'Data',
        name: 'data',
        type: 'json',
        displayOptions: {
          show: {
            operation: ['create', 'update'],
          },
        },
        default: {},
        required: true,
        description: 'The data to send to Sapo',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    try {
      const apiBase = new SapoApiBase(this);
      const customers = await apiBase.customers();

      let responseData: SapoResponse = {};

      if (operation === 'create') {
        const data = this.getNodeParameter('data', 0) as IDataObject;
        const response = await customers.create(data as any);
        responseData = response as SapoResponse;
      } else if (operation === 'get') {
        const customerId = this.getNodeParameter('customerId', 0) as number;
        const response = await customers.get(customerId);
        responseData = response as SapoResponse;
      } else if (operation === 'getMany') {
        const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
        const filters = this.getNodeParameter('additionalFields', 0) as IDataObject;
        if (returnAll) {
          const response = await customers.list(filters as any);
          responseData = response as unknown as SapoResponse;
        } else {
          const limit = this.getNodeParameter('limit', 0) as number;
          const response = await customers.list({ ...filters, limit } as any);
          responseData = response as unknown as SapoResponse;
        }
      } else if (operation === 'update') {
        const customerId = this.getNodeParameter('customerId', 0) as number;
        const data = this.getNodeParameter('data', 0) as IDataObject;
        const response = await customers.update(customerId, data as any);
        responseData = response as SapoResponse;
      } else if (operation === 'delete') {
        const customerId = this.getNodeParameter('customerId', 0) as number;
        await customers.delete(customerId);
        responseData = { success: true };
      } else if (operation === 'count') {
        const count = await customers.count();
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
