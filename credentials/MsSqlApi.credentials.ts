import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class MsSqlApi implements ICredentialType {
  name = 'msSqlApi';
  displayName = 'MS SQL API';
  documentationUrl = 'mssql';
  properties: INodeProperties[] = [
    {
      displayName: 'Server',
      name: 'server',
      type: 'string',
      default: '',
      placeholder: 'localhost',
      description: 'SQL Server hostname or IP address (can be overridden in node)',
    },
    {
      displayName: 'Instance',
      name: 'instance',
      type: 'string',
      default: '',
      placeholder: 'SQLEXPRESS',
      description: 'SQL Server instance name (can be overridden in node)',
    },
    {
      displayName: 'Port',
      name: 'port',
      type: 'number',
      default: 1433,
      description: 'SQL Server port (default: 1433)',
    },
    {
      displayName: 'Username',
      name: 'user',
      type: 'string',
      default: '',
      description: 'SQL Server username',
      required: true,
    },
    {
      displayName: 'Password',
      name: 'password',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'SQL Server password',
      required: true,
    },
    {
      displayName: 'Database',
      name: 'database',
      type: 'string',
      default: 'master',
      description: 'Initial database to connect to (default: master)',
    },
    {
      displayName: 'Encrypt Connection',
      name: 'encrypt',
      type: 'boolean',
      default: false,
      description: 'Whether to encrypt the connection',
    },
    {
      displayName: 'Trust Server Certificate',
      name: 'trustServerCertificate',
      type: 'boolean',
      default: false,
      description: 'Whether to trust the server certificate (useful for self-signed certificates)',
    },
  ];
}
