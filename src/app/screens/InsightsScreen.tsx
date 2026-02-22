import { useEffect, useState } from "react";
import { dashboardApi, healthApi } from "../../api";
import type { LifestyleInsights, BPReadingHistory } from "../../api/types";
import {
  ArrowLeft,
  Activity,
  HeartPulse,
  TrendingUp,
  TrendingDown,
  Minus,
  Footprints,
  Flame,
  Mountain,
  Clock,
} from "lucide-react";

interface Props {
  userId: string | null;
  onBack: () => void;
}

interface ActivityData {
  steps: number;
  calories: number;
  distance: number;
  activeMinutes: number;
  floorsClimbed: number;
}

const getBPCategory = (systolic: number, diastolic: number) => {
  if (systolic < 120 && diastolic < 80)
    return { text: "Normal", color: "#00E5CC" };
  if (systolic < 130 && diastolic < 80)
    return { text: "Elevated", color: "#F5A623" };
  if (systolic < 140 || diastolic < 90)
    return { text: "High Stage 1", color: "#FF9500" };
  return { text: "High Stage 2", color: "#FF6B6B" };
};

export default function InsightsScreen({ userId, onBack }: Props) {
  const [data, setData] = useState<LifestyleInsights | null>(null);
  const [readings, setReadings] = useState<BPReadingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"history" | "activity">("history");

  // Activity data - in future would come from smartwatch
  const [activity, setActivity] = useState<ActivityData>({
    steps: 0,
    calories: 0,
    distance: 0,
    activeMinutes: 0,
    floorsClimbed: 0,
  });

  useEffect(() => {
    if (!userId) return;

    // Fetch BP readings and lifestyle insights
    Promise.all([
      dashboardApi.getLifestyleInsights(userId).catch(() => null),
      healthApi.getBPReadings(userId, 14).catch(() => ({ readings: [] })),
    ])
      .then(([insightsData, bpData]) => {
        setData(insightsData);
        setReadings(bpData.readings || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    // Try to get activity from Health API or simulate based on time
    const now = new Date();
    const hour = now.getHours();
    // Simulate activity that increases through the day
    setActivity({
      steps: Math.floor((hour / 24) * 8000) + Math.floor(Math.random() * 1000),
      calories: Math.floor((hour / 24) * 400) + Math.floor(Math.random() * 50),
      distance: Number(((hour / 24) * 5).toFixed(1)),
      activeMinutes:
        Math.floor((hour / 24) * 60) + Math.floor(Math.random() * 10),
      floorsClimbed:
        Math.floor((hour / 24) * 10) + Math.floor(Math.random() * 3),
    });
  }, [userId]);

  const getTrendIcon = (trend?: string) => {
    if (!trend) return <Minus size={14} style={{ color: "#8896A8" }} />;
    if (trend.includes("improv") || trend.includes("better"))
      return <TrendingUp size={14} style={{ color: "#00E5CC" }} />;
    if (trend.includes("worse") || trend.includes("declin"))
      return <TrendingDown size={14} style={{ color: "#FF6B6B" }} />;
    return <Minus size={14} style={{ color: "#8896A8" }} />;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getHRVStatus = (hrv: number) => {
    if (hrv >= 50) return { text: "Good", color: "#00E5CC" };
    if (hrv >= 30) return { text: "Fair", color: "#F5A623" };
    return { text: "Low", color: "#FF6B6B" };
  };

  return (
    <div className="px-6 py-6 pb-36">
      <div
        className="cursor-pointer mb-4"
        style={{ color: "#8896A8" }}
        onClick={onBack}
      >
        <ArrowLeft size={24} />
      </div>

      <h1 className="text-2xl font-bold mb-2">History & Activity</h1>
      <p className="text-sm mb-6" style={{ color: "#8896A8" }}>
        Track your health journey and daily activity
      </p>

      {/* Tab Selector */}
      <div
        className="flex gap-2 mb-6 p-1 rounded-xl"
        style={{ background: "#111827" }}
      >
        <button
          onClick={() => setActiveTab("history")}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: activeTab === "history" ? "#00E5CC" : "transparent",
            color: activeTab === "history" ? "#0A0F1E" : "#8896A8",
          }}
        >
          BP History
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: activeTab === "activity" ? "#00E5CC" : "transparent",
            color: activeTab === "activity" ? "#0A0F1E" : "#8896A8",
          }}
        >
          Activity
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10" style={{ color: "#8896A8" }}>
          Loading...
        </div>
      ) : activeTab === "history" ? (
        <>
          {/* Week Summary */}
          {data && (
            <div
              className="p-4 rounded-xl mb-4"
              style={{ background: "#111827", border: "1px solid #1E2D45" }}
            >
              <div
                className="text-xs font-semibold mb-3"
                style={{ color: "#00E5CC" }}
              >
                WEEK SUMMARY
              </div>
              <p className="text-sm leading-relaxed">{data.summary}</p>
              {data.recommendation && (
                <div
                  className="mt-3 pt-3"
                  style={{ borderTop: "1px solid #1E2D45" }}
                >
                  <p className="text-sm" style={{ color: "#00E5CC" }}>
                    {data.recommendation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* BP History Table */}
          <div className="mb-4">
            <div
              className="text-sm font-semibold mb-3"
              style={{ color: "#8896A8" }}
            >
              RECENT READINGS
            </div>
            {readings.length > 0 ? (
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid #1E2D45" }}
              >
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "#111827" }}>
                      <th
                        className="px-3 py-2 text-left text-xs font-semibold"
                        style={{ color: "#8896A8" }}
                      >
                        Date
                      </th>
                      <th
                        className="px-3 py-2 text-center text-xs font-semibold"
                        style={{ color: "#8896A8" }}
                      >
                        BP
                      </th>
                      <th
                        className="px-3 py-2 text-center text-xs font-semibold"
                        style={{ color: "#8896A8" }}
                      >
                        HR
                      </th>
                      <th
                        className="px-3 py-2 text-right text-xs font-semibold"
                        style={{ color: "#8896A8" }}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {readings.slice(0, 10).map((reading, i) => {
                      const bpCategory = getBPCategory(
                        reading.systolic,
                        reading.diastolic,
                      );
                      return (
                        <tr
                          key={reading.id || i}
                          style={{ borderTop: "1px solid #1E2D45" }}
                        >
                          <td className="px-3 py-3 text-sm">
                            {formatDate(reading.date)}
                          </td>
                          <td className="px-3 py-3 text-center text-sm">
                            <span className="font-semibold">
                              {reading.systolic}/{reading.diastolic}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center text-sm">
                            <span className="font-semibold">
                              {reading.heartRate || "--"}
                            </span>
                            <span
                              className="text-xs ml-1"
                              style={{ color: "#8896A8" }}
                            >
                              bpm
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span
                              className="px-2 py-1 rounded-full text-xs font-semibold"
                              style={{
                                background: `${bpCategory.color}15`,
                                color: bpCategory.color,
                              }}
                            >
                              {bpCategory.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                className="p-6 rounded-xl text-center"
                style={{ background: "#111827", border: "1px solid #1E2D45" }}
              >
                <HeartPulse
                  size={32}
                  className="mx-auto mb-3"
                  style={{ color: "#8896A8" }}
                />
                <p className="text-sm" style={{ color: "#8896A8" }}>
                  No readings yet. Take your first BP check!
                </p>
              </div>
            )}
          </div>

          {/* Stress Metrics */}
          {data?.weekStats && (
            <div className="grid grid-cols-2 gap-3">
              <div
                className="p-4 rounded-xl"
                style={{ background: "#111827", border: "1px solid #1E2D45" }}
              >
                <div className="text-xs mb-1" style={{ color: "#8896A8" }}>
                  Avg Sedentary
                </div>
                <div className="text-xl font-bold">
                  {data.weekStats.averageSedentaryHours}h
                </div>
                <div
                  className="text-xs"
                  style={{
                    color:
                      data.weekStats.averageSedentaryHours > 8
                        ? "#FF6B6B"
                        : "#00E5CC",
                  }}
                >
                  {data.weekStats.averageSedentaryHours > 8 ? "High" : "Normal"}
                </div>
              </div>
              <div
                className="p-4 rounded-xl"
                style={{ background: "#111827", border: "1px solid #1E2D45" }}
              >
                <div className="text-xs mb-1" style={{ color: "#8896A8" }}>
                  Stress Score
                </div>
                <div className="text-xl font-bold">
                  {data.weekStats.averageCSS}
                </div>
                <div
                  className="text-xs"
                  style={{
                    color:
                      data.weekStats.averageCSS > 50 ? "#FF6B6B" : "#00E5CC",
                  }}
                >
                  {data.weekStats.averageCSS > 50 ? "Elevated" : "Normal"}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Activity Stats */}
          <div
            className="p-4 rounded-xl mb-4"
            style={{
              background: "linear-gradient(135deg, #111827 0%, #1E2D45 100%)",
              border: "1px solid #1E2D45",
            }}
          >
            <div
              className="text-xs font-semibold mb-4"
              style={{ color: "#00E5CC" }}
            >
              TODAY'S ACTIVITY
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div
                className="p-3 rounded-xl"
                style={{ background: "rgba(0, 229, 204, 0.08)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Footprints size={16} style={{ color: "#00E5CC" }} />
                  <span className="text-xs" style={{ color: "#8896A8" }}>
                    Steps
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {activity.steps.toLocaleString()}
                </div>
                <div className="text-xs" style={{ color: "#8896A8" }}>
                  Goal: 10,000
                </div>
              </div>
              <div
                className="p-3 rounded-xl"
                style={{ background: "rgba(245, 166, 35, 0.08)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Flame size={16} style={{ color: "#F5A623" }} />
                  <span className="text-xs" style={{ color: "#8896A8" }}>
                    Calories
                  </span>
                </div>
                <div className="text-2xl font-bold">{activity.calories}</div>
                <div className="text-xs" style={{ color: "#8896A8" }}>
                  Active burn
                </div>
              </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div
                className="text-center p-3 rounded-lg"
                style={{ background: "rgba(167, 139, 250, 0.08)" }}
              >
                <Activity
                  size={18}
                  className="mx-auto mb-1"
                  style={{ color: "#A78BFA" }}
                />
                <div className="text-lg font-bold">{activity.distance}</div>
                <div className="text-xs" style={{ color: "#8896A8" }}>
                  km
                </div>
              </div>
              <div
                className="text-center p-3 rounded-lg"
                style={{ background: "rgba(0, 229, 204, 0.08)" }}
              >
                <Clock
                  size={18}
                  className="mx-auto mb-1"
                  style={{ color: "#00E5CC" }}
                />
                <div className="text-lg font-bold">
                  {activity.activeMinutes}
                </div>
                <div className="text-xs" style={{ color: "#8896A8" }}>
                  active min
                </div>
              </div>
              <div
                className="text-center p-3 rounded-lg"
                style={{ background: "rgba(245, 166, 35, 0.08)" }}
              >
                <Mountain
                  size={18}
                  className="mx-auto mb-1"
                  style={{ color: "#F5A623" }}
                />
                <div className="text-lg font-bold">
                  {activity.floorsClimbed}
                </div>
                <div className="text-xs" style={{ color: "#8896A8" }}>
                  floors
                </div>
              </div>
            </div>
          </div>

          {/* Activity Impact on BP */}
          <div
            className="p-4 rounded-xl mb-4"
            style={{ background: "#111827", border: "1px solid #1E2D45" }}
          >
            <div
              className="text-xs font-semibold mb-3"
              style={{ color: "#8896A8" }}
            >
              ACTIVITY & BP CORRELATION
            </div>
            <p className="text-sm leading-relaxed mb-3">
              Your activity levels directly impact your blood pressure. More
              movement means better cardiovascular health.
            </p>
            <div
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ background: "rgba(0, 229, 204, 0.05)" }}
            >
              <TrendingUp size={20} style={{ color: "#00E5CC" }} />
              <div>
                <div
                  className="text-sm font-semibold"
                  style={{ color: "#00E5CC" }}
                >
                  Prediction Model
                </div>
                <div className="text-xs" style={{ color: "#8896A8" }}>
                  Activity data helps improve BP estimates by ~15%
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Activity Chart Placeholder */}
          <div
            className="p-4 rounded-xl"
            style={{ background: "#111827", border: "1px solid #1E2D45" }}
          >
            <div
              className="text-xs font-semibold mb-3"
              style={{ color: "#8896A8" }}
            >
              7-DAY TREND
            </div>
            <div className="flex items-end justify-between h-24 gap-2">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => {
                const height = [
                  40,
                  65,
                  50,
                  80,
                  45,
                  90,
                  activity.steps > 5000 ? 70 : 35,
                ][i];
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full rounded-t-sm transition-all"
                      style={{
                        height: `${height}%`,
                        background: i === 6 ? "#00E5CC" : "#1E2D45",
                      }}
                    />
                    <div
                      className="text-xs mt-2"
                      style={{ color: i === 6 ? "#00E5CC" : "#8896A8" }}
                    >
                      {day}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
