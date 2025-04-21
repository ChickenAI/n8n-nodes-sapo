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
		displayName: 'Sapo Khách Hàng',
		name: 'sapoCustomer',
		group: ['transform'],
		icon: 'file:../shared/sapo.svg',
		version: 1,
		description: 'Quản lý khách hàng trên Sapo',
		defaults: {
			name: 'Sapo Khách Hàng',
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
					{ name: 'Cập Nhật', value: 'update' },
					{ name: 'Count', value: 'count' },
					{ name: 'Lấy Chi Tiết', value: 'get' },
					{ name: 'Lấy Danh Sách', value: 'getMany' },
					{ name: 'Tạo Mới', value: 'create' },
					{ name: 'Xóa', value: 'delete' },
				],
				default: 'getMany',
			},
			{
				displayName: 'ID Khách Hàng',
				name: 'customerId',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['get', 'update', 'delete'],
					},
				},
				default: 0,
				required: true,
				description: 'ID của khách hàng',
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
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'ten@email.com',
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
