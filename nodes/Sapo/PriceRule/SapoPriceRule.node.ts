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

export class SapoPriceRule implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Sapo Price Rule',
    name: 'sapoPriceRule',
    group: ['transform'],
    version: 1,
    description: 'Manage Sapo price rules and discounts',
    defaults: {
      name: 'Sapo Price Rule',
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
        displayName: 'Price Rule ID',
        name: 'priceRuleId',
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
            displayName: 'Status',
            name: 'status',
            type: 'options',
            options: [
              { name: 'Active', value: 'active' },
              { name: 'Disabled', value: 'disabled' },
              { name: 'Expired', value: 'expired' },
            ],
            default: 'active',
          },
          {
            displayName: 'Title',
            name: 'title',
            type: 'string',
            default: '',
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
        ],
      },
      {
        displayName: 'Price Rule Data',
        name: 'data',
        type: 'json',
        displayOptions: {
          show: {
            operation: ['create', 'update'],
          },
        },
        default: '{\n  "title": "Summer Sale",\n  "value_type": "percentage",\n  "value": "-20.0",\n  "starts_at": "2024-06-01T00:00:00Z",\n  "ends_at": "2024-08-31T23:59:59Z",\n  "customer_selection": "all",\n  "target_type": "line_item",\n  "target_selection": "all"\n}',
        required: true,
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    try {
      const apiBase = new SapoApiBase(this);
      const priceRules = await apiBase.priceRules();

      let responseData: SapoResponse = {};

      if (operation === 'create') {
        const data = this.getNodeParameter('data', 0) as IDataObject;
        const response = await priceRules.create(data as any);
        responseData = response as SapoResponse;
      } else if (operation === 'get') {
        const priceRuleId = this.getNodeParameter('priceRuleId', 0) as number;
        const response = await priceRules.get(priceRuleId);
        responseData = response as SapoResponse;
      } else if (operation === 'getMany') {
        const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
        const filters = this.getNodeParameter('additionalFields', 0) as IDataObject;
        if (returnAll) {
          const response = await priceRules.list(filters as any);
          responseData = response as unknown as SapoResponse;
        } else {
          const limit = this.getNodeParameter('limit', 0) as number;
          const response = await priceRules.list({ ...filters, limit } as any);
          responseData = response as unknown as SapoResponse;
        }
      } else if (operation === 'update') {
        const priceRuleId = this.getNodeParameter('priceRuleId', 0) as number;
        const data = this.getNodeParameter('data', 0) as IDataObject;
        const response = await priceRules.update(priceRuleId, data as any);
        responseData = response as SapoResponse;
      } else if (operation === 'delete') {
        const priceRuleId = this.getNodeParameter('priceRuleId', 0) as number;
        await priceRules.delete(priceRuleId);
        responseData = { success: true };
      } else if (operation === 'count') {
        const count = await priceRules.count();
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
