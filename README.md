# LDS MCP App — Lens Design System in MCP Apps

A reference implementation showing how to render [Lens Design System](https://github.com/lensapp/lds) components inside Claude's chat interface via [MCP Apps](https://modelcontextprotocol.io/docs/extensions/apps).

## Tools

### Cluster Health Overview

Sortable `DataTable` with inline `Sparkline` charts and `StatusIndicator` for node health.

**Components used:** `DataTable`, `Sparkline`, `StatusIndicator`, `StateContainer`

```
"Show me the cluster health overview"
```

### Namespace Resource Metrics

Stacked area `TimeSeries` charts showing CPU and memory usage across namespaces.

**Components used:** `TimeSeries` (from `@lensapp/lds/charts`), `StateContainer`

```
"Show me namespace resource metrics"
```

## How It Works

**MCP Apps** extend the Model Context Protocol — a tool can declare a `ui://` resource pointing to an HTML page. When Claude calls that tool, the host fetches the HTML and renders it in a sandboxed iframe in the conversation.

```
User asks Claude
    → Claude calls the tool (e.g. "cluster-overview")
    → MCP server returns JSON data + references a UI resource
    → Host fetches the bundled HTML (React + LDS, single file)
    → Host renders the HTML in a sandboxed iframe
    → The iframe receives the tool result via postMessage
    → React renders LDS components with the data
```

### Project structure

```
├── src/
│   ├── mcp-server.ts          # MCP server: tool registration + data generators
│   ├── cluster-overview.tsx    # React UI: DataTable + Sparkline + StatusIndicator
│   └── namespace-metrics.tsx   # React UI: TimeSeries stacked area charts
├── cluster-overview.html       # HTML entry point for cluster tool
├── namespace-metrics.html      # HTML entry point for metrics tool
├── server.ts                   # Express HTTP transport
├── server-stdio.ts             # Stdio transport
└── vite.config.ts              # Vite + vite-plugin-singlefile
```

### Key patterns

- Each tool has its own HTML entry + React component
- `vite-plugin-singlefile` bundles React + LDS + CSS into a single HTML file (~750KB)
- Sequential builds with `emptyOutDir: false` to support multiple entry points
- `<meta name="color-scheme" content="light dark" />` for transparent iframe background
- `font: var(--lds-font-control-standard)` on body for LDS typography
- Tool descriptions include "do not create additional artifacts" to prevent Claude from generating duplicate UIs

## Setup

```bash
npm install
npm run build
npm run dev      # build + serve
```

## Testing

### Claude Desktop (stdio)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lds-mcp-app": {
      "command": "node",
      "args": [
        "/path/to/lds-mcp-app/node_modules/tsx/dist/cli.mjs",
        "/path/to/lds-mcp-app/server-stdio.ts"
      ]
    }
  }
}
```

Restart Claude Desktop.

### Claude Desktop (HTTP)

```bash
npm run serve
```

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lds-mcp-app": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

### claude.ai with tunnel

```bash
npm run serve
npx cloudflared tunnel --url http://localhost:3001
```

Add the tunnel URL + `/mcp` as a custom connector in Claude Settings > Connectors.
