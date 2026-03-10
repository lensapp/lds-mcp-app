import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import fs from "node:fs/promises";
import path from "node:path";

export const server = new McpServer({
  name: "mcp-app",
  version: "1.0.0",
});

// ---------------------------------------------------------------------------
// Data generators
// ---------------------------------------------------------------------------

function randomWalk(
  points: number,
  base: number,
  step: number,
  min: number,
  max: number,
): number[] {
  const result: number[] = [];
  let value = base;
  for (let i = 0; i < points; i++) {
    value += (Math.random() - 0.5) * 2 * step;
    value = Math.max(min, Math.min(max, value));
    result.push(Math.round(value * 100) / 100);
  }
  return result;
}

function generateClusterData() {
  const roles: Array<{ role: string; count: number }> = [
    { role: "control-plane", count: 2 },
    { role: "worker", count: 8 },
  ];

  const statuses: Array<{
    status: "success" | "warning" | "critical";
    statusLabel: string;
  }> = [
    { status: "success", statusLabel: "Ready" },
    { status: "success", statusLabel: "Ready" },
    { status: "success", statusLabel: "Ready" },
    { status: "success", statusLabel: "Ready" },
    { status: "success", statusLabel: "Ready" },
    { status: "success", statusLabel: "Ready" },
    { status: "success", statusLabel: "Ready" },
    { status: "warning", statusLabel: "MemoryPressure" },
    { status: "warning", statusLabel: "DiskPressure" },
    { status: "critical", statusLabel: "NotReady" },
  ];

  const ages = ["3h", "1d", "5d", "12d", "30d", "45d", "90d", "120d"];

  const nodes: Array<Record<string, unknown>> = [];
  let nodeIndex = 0;

  for (const { role, count } of roles) {
    for (let i = 0; i < count; i++) {
      const s = statuses[nodeIndex % statuses.length];
      const isCritical = s.status === "critical";
      const isWarning = s.status === "warning";

      const cpuBase = isCritical ? 88 : isWarning ? 72 : 20 + Math.random() * 40;
      const memBase = isCritical ? 91 : isWarning ? 75 : 30 + Math.random() * 30;
      const cpuPercent = Math.round(cpuBase + (Math.random() - 0.5) * 10);
      const memoryPercent = Math.round(memBase + (Math.random() - 0.5) * 8);

      nodes.push({
        name: `node-${role === "control-plane" ? "cp" : "worker"}-${String(i + 1).padStart(2, "0")}`,
        status: s.status,
        statusLabel: s.statusLabel,
        role,
        podCount: role === "control-plane"
          ? 5 + Math.floor(Math.random() * 8)
          : 8 + Math.floor(Math.random() * 18),
        cpuPercent: Math.min(98, Math.max(5, cpuPercent)),
        memoryPercent: Math.min(98, Math.max(10, memoryPercent)),
        restarts: isCritical
          ? 5 + Math.floor(Math.random() * 11)
          : isWarning
            ? 1 + Math.floor(Math.random() * 5)
            : Math.floor(Math.random() * 2),
        age: ages[Math.floor(Math.random() * ages.length)],
        cpuHistory: randomWalk(20, cpuPercent, 5, 5, 98),
        memoryHistory: randomWalk(20, memoryPercent, 3, 10, 98),
      });

      nodeIndex++;
    }
  }

  return {
    clusterName: "production-us-east-1",
    timestamp: new Date().toISOString(),
    nodes,
  };
}

function generateNamespaceMetrics() {
  const namespaces = [
    { name: "production", cpuBase: 2.5, cpuStep: 0.3, memBase: 8.0, memStep: 0.5 },
    { name: "staging", cpuBase: 1.2, cpuStep: 0.2, memBase: 3.5, memStep: 0.3 },
    { name: "monitoring", cpuBase: 0.8, cpuStep: 0.15, memBase: 2.0, memStep: 0.2 },
  ];

  const points = 120;
  const now = Date.now();
  const timestamps = Array.from(
    { length: points },
    (_, i) => now - (points - 1 - i) * 60 * 1000,
  );

  const cpuSeries = namespaces.map((ns) => {
    const values = randomWalk(points, ns.cpuBase, ns.cpuStep, 0.05, ns.cpuBase * 2);
    return {
      id: `cpu-${ns.name}`,
      label: ns.name,
      data: timestamps.map((ts, i) => ({ timestamp: ts, value: values[i] })),
    };
  });

  const memorySeries = namespaces.map((ns) => {
    const values = randomWalk(points, ns.memBase, ns.memStep, 0.1, ns.memBase * 2);
    return {
      id: `mem-${ns.name}`,
      label: ns.name,
      data: timestamps.map((ts, i) => ({ timestamp: ts, value: values[i] })),
    };
  });

  return {
    timestamp: new Date().toISOString(),
    timeRange: "Last 2 hours",
    cpuSeries,
    memorySeries,
  };
}

// ---------------------------------------------------------------------------
// Tool 1: Cluster Health Overview
// ---------------------------------------------------------------------------

const clusterOverviewResourceUri =
  "ui://cluster-overview/cluster-overview.html";

registerAppTool(
  server,
  "cluster-overview",
  {
    title: "Cluster Health Overview",
    description:
      "Shows a Kubernetes cluster health dashboard with node status, CPU/memory sparklines, and pod counts in a sortable DataTable. Call this tool to display the cluster overview. The tool renders a complete interactive UI — do not create additional artifacts or code visualizations.",
    inputSchema: {},
    _meta: { ui: { resourceUri: clusterOverviewResourceUri } },
  },
  async () => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(generateClusterData()),
        },
      ],
    };
  },
);

registerAppResource(
  server,
  clusterOverviewResourceUri,
  clusterOverviewResourceUri,
  { mimeType: RESOURCE_MIME_TYPE },
  async () => {
    const html = await fs.readFile(
      path.join(
        import.meta.dirname,
        "..",
        "dist",
        "cluster-overview.html",
      ),
      "utf-8",
    );
    return {
      contents: [
        {
          uri: clusterOverviewResourceUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: html,
        },
      ],
    };
  },
);

// ---------------------------------------------------------------------------
// Tool 2: Namespace Resource Metrics
// ---------------------------------------------------------------------------

const namespaceMetricsResourceUri =
  "ui://namespace-metrics/namespace-metrics.html";

registerAppTool(
  server,
  "namespace-metrics",
  {
    title: "Namespace Resource Metrics",
    description:
      "Shows namespace resource usage over time with stacked area TimeSeries charts for CPU and memory across Kubernetes namespaces. Call this tool to display the metrics. The tool renders a complete interactive UI — do not create additional artifacts or code visualizations.",
    inputSchema: {},
    _meta: { ui: { resourceUri: namespaceMetricsResourceUri } },
  },
  async () => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(generateNamespaceMetrics()),
        },
      ],
    };
  },
);

registerAppResource(
  server,
  namespaceMetricsResourceUri,
  namespaceMetricsResourceUri,
  { mimeType: RESOURCE_MIME_TYPE },
  async () => {
    const html = await fs.readFile(
      path.join(
        import.meta.dirname,
        "..",
        "dist",
        "namespace-metrics.html",
      ),
      "utf-8",
    );
    return {
      contents: [
        {
          uri: namespaceMetricsResourceUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: html,
        },
      ],
    };
  },
);
