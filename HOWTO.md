# How to Deploy the Custom MSSQL Node in a Containerized n8n Instance

This guide covers installing the `n8n-nodes-mssql-list-databases` community node into an n8n instance running in Docker.

## Prerequisites

- Docker and Docker Compose installed
- Access to the n8n container (running or about to be started)
- Network connectivity from the container to your SQL Server instance(s)

## Option 1: Docker Compose (Recommended)

### 1. Create your project directory

```bash
mkdir n8n-custom && cd n8n-custom
```

### 2. Clone and build the node package

```bash
git clone https://github.com/Alrick92/n8n.git n8n-mssql-node
cd n8n-mssql-node
npm install
npm run build
cd ..
```

### 3. Create a Dockerfile

Create a file named `Dockerfile`:

```dockerfile
FROM n8nio/n8n:latest

USER root

# Copy the built node package into the n8n custom extensions directory
COPY n8n-mssql-node /tmp/n8n-mssql-node

# Install the node from the local directory
RUN cd /tmp/n8n-mssql-node && npm pack && \
    mkdir -p /home/node/.n8n/nodes && \
    npm install --prefix /home/node/.n8n/nodes /tmp/n8n-mssql-node/*.tgz && \
    rm -rf /tmp/n8n-mssql-node

USER node
```

### 4. Create docker-compose.yml

```yaml
version: '3.8'

services:
  n8n:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5678:5678"
    environment:
      - N8N_PORT=5678
      - GENERIC_TIMEZONE=America/New_York
      # Point n8n to the custom nodes directory
      - N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/nodes/node_modules
    volumes:
      - n8n_data:/home/node/.n8n
    restart: unless-stopped

volumes:
  n8n_data:
```

### 5. Build and start

```bash
docker compose up -d --build
```

### 6. Verify

Open `http://localhost:5678` in your browser. When creating a new workflow, search for "MS SQL Server" in the node panel. You should see the custom node.

---

## Option 2: Volume Mount (No Custom Image)

If you prefer not to build a custom Docker image, you can mount the built node directly.

### 1. Build the node package locally

```bash
git clone https://github.com/Alrick92/n8n.git n8n-mssql-node
cd n8n-mssql-node
npm install
npm run build
```

### 2. Create a directory for custom nodes

```bash
mkdir -p ./custom-nodes/node_modules/n8n-nodes-mssql-list-databases
cp -r dist package.json node_modules ./custom-nodes/node_modules/n8n-nodes-mssql-list-databases/
```

### 3. Run n8n with volume mount

```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -e N8N_CUSTOM_EXTENSIONS=/home/node/custom-nodes/node_modules \
  -v $(pwd)/custom-nodes:/home/node/custom-nodes \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n:latest
```

---

## Option 3: Install at Runtime via Init Script

### 1. Build and pack the node

```bash
git clone https://github.com/Alrick92/n8n.git n8n-mssql-node
cd n8n-mssql-node
npm install
npm run build
npm pack
# This creates n8n-nodes-mssql-list-databases-1.0.0.tgz
```

### 2. Create an init script

Create `init.sh`:

```bash
#!/bin/sh
mkdir -p /home/node/.n8n/nodes
cd /home/node/.n8n/nodes
npm init -y 2>/dev/null
npm install /custom-packages/n8n-nodes-mssql-list-databases-1.0.0.tgz
exec n8n start
```

### 3. docker-compose.yml

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/nodes/node_modules
    volumes:
      - n8n_data:/home/node/.n8n
      - ./init.sh:/init.sh
      - ./n8n-mssql-node/n8n-nodes-mssql-list-databases-1.0.0.tgz:/custom-packages/n8n-nodes-mssql-list-databases-1.0.0.tgz
    entrypoint: ["/bin/sh", "/init.sh"]
    restart: unless-stopped

volumes:
  n8n_data:
```

---

## Using the Node

Once deployed, the node appears as **MS SQL Server** in the n8n editor.

### Setting Up Credentials

1. Go to **Credentials** in n8n
2. Click **Add Credential** and search for **MS SQL API**
3. Fill in your default connection details:
   - **Server**: SQL Server hostname or IP
   - **Instance**: Instance name (e.g., `SQLEXPRESS`), leave blank for default instance
   - **Port**: Default is `1433`
   - **Username**: SQL Server login
   - **Password**: SQL Server password
   - **Database**: Initial database (default: `master`)
   - **Encrypt Connection**: Enable for encrypted connections
   - **Trust Server Certificate**: Enable for self-signed certificates

### Dynamic Connection Overrides

The node supports overriding any connection parameter per input item using n8n expressions. This is useful when you need to connect to multiple servers or databases in a single workflow.

In the node settings, expand **Connection Override** and add any fields you want to override:

| Field | Expression Example | Description |
|-------|-------------------|-------------|
| Server | `={{ $json.hostname }}` | Override the SQL Server hostname |
| Instance | `={{ $json.instanceName }}` | Override the instance name |
| Port | `={{ $json.port }}` | Override the port |
| Username | `={{ $json.username }}` | Override the login username |
| Password | `={{ $json.password }}` | Override the login password |
| Database | `={{ $json.databaseName }}` | Override the target database |
| Encrypt Connection | (toggle) | Override encryption setting |
| Trust Server Certificate | (toggle) | Override certificate trust |

### Operations

**Execute Query**: Run any T-SQL query. Supports parameterized queries to prevent SQL injection.

```sql
SELECT TOP 10 * FROM MyTable WHERE Status = @status
```

Add the parameter `status` with type `VarChar` and value `={{ $json.statusFilter }}`.

**List All Databases**: Returns all databases (system + user).

**List User Databases**: Returns only user-created databases (excludes master, tempdb, model, msdb).

**List System Databases**: Returns only system databases.

### Example Workflow: Query Multiple Servers

1. Use a **Set** node or **Code** node to produce items with server details:
   ```json
   [
     { "hostname": "sql-server-1.local", "instanceName": "PROD", "query": "SELECT COUNT(*) AS cnt FROM Orders" },
     { "hostname": "sql-server-2.local", "instanceName": "PROD", "query": "SELECT COUNT(*) AS cnt FROM Orders" }
   ]
   ```

2. Connect to the **MS SQL Server** node with:
   - Operation: **Execute Query**
   - Connection Override > Server: `={{ $json.hostname }}`
   - Connection Override > Instance: `={{ $json.instanceName }}`
   - T-SQL Query: `={{ $json.query }}`

Each input item will connect to its respective server and run its query independently.

---

## Troubleshooting

### Node not showing up in n8n

- Verify `N8N_CUSTOM_EXTENSIONS` environment variable points to the correct directory
- Check that the directory contains `node_modules/n8n-nodes-mssql-list-databases/dist/`
- Restart the n8n container after installing

### Connection errors

- Ensure the container can reach your SQL Server (check DNS/network)
- For Docker-to-host connections, use `host.docker.internal` (Docker Desktop) or the host's network IP
- If using named instances, ensure SQL Server Browser service is running on the target server
- Enable **Trust Server Certificate** if connecting to servers with self-signed certs

### Build errors

- Make sure you have Node.js 18+ installed locally for building
- Run `npm install` before `npm run build`
- The build requires TypeScript 5.4+ (included in devDependencies)
