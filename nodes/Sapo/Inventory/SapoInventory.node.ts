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
import type {
  InventoryAdjustment,
  InventoryTransferData,
  InventoryAdjustmentAction
} from 'sapo-client-sdk';

interface SapoResponse extends IDataObject {
  [key: string]: any;
}

export class SapoInventory implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Sapo Inventory',
    name: 'sapoInventory',
    group: ['transform'],
    version: 1,
    description: 'Manage Sapo inventory',
    defaults: {
      name: 'Sapo Inventory',
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
          { name: 'Adjust Quantity', value: 'adjustQuantity' },
          { name: 'Cancel Transfer', value: 'cancelTransfer' },
          { name: 'Get', value: 'get' },
          { name: 'Get Location', value: 'getLocation' },
          { name: 'Get Many', value: 'getMany' },
          { name: 'Get Transfer', value: 'getTransfer' },
          { name: 'List Locations', value: 'listLocations' },
          { name: 'Set Level', value: 'setLevel' },
          { name: 'Transfer', value: 'transfer' },
        ],
        default: 'getMany',
      },
      {
        displayName: 'Product ID',
        name: 'productId',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['get', 'adjustQuantity', 'setLevel', 'transfer', 'getTransfer', 'cancelTransfer'],
          },
        },
        default: 0,
        required: true,
        description: 'ID of the inventory item',
      },
      {
        displayName: 'Action',
        name: 'action',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['adjustQuantity'],
          },
        },
        options: [
          { name: 'Set', value: 'set' },
          { name: 'Add', value: 'add' },
          { name: 'Remove', value: 'remove' },
        ],
        default: 'set',
      },
      {
        displayName: 'Location ID',
        name: 'locationId',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['setLevel', 'transfer', 'getLocation'],
          },
        },
        default: 0,
        required: true,
        description: 'ID of the inventory location',
      },
      {
        displayName: 'Target Location ID',
        name: 'targetLocationId',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['transfer'],
          },
        },
        default: 0,
        required: true,
        description: 'ID of the target location for inventory transfer',
      },
      {
        displayName: 'Transfer ID',
        name: 'transferId',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['getTransfer', 'cancelTransfer'],
          },
        },
        default: 0,
        required: true,
        description: 'ID of the inventory transfer',
      },
      {
        displayName: 'Quantity',
        name: 'quantity',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['adjustQuantity', 'setLevel', 'transfer'],
          },
        },
        default: 0,
        required: true,
        description: 'Quantity to adjust or transfer',
      },
      {
        displayName: 'Reference Number',
        name: 'referenceNumber',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['transfer'],
          },
        },
        default: '',
        description: 'Reference number for inventory transfer',
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
            displayName: 'Location ID',
            name: 'location_id',
            type: 'number',
            default: 0,
            description: 'Filter by location ID',
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
        displayName: 'Notes',
        name: 'reason',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['adjustQuantity', 'setLevel', 'transfer'],
          },
        },
        default: '',
        description: 'Notes for the inventory operation',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    try {
      const apiBase = new SapoApiBase(this);
      const inventory = await apiBase.inventory();

      let responseData: SapoResponse = {};

      if (operation === 'get') {
        const productId = this.getNodeParameter('productId', 0) as number;
        const response = await inventory.get(productId);
        responseData = response as SapoResponse;
      } else if (operation === 'getMany') {
        const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
        const filters = this.getNodeParameter('additionalFields', 0) as IDataObject;
        if (returnAll) {
          const response = await inventory.list(filters as any);
          responseData = response as unknown as SapoResponse;
        } else {
          const limit = this.getNodeParameter('limit', 0) as number;
          const response = await inventory.list({ ...filters, limit } as any);
          responseData = response as unknown as SapoResponse;
        }
      } else if (operation === 'adjustQuantity') {
        const itemId = this.getNodeParameter('productId', 0) as number;
        const adjustment: InventoryAdjustment = {
          location_id: this.getNodeParameter('locationId', 0) as number,
          quantity: this.getNodeParameter('quantity', 0) as number,
          action: this.getNodeParameter('action', 0) as InventoryAdjustmentAction,
          reason: this.getNodeParameter('reason', 0) as string,
        };
        const response = await inventory.adjustQuantity(itemId, adjustment);
        responseData = response as SapoResponse;
      } else if (operation === 'setLevel') {
        const itemId = this.getNodeParameter('productId', 0) as number;
        const locationId = this.getNodeParameter('locationId', 0) as number;
        const data = {
          available: this.getNodeParameter('quantity', 0) as number,
        };
        const response = await inventory.setLevel(itemId, locationId, data);
        responseData = response as SapoResponse;
      } else if (operation === 'transfer') {
        const itemId = this.getNodeParameter('productId', 0) as number;
        const data: InventoryTransferData = {
          from_location_id: this.getNodeParameter('locationId', 0) as number,
          to_location_id: this.getNodeParameter('targetLocationId', 0) as number,
          quantity: this.getNodeParameter('quantity', 0) as number,
          notes: this.getNodeParameter('reason', 0) as string,
          reference_number: this.getNodeParameter('referenceNumber', 0) as string,
        };
        const response = await inventory.transfer(itemId, data);
        responseData = response as SapoResponse;
      } else if (operation === 'getTransfer') {
        const itemId = this.getNodeParameter('productId', 0) as number;
        const transferId = this.getNodeParameter('transferId', 0) as number;
        const response = await inventory.getTransfer(itemId, transferId);
        responseData = response as SapoResponse;
      } else if (operation === 'cancelTransfer') {
        const itemId = this.getNodeParameter('productId', 0) as number;
        const transferId = this.getNodeParameter('transferId', 0) as number;
        const response = await inventory.cancelTransfer(itemId, transferId);
        responseData = response as SapoResponse;
      } else if (operation === 'listLocations') {
        const response = await inventory.listLocations();
        responseData = { locations: response };
      } else if (operation === 'getLocation') {
        const locationId = this.getNodeParameter('locationId', 0) as number;
        const response = await inventory.getLocation(locationId);
        responseData = response as SapoResponse;
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
