import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Tooltip, Legend, Filler,
} from "chart.js";
import { Card } from "../ui/Kit";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);

const INK = "#16213E";
const GOLD = "#C9974A";
const MUTED = "#9AA1AF";
const BORDER = "#E5E7EB";

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: INK,
      titleFont: { family: "Plus Jakarta Sans", weight: "600" },
      bodyFont: { family: "IBM Plex Mono" },
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: MUTED, font: { family: "Plus Jakarta Sans", size: 11 } } },
    y: { grid: { color: BORDER }, ticks: { color: MUTED, font: { family: "IBM Plex Mono", size: 10 } }, beginAtZero: true },
  },
};

export function ChartCard({ title, subtitle, type = "bar", data, height = 240, color = GOLD, action }) {
  const labels = data?.map((d) => d.label) ?? [];
  const values = data?.map((d) => d.value) ?? [];

  const chartData = {
    labels,
    datasets: [
      type === "line"
        ? {
            data: values,
            borderColor: color,
            backgroundColor: `${color}22`,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: color,
          }
        : {
            data: values,
            backgroundColor: color,
            borderRadius: 6,
            maxBarThickness: 36,
          },
    ],
  };

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {data && data.length > 0 ? (
        <div style={{ height }}>
          {type === "line" ? <Line data={chartData} options={baseOptions} /> : <Bar data={chartData} options={baseOptions} />}
        </div>
      ) : (
        <div className="flex items-center justify-center text-sm text-muted" style={{ height }}>
          No data yet
        </div>
      )}
    </Card>
  );
}

export function DonutCard({ title, value, total, label, color = GOLD }) {
  const remainder = Math.max(total - value, 0);
  const chartData = {
    labels: [label, "Remaining"],
    datasets: [{ data: [value, remainder], backgroundColor: [color, BORDER], borderWidth: 0 }],
  };
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <Card>
      <h3 className="font-display text-base font-semibold text-ink mb-4">{title}</h3>
      <div className="relative" style={{ height: 180 }}>
        <Doughnut data={chartData} options={{ ...baseOptions, cutout: "72%", scales: undefined }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-semibold text-ink">{pct}%</span>
          <span className="text-xs text-muted">{label}</span>
        </div>
      </div>
    </Card>
  );
}
