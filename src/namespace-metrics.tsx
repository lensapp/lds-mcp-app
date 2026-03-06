import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { StateContainer } from "@lensapp/lds";
import { TimeSeries } from "@lensapp/lds/charts";
import type {
  TimeSeriesSeries,
  TimeSeriesYAxis,
  TimeSeriesGuideline,
} from "@lensapp/lds/charts";
import "@lensapp/lds/style.css";
import { App as McpApp } from "@modelcontextprotocol/ext-apps";

const mcpApp = new McpApp({ name: "Namespace Metrics", version: "1.0.0" });

interface SeriesData {
  id: string;
  label: string;
  data: { timestamp: number; value: number }[];
}

interface NamespaceMetricsData {
  timestamp: string;
  timeRange: string;
  cpuSeries: SeriesData[];
  memorySeries: SeriesData[];
}

const NAMESPACE_COLORS: Record<string, string> = {
  production: "#3b82f6",
  staging: "#f59e0b",
  monitoring: "#10b981",
  default: "#8b5cf6",
};

function NamespaceMetricsApp() {
  const [data, setData] = useState<NamespaceMetricsData | null>(null);

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

  const cpuSeries: TimeSeriesSeries[] = (data?.cpuSeries ?? []).map((s) => ({
    id: s.id,
    label: s.label,
    data: s.data,
    type: "area" as const,
    stackGroup: "cpu",
    fillOpacity: 0.4,
    color: NAMESPACE_COLORS[s.label],
  }));

  const memorySeries: TimeSeriesSeries[] = (data?.memorySeries ?? []).map(
    (s) => ({
      id: s.id,
      label: s.label,
      data: s.data,
      type: "area" as const,
      stackGroup: "memory",
      fillOpacity: 0.4,
      color: NAMESPACE_COLORS[s.label],
    }),
  );

  const cpuYAxis: TimeSeriesYAxis = {
    label: "CPU",
    min: 0,
    includeZero: true,
    unit: " cores",
    grid: true,
  };

  const memoryYAxis: TimeSeriesYAxis = {
    label: "Memory",
    min: 0,
    includeZero: true,
    unit: " GiB",
    grid: true,
  };

  const cpuGuidelines: TimeSeriesGuideline[] = [
    {
      id: "cpu-capacity",
      type: "horizontal",
      value: 8,
      label: "Capacity (8 cores)",
      style: "dashed",
      color: "#ef4444",
    },
  ];

  const memoryGuidelines: TimeSeriesGuideline[] = [
    {
      id: "mem-capacity",
      type: "horizontal",
      value: 24,
      label: "Capacity (24 GiB)",
      style: "dashed",
      color: "#ef4444",
    },
  ];

  return (
    <div
      style={{
        width: "100%",
        minHeight: "400px",
        background: "var(--lds-color-bg-secondary)",
        borderRadius: "8px",
        border: "1px solid var(--lds-color-border)",
      }}
    >
      <StateContainer status="idle">
        <div style={{ padding: "16px" }}>
          <h3 style={{ margin: "0 0 4px 0", color: "var(--lds-color-text-accent)" }}>
            Namespace Resource Metrics
          </h3>
          {data?.timestamp && (
            <p
              style={{
                margin: "0 0 16px 0",
                fontSize: "12px",
                color: "var(--lds-color-text-muted)",
              }}
            >
              {data.timeRange} — updated {data.timestamp}
            </p>
          )}

          {cpuSeries.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <TimeSeries
                series={cpuSeries}
                height={250}
                title="CPU Usage by Namespace"
                showLegend
                legendPosition="bottom"
                showTooltip
                crosshair
                yAxis={cpuYAxis}
                guidelines={cpuGuidelines}
                zoom
              />
            </div>
          )}

          {memorySeries.length > 0 && (
            <TimeSeries
              series={memorySeries}
              height={250}
              title="Memory Usage by Namespace"
              showLegend
              legendPosition="bottom"
              showTooltip
              crosshair
              yAxis={memoryYAxis}
              guidelines={memoryGuidelines}
              zoom
            />
          )}
        </div>
      </StateContainer>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<NamespaceMetricsApp />);
