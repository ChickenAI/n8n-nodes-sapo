module.exports = {
	nodes: [
		{
			sourcePath: 'dist/nodes/Sapo/Blog/SapoBlog.node.js',
			type: 'SapoBlog',
		},
		{
			sourcePath: 'dist/nodes/Sapo/Collection/SapoCollection.node.js',
			type: 'SapoCollection',
		},
		{
			sourcePath: 'dist/nodes/Sapo/Customer/SapoCustomer.node.js',
			type: 'SapoCustomer',
		},
		{
			sourcePath: 'dist/nodes/Sapo/Fulfillment/SapoFulfillment.node.js',
			type: 'SapoFulfillment',
		},
		{
			sourcePath: 'dist/nodes/Sapo/Inventory/SapoInventory.node.js',
			type: 'SapoInventory',
		},
		{
			sourcePath: 'dist/nodes/Sapo/Metafield/SapoMetafield.node.js',
			type: 'SapoMetafield',
		},
		{
			sourcePath: 'dist/nodes/Sapo/Order/SapoOrder.node.js',
			type: 'SapoOrder',
		},
		{
			sourcePath: 'dist/nodes/Sapo/Page/SapoPage.node.js',
			type: 'SapoPage',
		},
		{
			sourcePath: 'dist/nodes/Sapo/PriceRule/SapoPriceRule.node.js',
			type: 'SapoPriceRule',
		},
		{
			sourcePath: 'dist/nodes/Sapo/Product/SapoProduct.node.js',
			type: 'SapoProduct',
		},
		{
			sourcePath: 'dist/nodes/Sapo/Webhook/SapoWebhook.node.js',
			type: 'SapoWebhook',
		},
	],
	credentials: [
		{
			sourcePath: 'dist/credentials/SapoApi.credentials.js',
			type: 'sapoApi',
		},
	],
};
