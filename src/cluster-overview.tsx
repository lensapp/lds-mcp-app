import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  StateContainer,
  DataTable,
  Sparkline,
  StatusIndicator,
} from "@lensapp/lds";
import type { DataTableColumn } from "@lensapp/lds";
import "@lensapp/lds/style.css";
import { App as McpApp } from "@modelcontextprotocol/ext-apps";

const mcpApp = new McpApp({ name: "Cluster Overview", version: "1.0.0" });

interface NodeInfo {
  name: string;
  status: "success" | "warning" | "critical";
  statusLabel: string;
  role: string;
  podCount: number;
  cpuPercent: number;
  memoryPercent: number;
  restarts: number;
  age: string;
  cpuHistory: number[];
  memoryHistory: number[];
}

interface ClusterData {
  clusterName: string;
  timestamp: string;
  nodes: NodeInfo[];
}

function sparklineColor(percent: number, metric: "cpu" | "memory") {
  if (percent > 85) return "critical";
  if (percent > 70) return "warning";
  return metric === "cpu" ? "primary" : "success";
}

function ClusterOverviewApp() {
  const [data, setData] = useState<ClusterData | null>(null);
  const [sortColumn, setSortColumn] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    mcpApp.connect();
    mcpApp.ontoolresult = (result) => {
      const text = result.content?.find(
        (c: { type: string }) => c.type === "text",
      )?.text;
      if (text) {
        try {
          setData(JSON.parse(text));
        } catch {
          // ignore parse errors
        }
      }
    };
  }, []);

  const sortedNodes = useMemo(() => {
    if (!data) return [];
    const nodes = [...data.nodes];
    nodes.sort((a, b) => {
      const aVal = a[sortColumn as keyof NodeInfo];
      const bVal = b[sortColumn as keyof NodeInfo];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDirection === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
    return nodes;
  }, [data, sortColumn, sortDirection]);

  const columns: DataTableColumn<NodeInfo>[] = useMemo(
    () => [
      { key: "name", header: "Node", width: "1fr", sortable: true },
      {
        key: "status",
        header: "Status",
        width: "130px",
        sortable: true,
        render: (item) => (
          <StatusIndicator status={item.status} label={item.statusLabel} />
        ),
      },
      {
        key: "podCount",
        header: "Pods",
        width: "50px",
        align: "right",
        sortable: true,
      },
      {
        key: "cpuPercent",
        header: "CPU",
        width: "150px",
        sortable: true,
        render: (item) => (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkline
              data={item.cpuHistory}
              variant="area"
              width={80}
              height={24}
              color={sparklineColor(item.cpuPercent, "cpu")}
              showEndpoint
            />
            <span
              style={{
                fontFamily: "var(--lds-font-family-mono)",
                fontSize: "11px",
                minWidth: "32px",
                textAlign: "right",
                color:
                  item.cpuPercent > 85
                    ? "var(--lds-color-critical)"
                    : item.cpuPercent > 70
                      ? "var(--lds-color-warning)"
                      : "var(--lds-color-text-primary)",
              }}
            >
              {item.cpuPercent}%
            </span>
          </div>
        ),
      },
      {
        key: "memoryPercent",
        header: "Memory",
        width: "150px",
        sortable: true,
        render: (item) => (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkline
              data={item.memoryHistory}
              variant="area"
              width={80}
              height={24}
              color={sparklineColor(item.memoryPercent, "memory")}
              showEndpoint
            />
            <span
              style={{
                fontFamily: "var(--lds-font-family-mono)",
                fontSize: "11px",
                minWidth: "32px",
                textAlign: "right",
                color:
                  item.memoryPercent > 85
                    ? "var(--lds-color-critical)"
                    : item.memoryPercent > 70
                      ? "var(--lds-color-warning)"
                      : "var(--lds-color-text-primary)",
              }}
            >
              {item.memoryPercent}%
            </span>
          </div>
        ),
      },
    ],
    [],
  );

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
        <div style={{ padding: "16px" }}>
          <div style={{ marginBottom: "12px" }}>
            <h3
              style={{ margin: 0, color: "var(--lds-color-text-accent)" }}
            >
              {data?.clusterName ?? "Cluster"} — Node Health
            </h3>
            {data?.timestamp && (
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "12px",
                  color: "var(--lds-color-text-muted)",
                }}
              >
                Last updated: {data.timestamp}
              </p>
            )}
          </div>
          {sortedNodes.length > 0 && (
            <DataTable
              data={sortedNodes}
              columns={columns}
              getRowKey={(item) => item.name}
              selectable={false}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSortChange={(col, dir) => {
                setSortColumn(col);
                setSortDirection(dir);
              }}
            />
          )}
        </div>
      </StateContainer>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<ClusterOverviewApp />);
