# n8n-nodes-sapo

This is an n8n community node for Sapo ECommerce Platform. It provides nodes to interact with various Sapo APIs.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Resources](#resources)  
[Version History](#version-history)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

The following operations are supported for each resource:

### Products
- Create product
- Get product
- Get multiple products
- Update product
- Delete product

### Orders
- Create order
- Get order
- Get multiple orders
- Update order
- Delete order
- Cancel order
- Mark as paid
- Mark as fulfilled

### Customers
- Create customer
- Get customer
- Get multiple customers
- Update customer
- Delete customer

### Collections
- Create custom collection
- Create smart collection
- Get collection
- Get multiple collections
- Update collection
- Delete collection
- Add/remove product
- Set product order

### Inventory
- Adjust quantity
- Get inventory level
- Get multiple inventory items
- Set inventory level
- Transfer inventory
- Get/cancel transfer

### Price Rules
- Create price rule
- Get price rule
- Get multiple price rules
- Update price rule
- Delete price rule

### Fulfillments
- Create fulfillment
- Get fulfillment
- Get multiple fulfillments
- Update tracking
- Cancel fulfillment
- Complete fulfillment

### Metafields
- Create metafield
- Get metafield
- Get multiple metafields
- Update metafield
- Delete metafield
- Bulk delete metafields
- Validate metafield

### Pages
- Create page
- Get page
- Get multiple pages
- Update page
- Delete page

### Blogs & Articles
- Create blog/article
- Get blog/article 
- Get multiple blogs/articles
- Update blog/article
- Delete blog/article
- Manage comments

### Webhooks
- Create webhook
- Get webhook
- Get multiple webhooks
- Update webhook
- Delete webhook

## Credentials

To use these nodes, you'll need to:
1. Create a Sapo private app in your store admin
2. Get the API Key, Secret Key and store URL
3. Add those credentials in n8n credentials section

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Sapo API documentation](https://developers.sapo.vn/)

## Version History

### 0.1.0
- Initial release
- Support for core Sapo resources: products
