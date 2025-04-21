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

export class SapoProduct implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sapo Sản Phẩm',
		name: 'sapoProduct',
		icon: 'file:../shared/sapo.svg',
		group: ['transform'],
		version: 1,
		description: 'Quản lý sản phẩm trên Sapo',
		defaults: {
			name: 'Sapo Sản Phẩm',
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
				displayName: 'ID Sản Phẩm',
				name: 'productId',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['get', 'update', 'delete'],
					},
				},
				default: 0,
				required: true,
				description: 'ID của sản phẩm',
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
			const products = await apiBase.products();

			let responseData: SapoResponse = {};

			if (operation === 'create') {
				const data = this.getNodeParameter('data', 0) as IDataObject;
				const response = await products.create(data as any);
				responseData = response as SapoResponse;
			} else if (operation === 'get') {
				const productId = this.getNodeParameter('productId', 0) as number;
				const response = await products.get(productId);
				responseData = response as SapoResponse;
			} else if (operation === 'getMany') {
				const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
				const filters = this.getNodeParameter('additionalFields', 0) as IDataObject;
				if (returnAll) {
					const response = await products.list(filters as any);
					responseData = response as unknown as SapoResponse;
				} else {
					const limit = this.getNodeParameter('limit', 0) as number;
					const response = await products.list({ ...filters, limit } as any);
					responseData = response as unknown as SapoResponse;
				}
			} else if (operation === 'update') {
				const productId = this.getNodeParameter('productId', 0) as number;
				const data = this.getNodeParameter('data', 0) as IDataObject;
				const response = await products.update(productId, data as any);
				responseData = response as SapoResponse;
			} else if (operation === 'delete') {
				const productId = this.getNodeParameter('productId', 0) as number;
				await products.delete(productId);
				responseData = { success: true };
			} else if (operation === 'count') {
				const count = await products.count();
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
