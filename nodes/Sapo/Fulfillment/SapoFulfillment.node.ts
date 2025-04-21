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

export class SapoFulfillment implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Sapo Fulfillment',
    name: 'sapoFulfillment',
		icon: 'file:../shared/sapo.svg',
    group: ['transform'],
    version: 1,
    description: 'Manage Sapo order fulfillments',
    defaults: {
      name: 'Sapo Fulfillment',
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
          { name: 'Cancel', value: 'cancel' },
          { name: 'Create', value: 'create' },
          { name: 'Create Event', value: 'createEvent' },
          { name: 'Delete Event', value: 'deleteEvent' },
          { name: 'Get', value: 'get' },
          { name: 'Get Carriers', value: 'getCarriers' },
          { name: 'Get Many', value: 'getMany' },
          { name: 'List Events', value: 'listEvents' },
          { name: 'Update Tracking', value: 'updateTracking' },
        ],
        default: 'getMany',
      },
      {
        displayName: 'Order ID',
        name: 'orderId',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['create', 'get', 'getMany', 'cancel', 'complete'],
          },
        },
        default: 0,
        required: true,
      },
      {
        displayName: 'Fulfillment ID',
        name: 'fulfillmentId',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['get', 'updateTracking', 'cancel', 'createEvent', 'listEvents', 'deleteEvent'],
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
              { name: 'Cancelled', value: 'cancelled' },
              { name: 'Error', value: 'error' },
              { name: 'Failure', value: 'failure' },
              { name: 'Open', value: 'open' },
              { name: 'Pending', value: 'pending' },
              { name: 'Success', value: 'success' },
            ],
            default: 'pending',
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
      {
        displayName: 'Event ID',
        name: 'eventId',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['deleteEvent'],
          },
        },
        default: 0,
        required: true,
        description: 'ID of the fulfillment event to delete',
      },
      {
        displayName: 'Fulfillment Data',
        name: 'data',
        type: 'json',
        displayOptions: {
          show: {
            operation: ['create'],
          },
        },
        default: '{\n  "location_id": "123",\n  "tracking_number": "1Z999AA1234567890",\n  "tracking_company": "UPS",\n  "shipping_method": "Standard",\n  "notify_customer": true\n}',
        required: true,
        description: 'The data to create a new fulfillment',
      },
      {
        displayName: 'Tracking Data',
        name: 'data',
        type: 'json',
        displayOptions: {
          show: {
            operation: ['updateTracking'],
          },
        },
        default: '{\n  "tracking_number": "1Z999AA1234567890",\n  "tracking_company": "UPS",\n  "tracking_url": "https://www.ups.com/track?tracknum=1Z999AA1234567890"\n}',
        required: true,
        description: 'The tracking information to update',
      },
      {
        displayName: 'Event Data',
        name: 'data',
        type: 'json',
        displayOptions: {
          show: {
            operation: ['createEvent'],
          },
        },
        default: '{\n  "status": "in_transit",\n  "message": "Package has left the facility",\n  "location": "Distribution Center"\n}',
        required: true,
        description: 'The data to create a new fulfillment event',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    try {
      const apiBase = new SapoApiBase(this);
      const fulfillments = await apiBase.fulfillments();

      let responseData: SapoResponse = {};

      if (operation === 'create') {
        const orderId = this.getNodeParameter('orderId', 0) as number;
        const data = this.getNodeParameter('data', 0) as IDataObject;
        const response = await fulfillments.create(orderId, data as any);
        responseData = response as SapoResponse;
      } else if (operation === 'get') {
        const orderId = this.getNodeParameter('orderId', 0) as number;
        const fulfillmentId = this.getNodeParameter('fulfillmentId', 0) as number;
        const response = await fulfillments.get(orderId, fulfillmentId);
        responseData = response as SapoResponse;
      } else if (operation === 'getMany') {
        const orderId = this.getNodeParameter('orderId', 0) as number;
        const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
        const filters = this.getNodeParameter('additionalFields', 0) as IDataObject;
        if (returnAll) {
          const response = await fulfillments.list(orderId, filters as any);
          responseData = response as unknown as SapoResponse;
        } else {
          const limit = this.getNodeParameter('limit', 0) as number;
          const response = await fulfillments.list(orderId, { ...filters, limit } as any);
          responseData = response as unknown as SapoResponse;
        }
      } else if (operation === 'updateTracking') {
        const orderId = this.getNodeParameter('orderId', 0) as number;
        const fulfillmentId = this.getNodeParameter('fulfillmentId', 0) as number;
        const data = this.getNodeParameter('data', 0) as IDataObject;
        const response = await fulfillments.updateTracking(orderId, fulfillmentId, data as any);
        responseData = response as SapoResponse;
      } else if (operation === 'cancel') {
        const orderId = this.getNodeParameter('orderId', 0) as number;
        const fulfillmentId = this.getNodeParameter('fulfillmentId', 0) as number;
        const response = await fulfillments.cancel(orderId, fulfillmentId);
        responseData = response as SapoResponse;
      } else if (operation === 'createEvent') {
        const orderId = this.getNodeParameter('orderId', 0) as number;
        const fulfillmentId = this.getNodeParameter('fulfillmentId', 0) as number;
        const data = this.getNodeParameter('data', 0) as IDataObject;
        const response = await fulfillments.createEvent(orderId, fulfillmentId, data as any);
        responseData = response as SapoResponse;
      } else if (operation === 'listEvents') {
        const orderId = this.getNodeParameter('orderId', 0) as number;
        const fulfillmentId = this.getNodeParameter('fulfillmentId', 0) as number;
        const response = await fulfillments.listEvents(orderId, fulfillmentId);
        responseData = { events: response };
      } else if (operation === 'deleteEvent') {
        const orderId = this.getNodeParameter('orderId', 0) as number;
        const fulfillmentId = this.getNodeParameter('fulfillmentId', 0) as number;
        const eventId = this.getNodeParameter('eventId', 0) as number;
        await fulfillments.deleteEvent(orderId, fulfillmentId, eventId);
        responseData = { success: true };
      } else if (operation === 'getCarriers') {
        const carriers = await fulfillments.getCarriers();
        responseData = { carriers };
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
