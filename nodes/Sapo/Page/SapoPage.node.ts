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

export class SapoPage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sapo Trang',
		name: 'sapoPage',
		icon: 'file:../shared/sapo.svg',
		group: ['transform'],
		version: 1,
		description: 'Quản lý trang CMS trên Sapo',
		defaults: {
			name: 'Sapo Trang',
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
					{ name: 'Đếm', value: 'count' },
					{ name: 'Tạo Mới', value: 'create' },
					{ name: 'Xóa', value: 'delete' },
					{ name: 'Lấy Chi Tiết', value: 'get' },
					{ name: 'Lấy Danh Sách', value: 'getMany' },
					{ name: 'Cập Nhật', value: 'update' },
				],
				default: 'getMany',
			},
			{
				displayName: 'ID Trang',
				name: 'pageId',
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
						operation: ['getMany'],
					},
				},
				default: {},
				description: 'Additional fields to add',
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'Trạng Thái Xuất Bản',
						name: 'published_status',
						type: 'options',
						options: [
							{ name: 'Tất Cả', value: 'any' },
							{ name: 'Đã Xuất Bản', value: 'published' },
							{ name: 'Chưa Xuất Bản', value: 'unpublished' },
						],
						default: 'any',
					},
					{
						displayName: 'Handle',
						name: 'handle',
						type: 'string',
						default: '',
						description: 'Filter by page handle (URL slug)',
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
			{
				displayName: 'Dữ Liệu Trang',
				name: 'data',
				type: 'json',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
					},
				},
				default:
					'{\n  "title": "About Us",\n  "body_html": "<p>Our company story...</p>",\n  "handle": "about-us",\n  "published": true,\n  "template_suffix": "alternate",\n  "author": "John Doe"\n}',
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
			const pages = await apiBase.pages();

			let responseData: SapoResponse = {};

			if (operation === 'create') {
				const data = this.getNodeParameter('data', 0) as IDataObject;
				const response = await pages.create(data as any);
				responseData = response as SapoResponse;
			} else if (operation === 'get') {
				const pageId = this.getNodeParameter('pageId', 0) as number;
				const response = await pages.get(pageId);
				responseData = response as SapoResponse;
			} else if (operation === 'getMany') {
				const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
				const filters = this.getNodeParameter('additionalFields', 0) as IDataObject;
				if (returnAll) {
					const response = await pages.list(filters as any);
					responseData = response as unknown as SapoResponse;
				} else {
					const limit = this.getNodeParameter('limit', 0) as number;
					const response = await pages.list({ ...filters, limit } as any);
					responseData = response as unknown as SapoResponse;
				}
			} else if (operation === 'update') {
				const pageId = this.getNodeParameter('pageId', 0) as number;
				const data = this.getNodeParameter('data', 0) as IDataObject;
				const response = await pages.update(pageId, data as any);
				responseData = response as SapoResponse;
			} else if (operation === 'delete') {
				const pageId = this.getNodeParameter('pageId', 0) as number;
				await pages.delete(pageId);
				responseData = { success: true };
			} else if (operation === 'count') {
				const filters = this.getNodeParameter('additionalFields', 0) as IDataObject;
				const count = await pages.count(filters as any);
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
