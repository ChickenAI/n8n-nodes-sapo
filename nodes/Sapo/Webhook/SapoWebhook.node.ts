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
		description: 'Quản lý webhook trên Sapo',
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
				displayName: 'Thao Tác',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Tạo Mới', value: 'create' },
					{ name: 'Xóa', value: 'delete' },
					{ name: 'Lấy Chi Tiết', value: 'get' },
					{ name: 'Lấy Danh Sách', value: 'getMany' },
					{ name: 'Cập Nhật', value: 'update' },
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
				displayName: 'Dữ Liệu Webhook',
				name: 'data',
				type: 'json',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
					},
				},
				default:
					'{\n  "topic": "orders/create",\n  "address": "https://example.com/webhook",\n  "format": "json",\n  "fields": ["id", "total_price", "created_on"],\n  "metafield_namespaces": ["inventory"]\n}',
				required: true,
				noDataExpression: true,
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
				description: 'Additional fields to add',
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'Chủ Đề',
						name: 'topic',
						type: 'options',
						options: [
							{ name: 'Tạo Bài Viết', value: 'articles/create' },
							{ name: 'Xóa Bài Viết', value: 'articles/delete' },
							{ name: 'Cập Nhật Bài Viết', value: 'articles/update' },
							{ name: 'Tạo Bộ Sưu Tập', value: 'collections/create' },
							{ name: 'Xóa Bộ Sưu Tập', value: 'collections/delete' },
							{ name: 'Cập Nhật Bộ Sưu Tập', value: 'collections/update' },
							{ name: 'Tạo Khách Hàng', value: 'customers/create' },
							{ name: 'Xóa Khách Hàng', value: 'customers/delete' },
							{ name: 'Cập Nhật Khách Hàng', value: 'customers/update' },
							{ name: 'Tạo Đơn Hàng', value: 'orders/create' },
							{ name: 'Xóa Đơn Hàng', value: 'orders/delete' },
							{ name: 'Đơn Hàng Đã Thanh Toán', value: 'orders/paid' },
							{ name: 'Cập Nhật Đơn Hàng', value: 'orders/updated' },
							{ name: 'Tạo Sản Phẩm', value: 'products/create' },
							{ name: 'Xóa Sản Phẩm', value: 'products/delete' },
							{ name: 'Cập Nhật Sản Phẩm', value: 'products/update' },
						],
						default: 'orders/create',
					},
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
						displayName: 'Cập Nhật Sau',
						name: 'updated_at_min',
						type: 'dateTime',
						default: '',
					},
					{
						displayName: 'Cập Nhật Trước',
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
