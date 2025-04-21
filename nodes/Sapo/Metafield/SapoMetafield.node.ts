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
	MetafieldOwnerType,
	MetafieldOwnerParams,
	ValidateMetafieldOptions,
} from 'sapo-client-sdk';

interface SapoResponse extends IDataObject {
	[key: string]: any;
}

const resourceToOwnerType: { [key: string]: MetafieldOwnerType } = {
	articles: 'article',
	blogs: 'blog',
	collections: 'collection',
	customers: 'customer',
	orders: 'order',
	pages: 'page',
	products: 'product',
	variants: 'variant',
};

export class SapoMetafield implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sapo Trường Tùy Chỉnh',
		name: 'sapoMetafield',
		icon: 'file:../shared/sapo.svg',
		group: ['transform'],
		version: 1,
		description: 'Quản lý trường tùy chỉnh trên Sapo',
		defaults: {
			name: 'Sapo Trường Tùy Chỉnh',
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
					{ name: 'Xóa Hàng Loạt', value: 'bulkDelete' },
					{ name: 'Đếm', value: 'count' },
					{ name: 'Tạo Mới', value: 'create' },
					{ name: 'Xóa', value: 'delete' },
					{ name: 'Lấy Chi Tiết', value: 'get' },
					{ name: 'Lấy Danh Sách', value: 'getMany' },
					{ name: 'Cập Nhật', value: 'update' },
					{ name: 'Xác Thực', value: 'validate' },
				],
				default: 'getMany',
			},
			{
				displayName: 'Tài Nguyên',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Bài Viết', value: 'articles' },
					{ name: 'Blog', value: 'blogs' },
					{ name: 'Bộ Sưu Tập', value: 'collections' },
					{ name: 'Khách Hàng', value: 'customers' },
					{ name: 'Đơn Hàng', value: 'orders' },
					{ name: 'Trang', value: 'pages' },
					{ name: 'Sản Phẩm', value: 'products' },
					{ name: 'Biến Thể Sản Phẩm', value: 'variants' },
				],
				default: 'products',
				required: true,
			},
			{
				displayName: 'ID Tài Nguyên',
				name: 'resourceId',
				type: 'number',
				default: 0,
				required: true,
			},
			{
				displayName: 'ID Trường Tùy Chỉnh',
				name: 'metafieldId',
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
				displayName: 'Thông Tin Bổ Sung',
				name: 'additionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['getMany', 'bulkDelete', 'count'],
					},
				},
				default: {},
				description: 'Additional fields to add',
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'Namespace',
						name: 'namespace',
						type: 'string',
						default: '',
						description: 'Filter by metafield namespace',
					},
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						description: 'Filter by metafield key',
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
				],
			},
			{
				displayName: 'Dữ Liệu Trường Tùy Chỉnh',
				name: 'data',
				type: 'json',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
					},
				},
				default:
					'{\n  "namespace": "inventory",\n  "key": "warehouse_location",\n  "value": "A-12",\n  "value_type": "string",\n  "description": "Storage location in warehouse"\n}',
				required: true,
				noDataExpression: true,
			},
			{
				displayName: 'Tùy Chọn Xác Thực',
				name: 'validationData',
				type: 'json',
				displayOptions: {
					show: {
						operation: ['validate'],
					},
				},
				default: '{\n  "type": "string",\n  "value": "test value"\n}',
				required: true,
				noDataExpression: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		try {
			const apiBase = new SapoApiBase(this);
			const metafields = await apiBase.metafields();

			const resource = this.getNodeParameter('resource', 0) as string;
			const resourceId = this.getNodeParameter('resourceId', 0) as number;
			const owner: MetafieldOwnerParams = {
				owner_type: resourceToOwnerType[resource] || 'product',
				owner_id: resourceId,
			};

			let responseData: SapoResponse = {};

			if (operation === 'create') {
				const data = this.getNodeParameter('data', 0) as IDataObject;
				const response = await metafields.create(owner, data as any);
				responseData = response as SapoResponse;
			} else if (operation === 'get') {
				const metafieldId = this.getNodeParameter('metafieldId', 0) as number;
				const response = await metafields.get(owner, metafieldId);
				responseData = response as SapoResponse;
			} else if (operation === 'getMany') {
				const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
				const filters = this.getNodeParameter('additionalFields', 0) as IDataObject;
				if (returnAll) {
					const response = await metafields.list(owner, filters as any);
					responseData = response as unknown as SapoResponse;
				} else {
					const limit = this.getNodeParameter('limit', 0) as number;
					const response = await metafields.list(owner, { ...filters, limit } as any);
					responseData = response as unknown as SapoResponse;
				}
			} else if (operation === 'update') {
				const metafieldId = this.getNodeParameter('metafieldId', 0) as number;
				const data = this.getNodeParameter('data', 0) as IDataObject;
				const response = await metafields.update(owner, metafieldId, data as any);
				responseData = response as SapoResponse;
			} else if (operation === 'delete') {
				const metafieldId = this.getNodeParameter('metafieldId', 0) as number;
				await metafields.delete(owner, metafieldId);
				responseData = { success: true };
			} else if (operation === 'bulkDelete') {
				const filters = this.getNodeParameter('additionalFields', 0) as IDataObject;
				const response = await metafields.bulkDelete(owner, filters as any);
				responseData = response as SapoResponse;
			} else if (operation === 'count') {
				const filters = this.getNodeParameter('additionalFields', 0) as IDataObject;
				const count = await metafields.count(owner, filters as any);
				responseData = { count };
			} else if (operation === 'validate') {
				const options = this.getNodeParameter('validationData', 0) as ValidateMetafieldOptions;
				metafields.validateValue(options);
				responseData = { valid: true };
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
