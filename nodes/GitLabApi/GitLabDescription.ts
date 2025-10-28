import { INodeProperties } from 'n8n-workflow';

// 操作定义
export const gitLabOperations: INodeProperties[] = [
  // 项目操作
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['project'],
      },
    },
    options: [
      {
        name: 'Get',
        value: 'get',
        description: 'Get project information',
        action: 'Get project information',
      },
    ],
    default: 'get',
  },
  // 合并请求操作
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['mergeRequest'],
      },
    },
    options: [
      {
        name: 'Get Many',
        value: 'getAll',
        description: 'Get many merge requests for a project',
        action: 'Get many merge requests',
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Get a specific merge request',
        action: 'Get merge request details',
      },
    ],
    default: 'getAll',
  },
];

// 项目操作字段
const projectFields: INodeProperties[] = [
  // 项目获取操作
  {
    displayName: 'Project ID',
    name: 'projectId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['project'],
        operation: ['get'],
      },
    },
    default: '',
    placeholder: '1 or group/project or group/subgroup/project',
    description: 'The ID or path of the project. Use numeric ID (e.g., "1") or project path (e.g., "group/project" or "group/subgroup/project").',
  },
];

// 合并请求操作字段
const mergeRequestFields: INodeProperties[] = [
  // 获取合并请求列表
  {
    displayName: 'Project ID',
    name: 'projectId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['mergeRequest'],
        operation: ['getAll', 'get'],
      },
    },
    default: '',
    placeholder: '1 or group/project or group/subgroup/project',
    description: 'The ID or path of the project. Supports multi-level paths.',
  },
  {
    displayName: 'State',
    name: 'state',
    type: 'options',
    displayOptions: {
      show: {
        resource: ['mergeRequest'],
        operation: ['getAll'],
      },
    },
    options: [
      {
        name: 'All',
        value: 'all',
      },
      {
        name: 'Opened',
        value: 'opened',
      },
      {
        name: 'Closed',
        value: 'closed',
      },
      {
        name: 'Merged',
        value: 'merged',
      },
    ],
    default: 'all',
    description: 'Filter merge requests by state',
  },
  {
    displayName: 'Additional Options',
    name: 'additionalOptions',
    type: 'collection',
    placeholder: 'Add Option',
    displayOptions: {
      show: {
        resource: ['mergeRequest'],
        operation: ['getAll'],
      },
    },
    default: {},
    options: [
      {
        displayName: 'Per Page',
        name: 'per_page',
        type: 'number',
        typeOptions: {
          minValue: 1,
          maxValue: 100,
        },
        default: 20,
        description: 'Number of results per page (max 100)',
      },
      {
        displayName: 'Page',
        name: 'page',
        type: 'number',
        typeOptions: {
          minValue: 1,
        },
        default: 1,
        description: 'Page number to retrieve',
      },
    ],
  },
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    default: true,
    displayOptions: {
      show: {
        resource: ['mergeRequest'],
        operation: ['getAll'],
      },
    },
    description: 'Whether to return all merge requests or limit the results',
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    typeOptions: {
      minValue: 1,
      maxValue: 200,
    },
    default: 50,
    displayOptions: {
      show: {
        resource: ['mergeRequest'],
        operation: ['getAll'],
        returnAll: [false],
      },
    },
    description: 'Max number of merge requests to return',
  },
  // 获取单个合并请求
  {
    displayName: 'Merge Request IID',
    name: 'mergeRequestIid',
    type: 'number',
    required: true,
    displayOptions: {
      show: {
        resource: ['mergeRequest'],
        operation: ['get'],
      },
    },
    default: 1,
    description: 'The internal ID of the merge request',
  },
];

export const gitLabFields: INodeProperties[] = [
  ...projectFields,
  ...mergeRequestFields,
];
