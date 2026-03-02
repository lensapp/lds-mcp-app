import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { StateContainer } from "@lensapp/lds";
import "@lensapp/lds/style.css";
import { App as McpApp } from "@modelcontextprotocol/ext-apps";

// Initialize MCP App connection
const mcpApp = new McpApp({ name: "Hello World App", version: "1.0.0" });

interface ToolData {
  greeting: string;
  description: string;
  timestamp: string;
}

function HelloWorldApp() {
  const [data, setData] = useState<ToolData | null>(null);

  useEffect(() => {
    // Connect to the MCP host
    mcpApp.connect();

    // Handle the initial tool result pushed by the host
    mcpApp.ontoolresult = (result) => {
      const text = result.content?.find(
        (c: { type: string }) => c.type === "text",
      )?.text;
      if (text) {
        try {
          setData(JSON.parse(text));
        } catch {
          setData({
            greeting: text,
            description: "",
            timestamp: new Date().toISOString(),
          });
        }
      }
    };
  }, []);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "200px",
        background: "var(--lds-color-bg-secondary)",
        borderRadius: "8px",
        border: "1px solid var(--lds-color-border)",
      }}
    >
      <StateContainer status="idle">
        <div style={{ padding: "24px" }}>
          <h3
            style={{ margin: 0, color: "var(--lds-color-text-accent)" }}
          >
            {data?.greeting ?? "Hello World"}
          </h3>
          <p
            style={{
              margin: "8px 0 0",
              color: "var(--lds-color-text-primary)",
            }}
          >
            {data?.description ??
              "MCP App with Lens Design System — waiting for server data..."}
          </p>
          {data?.timestamp && (
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "12px",
                color: "var(--lds-color-text-muted)",
              }}
            >
              Server time: {data.timestamp}
            </p>
          )}
        </div>
      </StateContainer>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<HelloWorldApp />);
