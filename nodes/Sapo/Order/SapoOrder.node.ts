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

export class SapoOrder implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sapo Đơn Hàng',
		name: 'sapoOrder',
		icon: 'file:../shared/sapo.svg',
		group: ['transform'],
		version: 1,
		description: 'Quản lý đơn hàng trên Sapo',
		defaults: {
			name: 'Sapo Đơn Hàng',
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
					{ name: 'Count', value: 'count' },
					{ name: 'Create', value: 'create' },
					{ name: 'Delete', value: 'delete' },
					{ name: 'Get', value: 'get' },
					{ name: 'Get Many', value: 'getMany' },
					{ name: 'Mark Fulfilled', value: 'markAsFulfilled' },
					{ name: 'Mark Paid', value: 'markAsPaid' },
					{ name: 'Update', value: 'update' },
				],
				default: 'getMany',
			},
			{
				displayName: 'Order ID',
				name: 'orderId',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['get', 'update', 'delete', 'cancel', 'markAsPaid', 'markAsFulfilled'],
					},
				},
				default: 0,
				required: true,
				description: 'ID của đơn hàng',
			},
			{
				displayName: 'Trả Về Tất Cả',
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
				displayName: 'Giới Hạn',
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
				displayName: 'Thông Tin Bổ Sung',
				name: 'additionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['getMany'],
					},
				},
				default: {},
				description: 'Các trường thông tin bổ sung',
				placeholder: 'Thêm Trường',
				options: [
					{
						displayName: 'Tạo Sau',
						name: 'created_at_min',
						type: 'dateTime',
						default: '',
					},
					{
						displayName: 'Tạo Trước',
						name: 'created_at_max',
						type: 'dateTime',
						default: '',
					},
					{
						displayName: 'Trạng Thái',
						name: 'status',
						type: 'options',
						options: [
							{ name: 'Open', value: 'open' },
							{ name: 'Closed', value: 'closed' },
							{ name: 'Cancelled', value: 'cancelled' },
						],
						default: 'open',
					},
					{
						displayName: 'Trạng Thái Thanh Toán',
						name: 'financial_status',
						type: 'options',
						options: [
							{ name: 'Authorized', value: 'authorized' },
							{ name: 'Paid', value: 'paid' },
							{ name: 'Partially Paid', value: 'partially_paid' },
							{ name: 'Pending', value: 'pending' },
							{ name: 'Refunded', value: 'refunded' },
							{ name: 'Voided', value: 'voided' },
						],
						default: 'pending',
					},
					{
						displayName: 'Trạng Thái Giao Hàng',
						name: 'fulfillment_status',
						type: 'options',
						options: [
							{ name: 'Fulfilled', value: 'fulfilled' },
							{ name: 'Partial', value: 'partial' },
							{ name: 'Unfulfilled', value: 'unfulfilled' },
						],
						default: 'unfulfilled',
					},
				],
			},
			{
				displayName: 'Dữ Liệu',
				name: 'data',
				type: 'json',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
					},
				},
				default: {},
				required: true,
				description: 'Dữ liệu gửi đến Sapo',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		try {
			const apiBase = new SapoApiBase(this);
			const orders = await apiBase.orders();

			let responseData: SapoResponse = {};

			if (operation === 'create') {
				const data = this.getNodeParameter('data', 0) as IDataObject;
				const response = await orders.create(data as any);
				responseData = response as SapoResponse;
			} else if (operation === 'get') {
				const orderId = this.getNodeParameter('orderId', 0) as number;
				const response = await orders.get(orderId);
				responseData = response as SapoResponse;
			} else if (operation === 'getMany') {
				const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
				const filters = this.getNodeParameter('additionalFields', 0) as IDataObject;
				if (returnAll) {
					const response = await orders.list(filters as any);
					responseData = response as unknown as SapoResponse;
				} else {
					const limit = this.getNodeParameter('limit', 0) as number;
					const response = await orders.list({ ...filters, limit } as any);
					responseData = response as unknown as SapoResponse;
				}
			} else if (operation === 'update') {
				const orderId = this.getNodeParameter('orderId', 0) as number;
				const data = this.getNodeParameter('data', 0) as IDataObject;
				const response = await orders.update(orderId, data as any);
				responseData = response as SapoResponse;
			} else if (operation === 'delete') {
				const orderId = this.getNodeParameter('orderId', 0) as number;
				await orders.delete(orderId);
				responseData = { success: true };
			} else if (operation === 'count') {
				const count = await orders.count();
				responseData = { count };
			} else if (operation === 'cancel') {
				const orderId = this.getNodeParameter('orderId', 0) as number;
				const response = await orders.cancel(orderId);
				responseData = response as SapoResponse;
			} else if (operation === 'markAsPaid') {
				const orderId = this.getNodeParameter('orderId', 0) as number;
				const response = await orders.markAsPaid(orderId);
				responseData = response as SapoResponse;
			} else if (operation === 'markAsFulfilled') {
				const orderId = this.getNodeParameter('orderId', 0) as number;
				const response = await orders.markAsFulfilled(orderId);
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
