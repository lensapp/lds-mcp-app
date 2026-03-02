# MCP App POC — Hello World with LDS

A proof-of-concept MCP App that renders a Lens Design System `StateContainer` (idle state) directly inside Claude's chat interface.

## How It Works

### What is MCP?

**MCP (Model Context Protocol)** is a protocol that lets external servers provide **tools** to Claude. Normally, when Claude calls a tool, it gets text back. **MCP Apps** extend this — a tool can declare a `ui://` resource pointing to an HTML page. When Claude calls that tool, the host (Claude Desktop or claude.ai) fetches the HTML and renders it **inside a sandboxed iframe in the conversation**.

### The flow

```
User asks Claude something
    → Claude decides to call the "hello-world" tool
    → Host fetches the UI resource (bundled HTML with React + LDS)
    → Host renders the HTML in a sandboxed iframe in the chat
    → The iframe receives the tool result via postMessage
    → React renders StateContainer with the greeting data
```

### Key pieces

1. **`server.ts`** — MCP server that registers:
   - A `hello-world` tool with `_meta.ui.resourceUri` pointing to the UI
   - A resource handler that serves the bundled HTML
   - An Express HTTP endpoint at `/mcp`

2. **`src/mcp-app.tsx`** — React app that:
   - Connects to the host via `App` from `@modelcontextprotocol/ext-apps`
   - Receives the tool result
   - Renders LDS `StateContainer` in idle state with the greeting

3. **`mcp-app.html`** — Entry point, bundled by Vite into a single self-contained HTML file (React + LDS + CSS all inlined)

### Why MCP Apps instead of a regular web app?

- **Context preservation** — UI lives inside the conversation, no tab switching
- **Bidirectional data flow** — UI can call server tools, host pushes results
- **Security** — Sandboxed iframe, no access to parent page

## Setup

```bash
npm install
npm run build
npm run serve
```

Server starts at `http://localhost:3001/mcp`.

## Testing

### Option A: Claude Desktop (local dev)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-app": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

Restart Claude Desktop. Ask: "Show me the hello world app."

### Option B: claude.ai with tunnel

```bash
npx cloudflared tunnel --url http://localhost:3001
```

Copy the generated URL, go to Claude Settings > Connectors > Add custom connector. Paste the URL + `/mcp` path.

### Option C: basic-host (no Claude needed)

```bash
git clone https://github.com/modelcontextprotocol/ext-apps.git
cd ext-apps/examples/basic-host
npm install
SERVERS='["http://localhost:3001/mcp"]' npm start
```

Open `http://localhost:8080` to test the UI rendering directly.
