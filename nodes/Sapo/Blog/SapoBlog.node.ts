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

export class SapoBlog implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Sapo Blog',
    name: 'sapoBlog',
    group: ['transform'],
    version: 1,
    description: 'Manage Sapo blogs and articles',
    defaults: {
      name: 'Sapo Blog',
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
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Article', value: 'article' },
          { name: 'Blog', value: 'blog' },
        ],
        default: 'blog',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Create', value: 'create' },
          { name: 'Create Comment', value: 'createComment' },
          { name: 'Delete', value: 'delete' },
          { name: 'Delete Comment', value: 'deleteComment' },
          { name: 'Get', value: 'get' },
          { name: 'Get Comment', value: 'getComment' },
          { name: 'Get Comments', value: 'getComments' },
          { name: 'Get Many', value: 'getMany' },
          { name: 'Spam Check', value: 'spamCheck' },
          { name: 'Update', value: 'update' },
          { name: 'Update Comment', value: 'updateComment' },
        ],
        default: 'getMany',
      },
      {
        displayName: 'Blog ID',
        name: 'blogId',
        type: 'number',
        default: 0,
        required: true,
        description: 'ID of the blog',
      },
      {
        displayName: 'Article ID',
        name: 'articleId',
        type: 'number',
        displayOptions: {
          show: {
            resource: ['article'],
            operation: ['get', 'update', 'delete', 'getComment', 'getComments', 'createComment', 'updateComment', 'deleteComment', 'spamCheck'],
          },
        },
        default: 0,
        required: true,
      },
      {
        displayName: 'Comment ID',
        name: 'commentId',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['getComment', 'updateComment', 'deleteComment', 'spamCheck'],
          },
        },
        default: 0,
        required: true,
      },
      {
        displayName: 'Return All',
        name: 'returnAll',
        type: 'boolean',
        displayOptions: {
          show: {
            operation: ['getMany', 'getComments'],
          },
        },
        default: false,
        description: 'Whether to return all results or only up to a given limit',
        noDataExpression: true,
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['getMany', 'getComments'],
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
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        displayOptions: {
          show: {
            operation: ['getMany', 'getComments'],
          },
        },
        default: {},
        description: 'Additional fields to add',
        placeholder: 'Add Field',
        options: [
          {
            displayName: 'Published Status',
            name: 'published_status',
            type: 'options',
            options: [
              { name: 'Any', value: 'any' },
              { name: 'Published', value: 'published' },
              { name: 'Unpublished', value: 'unpublished' },
            ],
            default: 'any',
          },
          {
            displayName: 'Handle',
            name: 'handle',
            type: 'string',
            default: '',
            description: 'Filter by handle (URL slug)',
          },
          {
            displayName: 'Created After',
            name: 'created_at_min',
            type: 'dateTime',
            default: '',
          },
          {
            displayName: 'Created Before',
            name: 'created_at_max',
            type: 'dateTime',
            default: '',
          },
          {
            displayName: 'Author',
            name: 'author',
            type: 'string',
            default: '',
          },
        ],
      },
      {
        displayName: 'Blog Data',
        name: 'data',
        type: 'json',
        displayOptions: {
          show: {
            resource: ['blog'],
            operation: ['create', 'update'],
          },
        },
        default: '{\n  "title": "Company News",\n  "handle": "news",\n  "commentable": true,\n  "template_suffix": "alternate"\n}',
        required: true,
        noDataExpression: true,
      },
      {
        displayName: 'Article Data',
        name: 'data',
        type: 'json',
        displayOptions: {
          show: {
            resource: ['article'],
            operation: ['create', 'update'],
          },
        },
        default: '{\n  "title": "New Product Launch",\n  "author": "John Doe",\n  "body_html": "<p>Exciting announcement...</p>",\n  "tags": "news, products",\n  "published": true\n}',
        required: true,
        noDataExpression: true,
      },
      {
        displayName: 'Comment Data',
        name: 'data',
        type: 'json',
        displayOptions: {
          show: {
            operation: ['createComment', 'updateComment'],
          },
        },
        default: '{\n  "author": "John Doe",\n  "email": "john@example.com",\n  "body": "Great article!",\n  "ip": "127.0.0.1"\n}',
        required: true,
        noDataExpression: true,
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const returnData: INodeExecutionData[] = [];
    const resource = this.getNodeParameter('resource', 0) as 'blog' | 'article';
    const operation = this.getNodeParameter('operation', 0) as string;
    const blogId = this.getNodeParameter('blogId', 0) as number;

    try {
      const apiBase = new SapoApiBase(this);
      const blogs = await apiBase.blogs();

      let responseData: SapoResponse = {};

      if (resource === 'blog') {
        if (operation === 'create') {
          const data = this.getNodeParameter('data', 0) as IDataObject;
          const response = await blogs.create(data as any);
          responseData = response as SapoResponse;
        } else if (operation === 'get') {
          const response = await blogs.get(blogId);
          responseData = response as SapoResponse;
        } else if (operation === 'getMany') {
          const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
          const filters = this.getNodeParameter('additionalFields', 0) as IDataObject;
          if (returnAll) {
            const response = await blogs.list(filters as any);
            responseData = response as unknown as SapoResponse;
          } else {
            const limit = this.getNodeParameter('limit', 0) as number;
            const response = await blogs.list({ ...filters, limit } as any);
            responseData = response as unknown as SapoResponse;
          }
        } else if (operation === 'update') {
          const data = this.getNodeParameter('data', 0) as IDataObject;
          const response = await blogs.update(blogId, data as any);
          responseData = response as SapoResponse;
        } else if (operation === 'delete') {
          await blogs.delete(blogId);
          responseData = { success: true };
        }
      } else if (resource === 'article') {
        if (operation === 'create') {
          const data = this.getNodeParameter('data', 0) as IDataObject;
          const response = await blogs.createArticle(blogId, data as any);
          responseData = response as SapoResponse;
        } else if (operation === 'get') {
          const articleId = this.getNodeParameter('articleId', 0) as number;
          const response = await blogs.getArticle(blogId, articleId);
          responseData = response as SapoResponse;
        } else if (operation === 'getMany') {
          const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
          const filters = this.getNodeParameter('additionalFields', 0) as IDataObject;
          if (returnAll) {
            const response = await blogs.listArticles(blogId, filters as any);
            responseData = response as unknown as SapoResponse;
          } else {
            const limit = this.getNodeParameter('limit', 0) as number;
            const response = await blogs.listArticles(blogId, { ...filters, limit } as any);
            responseData = response as unknown as SapoResponse;
          }
        } else if (operation === 'update') {
          const articleId = this.getNodeParameter('articleId', 0) as number;
          const data = this.getNodeParameter('data', 0) as IDataObject;
          const response = await blogs.updateArticle(blogId, articleId, data as any);
          responseData = response as SapoResponse;
        } else if (operation === 'delete') {
          const articleId = this.getNodeParameter('articleId', 0) as number;
          await blogs.deleteArticle(blogId, articleId);
          responseData = { success: true };
        } else if (operation === 'createComment') {
          const articleId = this.getNodeParameter('articleId', 0) as number;
          const data = this.getNodeParameter('data', 0) as IDataObject;
          const response = await blogs.createComment(blogId, articleId, data as any);
          responseData = response as SapoResponse;
        } else if (operation === 'getComment') {
          const articleId = this.getNodeParameter('articleId', 0) as number;
          const commentId = this.getNodeParameter('commentId', 0) as number;
          const response = await blogs.getComment(blogId, articleId, commentId);
          responseData = response as SapoResponse;
        } else if (operation === 'getComments') {
          const articleId = this.getNodeParameter('articleId', 0) as number;
          const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
          const filters = this.getNodeParameter('additionalFields', 0) as IDataObject;
          if (returnAll) {
            const response = await blogs.listComments(blogId, articleId, filters as any);
            responseData = response as unknown as SapoResponse;
          } else {
            const limit = this.getNodeParameter('limit', 0) as number;
            const response = await blogs.listComments(blogId, articleId, { ...filters, limit } as any);
            responseData = response as unknown as SapoResponse;
          }
        } else if (operation === 'updateComment') {
          const articleId = this.getNodeParameter('articleId', 0) as number;
          const commentId = this.getNodeParameter('commentId', 0) as number;
          const data = this.getNodeParameter('data', 0) as IDataObject;
          const response = await blogs.updateComment(blogId, articleId, commentId, data as any);
          responseData = response as SapoResponse;
        } else if (operation === 'deleteComment') {
          const articleId = this.getNodeParameter('articleId', 0) as number;
          const commentId = this.getNodeParameter('commentId', 0) as number;
          await blogs.deleteComment(blogId, articleId, commentId);
          responseData = { success: true };
        } else if (operation === 'spamCheck') {
          const articleId = this.getNodeParameter('articleId', 0) as number;
          const commentId = this.getNodeParameter('commentId', 0) as number;
          const response = await blogs.spamCheck(blogId, articleId, commentId);
          responseData = response;
        }
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
