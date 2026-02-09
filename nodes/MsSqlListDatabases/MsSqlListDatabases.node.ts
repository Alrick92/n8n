import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

import * as sql from 'mssql';

export class MsSqlListDatabases implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'MS SQL Server',
    name: 'msSqlServer',
    icon: 'file:mssql-list-databases.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Execute queries on SQL Server and list databases',
    defaults: {
      name: 'MS SQL Server',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'msSqlApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Execute Query',
            value: 'executeQuery',
            description: 'Execute a custom T-SQL query',
            action: 'Execute a custom T-SQL query',
          },
          {
            name: 'List All Databases',
            value: 'listAll',
            description: 'List all databases (system and user)',
            action: 'List all databases',
          },
          {
            name: 'List User Databases',
            value: 'listUser',
            description: 'List only user-defined databases',
            action: 'List user databases',
          },
          {
            name: 'List System Databases',
            value: 'listSystem',
            description: 'List only system databases',
            action: 'List system databases',
          },
        ],
        default: 'listAll',
      },
      // Connection Override Section
      {
        displayName: 'Connection Override',
        name: 'connectionOverride',
        type: 'collection',
        placeholder: 'Add Override',
        default: {},
        description: 'Override credential values dynamically',
        options: [
          {
            displayName: 'Server',
            name: 'server',
            type: 'string',
            default: '',
            placeholder: '={{ $json.hostname }}',
            description: 'Override SQL Server hostname/IP. Use expressions to set dynamically.',
          },
          {
            displayName: 'Instance',
            name: 'instance',
            type: 'string',
            default: '',
            placeholder: '={{ $json.instanceName }}',
            description: 'Override SQL Server instance name. Use expressions to set dynamically.',
          },
          {
            displayName: 'Port',
            name: 'port',
            type: 'number',
            default: 1433,
            description: 'Override SQL Server port',
          },
          {
            displayName: 'Username',
            name: 'user',
            type: 'string',
            default: '',
            placeholder: '={{ $json.username }}',
            description: 'Override SQL Server username. Use expressions to set dynamically.',
          },
          {
            displayName: 'Password',
            name: 'password',
            type: 'string',
            typeOptions: {
              password: true,
            },
            default: '',
            placeholder: '={{ $json.password }}',
            description: 'Override SQL Server password. Use expressions to set dynamically.',
          },
          {
            displayName: 'Database',
            name: 'database',
            type: 'string',
            default: '',
            placeholder: '={{ $json.databaseName }}',
            description: 'Override initial database to connect to',
          },
          {
            displayName: 'Encrypt Connection',
            name: 'encrypt',
            type: 'boolean',
            default: false,
            description: 'Whether to override the encrypt connection setting',
          },
          {
            displayName: 'Trust Server Certificate',
            name: 'trustServerCertificate',
            type: 'boolean',
            default: false,
            description: 'Whether to override the trust server certificate setting',
          },
        ],
      },
      // T-SQL Query Field
      {
        displayName: 'T-SQL Query',
        name: 'query',
        type: 'string',
        typeOptions: {
          rows: 5,
        },
        displayOptions: {
          show: {
            operation: ['executeQuery'],
          },
        },
        default: 'SELECT name FROM sys.databases ORDER BY name',
        placeholder: 'SELECT * FROM sys.tables',
        description: 'The T-SQL query to execute. Supports expressions like ={{ $json.query }}',
        required: true,
      },
      // Query Parameters
      {
        displayName: 'Query Parameters',
        name: 'queryParameters',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        displayOptions: {
          show: {
            operation: ['executeQuery'],
          },
        },
        default: {},
        placeholder: 'Add Parameter',
        description: 'Add parameters for parameterized queries',
        options: [
          {
            name: 'parameters',
            displayName: 'Parameter',
            values: [
              {
                displayName: 'Parameter Name',
                name: 'name',
                type: 'string',
                default: '',
                placeholder: 'param1',
                description: 'Name of the parameter (without @ symbol)',
              },
              {
                displayName: 'Parameter Type',
                name: 'type',
                type: 'options',
                options: [
                  { name: 'Int', value: 'Int' },
                  { name: 'BigInt', value: 'BigInt' },
                  { name: 'VarChar', value: 'VarChar' },
                  { name: 'NVarChar', value: 'NVarChar' },
                  { name: 'Text', value: 'Text' },
                  { name: 'Bit', value: 'Bit' },
                  { name: 'Float', value: 'Float' },
                  { name: 'Decimal', value: 'Decimal' },
                  { name: 'DateTime', value: 'DateTime' },
                  { name: 'Date', value: 'Date' },
                ],
                default: 'VarChar',
                description: 'Type of the parameter',
              },
              {
                displayName: 'Parameter Value',
                name: 'value',
                type: 'string',
                default: '',
                placeholder: '={{ $json.value }}',
                description: 'Value of the parameter. Supports expressions.',
              },
            ],
          },
        ],
      },
      // Additional Fields for List Operations
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        displayOptions: {
          show: {
            operation: ['listAll', 'listUser', 'listSystem'],
          },
        },
        default: {},
        options: [
          {
            displayName: 'Include Database ID',
            name: 'includeDatabaseId',
            type: 'boolean',
            default: false,
            description: 'Whether to include database_id in results',
          },
          {
            displayName: 'Include Create Date',
            name: 'includeCreateDate',
            type: 'boolean',
            default: false,
            description: 'Whether to include create_date in results',
          },
          {
            displayName: 'Include State',
            name: 'includeState',
            type: 'boolean',
            default: false,
            description: 'Whether to include database state information',
          },
        ],
      },
      // Query Options
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
          {
            displayName: 'Timeout',
            name: 'timeout',
            type: 'number',
            default: 30000,
            description: 'Request timeout in milliseconds (default: 30000)',
          },
          {
            displayName: 'Return Type',
            name: 'returnType',
            type: 'options',
            displayOptions: {
              show: {
                '/operation': ['executeQuery'],
              },
            },
            options: [
              {
                name: 'Each Row as Item',
                value: 'eachRow',
                description: 'Return each row as a separate item',
              },
              {
                name: 'All Rows as Single Item',
                value: 'allRows',
                description: 'Return all rows in a single item',
              },
            ],
            default: 'eachRow',
            description: 'How to structure the output data',
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;
    const credentials = await this.getCredentials('msSqlApi');

    for (let i = 0; i < items.length; i++) {
      let pool: sql.ConnectionPool | undefined;

      try {
        // Get connection overrides for this item
        const connectionOverride = this.getNodeParameter('connectionOverride', i, {}) as {
          server?: string;
          instance?: string;
          port?: number;
          user?: string;
          password?: string;
          database?: string;
          encrypt?: boolean;
          trustServerCertificate?: boolean;
        };

        // Build connection config with overrides
        const config: sql.config = {
          server: connectionOverride.server || (credentials.server as string),
          port: connectionOverride.port || (credentials.port as number),
          user: connectionOverride.user || (credentials.user as string),
          password: connectionOverride.password || (credentials.password as string),
          database: connectionOverride.database || (credentials.database as string) || 'master',
          options: {
            encrypt: connectionOverride.encrypt !== undefined
              ? connectionOverride.encrypt
              : (credentials.encrypt as boolean),
            trustServerCertificate: connectionOverride.trustServerCertificate !== undefined
              ? connectionOverride.trustServerCertificate
              : (credentials.trustServerCertificate as boolean),
            enableArithAbort: true,
          },
        };

        // Add instance name if provided (override takes precedence)
        const instanceName = connectionOverride.instance || (credentials.instance as string);
        if (instanceName) {
          config.options = config.options || {};
          config.options.instanceName = instanceName;
        }

        // Get options
        const options = this.getNodeParameter('options', i, {}) as {
          timeout?: number;
          returnType?: string;
        };

        // Create connection pool
        pool = await sql.connect(config);

        if (operation === 'executeQuery') {
          // Execute custom T-SQL query
          const query = this.getNodeParameter('query', i) as string;
          const queryParameters = this.getNodeParameter('queryParameters', i, {}) as {
            parameters?: Array<{ name: string; type: string; value: string }>;
          };

          // Create request
          const request = pool.request();

          // Set timeout if specified
          if (options.timeout) {
            (request as unknown as { timeout: number }).timeout = options.timeout;
          }

          // Add parameters if provided
          if (queryParameters.parameters && queryParameters.parameters.length > 0) {
            for (const param of queryParameters.parameters) {
              const sqlTypeMap: Record<string, sql.ISqlTypeFactory | ((() => sql.ISqlType) & sql.ISqlTypeFactoryWithNoParams)> = {
                Int: sql.Int,
                BigInt: sql.BigInt,
                VarChar: sql.VarChar,
                NVarChar: sql.NVarChar,
                Text: sql.Text,
                Bit: sql.Bit,
                Float: sql.Float,
                Decimal: sql.Decimal,
                DateTime: sql.DateTime,
                Date: sql.Date,
              };
              const sqlType = sqlTypeMap[param.type];
              if (!sqlType) {
                throw new NodeOperationError(
                  this.getNode(),
                  `Unsupported SQL type: ${param.type}`,
                  { itemIndex: i },
                );
              }
              request.input(param.name, sqlType as (() => sql.ISqlType) & sql.ISqlTypeFactoryWithNoParams, param.value);
            }
          }

          // Execute query
          const result = await request.query(query);

          // Handle return type
          const returnType = options.returnType || 'eachRow';
          if (returnType === 'eachRow') {
            // Return each row as a separate item
            for (const record of result.recordset) {
              returnData.push({
                json: record,
                pairedItem: { item: i },
              });
            }
          } else {
            // Return all rows as a single item
            returnData.push({
              json: {
                recordset: result.recordset,
                rowsAffected: result.rowsAffected,
                recordsets: result.recordsets,
              },
              pairedItem: { item: i },
            });
          }
        } else {
          // List databases operations
          const additionalFields = this.getNodeParameter('additionalFields', i, {}) as {
            includeDatabaseId?: boolean;
            includeCreateDate?: boolean;
            includeState?: boolean;
          };

          // Build SELECT clause based on additional fields
          let selectClause = 'name';
          if (additionalFields.includeDatabaseId) {
            selectClause += ', database_id';
          }
          if (additionalFields.includeCreateDate) {
            selectClause += ', create_date';
          }
          if (additionalFields.includeState) {
            selectClause += ', state_desc, user_access_desc, is_read_only';
          }

          // Build query based on operation
          let query = `SELECT ${selectClause} FROM sys.databases`;

          if (operation === 'listUser') {
            query += " WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')";
          } else if (operation === 'listSystem') {
            query += " WHERE name IN ('master', 'tempdb', 'model', 'msdb')";
          }

          query += ' ORDER BY name';

          // Create request
          const request = pool.request();

          // Set timeout if specified
          if (options.timeout) {
            (request as unknown as { timeout: number }).timeout = options.timeout;
          }

          // Execute query
          const result = await request.query(query);

          // Add each database as a separate item
          for (const record of result.recordset) {
            returnData.push({
              json: record,
              pairedItem: { item: i },
            });
          }
        }
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: errorMessage,
            },
            pairedItem: { item: i },
          });
          continue;
        }
        throw new NodeOperationError(this.getNode(), `Error: ${errorMessage}`, {
          itemIndex: i,
        });
      } finally {
        // Close connection pool
        if (pool) {
          await pool.close();
        }
      }
    }

    return [returnData];
  }
}
