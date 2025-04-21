import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SapoApi implements ICredentialType {
	name = 'sapoApi';
	displayName = 'Sapo API';
	documentationUrl = 'https://developers.sapo.vn/';
	properties: INodeProperties[] = [
		{
			displayName: 'Store',
			name: 'store',
			type: 'string',
			default: '',
			placeholder: 'your-store.mysapo.net',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Secret Key',
			name: 'secretKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Sapo-Access-Token': '={{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{credentials.apiKey}}:{{credentials.secretKey}}@{{$credentials.store}}',
			url: '/admin/products/count.json',
			method: 'GET',
		},
	};
}
