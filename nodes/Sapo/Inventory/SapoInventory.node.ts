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
	InventoryAdjustmentAction,
} from 'sapo-client-sdk';

interface SapoResponse extends IDataObject {
	[key: string]: any;
}

export class SapoInventory implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sapo Kho Hàng',
		name: 'sapoInventory',
		icon: 'file:../shared/sapo.svg',
		group: ['transform'],
		version: 1,
		description: 'Quản lý kho hàng trên Sapo',
		defaults: {
			name: 'Sapo Kho Hàng',
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
					{ name: 'Điều Chỉnh Số Lượng', value: 'adjustQuantity' },
					{ name: 'Hủy Chuyển Kho', value: 'cancelTransfer' },
					{ name: 'Lấy Chi Tiết', value: 'get' },
					{ name: 'Lấy Chi Tiết Kho', value: 'getLocation' },
					{ name: 'Lấy Danh Sách', value: 'getMany' },
					{ name: 'Lấy Chi Tiết Chuyển Kho', value: 'getTransfer' },
					{ name: 'Danh Sách Kho', value: 'listLocations' },
					{ name: 'Đặt Mức Tồn Kho', value: 'setLevel' },
					{ name: 'Chuyển Kho', value: 'transfer' },
				],
				default: 'getMany',
			},
			{
				displayName: 'ID Sản Phẩm',
				name: 'productId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'get',
							'adjustQuantity',
							'setLevel',
							'transfer',
							'getTransfer',
							'cancelTransfer',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the inventory item',
			},
			{
				displayName: 'Hành Động',
				name: 'action',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['adjustQuantity'],
					},
				},
				options: [
					{ name: 'Đặt Giá Trị', value: 'set' },
					{ name: 'Thêm', value: 'add' },
					{ name: 'Bớt', value: 'remove' },
				],
				default: 'set',
			},
			{
				displayName: 'ID Kho',
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
				displayName: 'ID Kho Đích',
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
				displayName: 'ID Chuyển Kho',
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
				displayName: 'Số Lượng',
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
				displayName: 'Số Tham Chiếu',
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
						displayName: 'ID Kho',
						name: 'location_id',
						type: 'number',
						default: 0,
						description: 'Lọc theo ID kho',
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
				displayName: 'Ghi Chú',
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
