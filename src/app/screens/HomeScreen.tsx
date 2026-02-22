import { useEffect, useState } from "react";
import { dashboardApi, medicationApi, healthApi } from "../../api";
import type { HomeDashboardData, Medication, AlertData } from "../../api/types";
import {
  Zap,
  HeartPulse,
  UtensilsCrossed,
  TrendingUp,
  Pill,
  Activity,
  Clock,
  ChevronRight,
} from "lucide-react";

interface Props {
  userId: string | null;
  userName: string;
  onNavigate: (screen: string) => void;
  onShowAlert: (data: AlertData | null) => void;
}

interface LastBPReading {
  heartRate: number;
  hrv: number;
  date: string;
}

export default function HomeScreen({
  userId,
  userName,
  onNavigate,
  onShowAlert,
}: Props) {
  const [homeData, setHomeData] = useState<HomeDashboardData | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [lastBP, setLastBP] = useState<LastBPReading | null>(null);
  const [cssScore, setCssScore] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Fetch home data
    dashboardApi
      .getHomeData(userId)
      .then((data) => {
        setHomeData(data);
        if (data.lastReading) {
          setLastBP({
            heartRate: data.lastReading.heartRate || 0,
            hrv: data.lastReading.hrv,
            date: data.lastReading.date,
          });
        }
      })
      .catch(console.error);

    // Fetch medications
    medicationApi
      .getMedications(userId)
      .then((d) => setMedications(d.medications))
      .catch(console.error);

    // Fetch CSS
    healthApi
      .getCSS(userId)
      .then((data) => {
        setCssScore(data.css.score);
      })
      .catch(console.error);

    // Fetch readings to get last BP
    healthApi
      .getReadings(userId, 7)
      .then((data) => {
        if (data.readings && data.readings.length > 0) {
          const latest = data.readings[0];
          setLastBP((prev) =>
            prev
              ? { ...prev, hrv: latest.hrv, heartRate: latest.heartRate || 0 }
              : {
                  heartRate: latest.heartRate || 0,
                  hrv: latest.hrv,
                  date: latest.date,
                },
          );
        }
      })
      .catch(console.error);
  }, [userId]);

  const today = new Date();
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const greeting =
    today.getHours() < 12
      ? "Good morning"
      : today.getHours() < 17
        ? "Good afternoon"
        : "Good evening";
  const dateStr = `${dayNames[today.getDay()]}, ${today.getDate()} ${monthNames[today.getMonth()]}`;

  const triggerAlert = async () => {
    if (!userId) {
      onShowAlert(null);
      return;
    }
    try {
      const data = await healthApi.checkAlert(userId);
      onShowAlert(data);
    } catch {
      onShowAlert(null);
    }
  };

  const reminders =
    homeData?.medicationReminders ||
    medications
      .filter((m) => m.dailyReminder)
      .map((m) => ({ name: m.name, time: m.reminderTime || "" }));

  // CSS Status
  const getCSSStatus = () => {
    if (cssScore === null) return { text: "Calculating...", color: "#8896A8" };
    if (cssScore < 30) return { text: "Low Stress", color: "#00E5CC" };
    if (cssScore < 50) return { text: "Moderate", color: "#F5A623" };
    if (cssScore < 70) return { text: "Elevated", color: "#FF9F43" };
    return { text: "High Stress", color: "#FF6B6B" };
  };

  const cssStatus = getCSSStatus();

  return (
    <div className="px-6 py-6 pb-36">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">
          {greeting}, {userName || "there"}!
        </h1>
        <div className="text-sm" style={{ color: "#8896A8" }}>
          {dateStr}
        </div>
      </div>

      {/* Health Status Card */}
      <div
        className="p-5 rounded-2xl mb-4"
        style={{
          background: "linear-gradient(135deg, #111827 0%, #1E2D45 100%)",
          border: "1px solid #1E2D45",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold" style={{ color: "#00E5CC" }}>
            HEALTH STATUS
          </div>
          <button
            onClick={triggerAlert}
            className="px-3 py-1 rounded-lg text-xs flex items-center gap-1"
            style={{
              background: "rgba(255, 107, 107, 0.1)",
              border: "1px solid #FF6B6B",
              color: "#FF6B6B",
            }}
          >
            <Zap size={12} /> Check Alert
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Last BP */}
          <div
            className="p-4 rounded-xl"
            style={{ background: "rgba(0, 229, 204, 0.08)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <HeartPulse size={18} style={{ color: "#00E5CC" }} />
              <span className="text-xs" style={{ color: "#8896A8" }}>
                Last BP
              </span>
            </div>
            {lastBP ? (
              <>
                <div className="text-xl font-bold">
                  {lastBP.heartRate || "--"}{" "}
                  <span className="text-sm font-normal">bpm</span>
                </div>
                <div className="text-xs mt-1" style={{ color: "#8896A8" }}>
                  HRV: {lastBP.hrv || "--"}ms
                </div>
              </>
            ) : (
              <div className="text-sm" style={{ color: "#8896A8" }}>
                No reading yet
              </div>
            )}
          </div>

          {/* Stress Score */}
          <div
            className="p-4 rounded-xl"
            style={{ background: "rgba(0, 229, 204, 0.08)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Activity size={18} style={{ color: cssStatus.color }} />
              <span className="text-xs" style={{ color: "#8896A8" }}>
                Stress Level
              </span>
            </div>
            <div
              className="text-xl font-bold"
              style={{ color: cssStatus.color }}
            >
              {cssScore ?? "--"}
            </div>
            <div className="text-xs mt-1" style={{ color: cssStatus.color }}>
              {cssStatus.text}
            </div>
          </div>
        </div>

        {/* Health Pulse Message */}
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid #1E2D45" }}>
          <p className="text-sm leading-relaxed">
            {homeData?.healthPulse ||
              "Take a BP reading to get personalized health insights."}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-4">
        <div
          className="text-sm font-semibold mb-3"
          style={{ color: "#8896A8" }}
        >
          QUICK ACTIONS
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => onNavigate("screen-8")}
            className="p-4 rounded-xl cursor-pointer flex items-center gap-3"
            style={{ background: "#111827", border: "1px solid #00E5CC" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0, 229, 204, 0.15)" }}
            >
              <HeartPulse size={24} style={{ color: "#00E5CC" }} />
            </div>
            <div>
              <div className="text-sm font-semibold">Check BP</div>
              <div className="text-xs" style={{ color: "#8896A8" }}>
                rPPG Detection
              </div>
            </div>
          </div>

          <div
            onClick={() => onNavigate("screen-9")}
            className="p-4 rounded-xl cursor-pointer flex items-center gap-3"
            style={{ background: "#111827", border: "1px solid #1E2D45" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(245, 166, 35, 0.15)" }}
            >
              <UtensilsCrossed size={24} style={{ color: "#F5A623" }} />
            </div>
            <div>
              <div className="text-sm font-semibold">Log Meal</div>
              <div className="text-xs" style={{ color: "#8896A8" }}>
                Track food
              </div>
            </div>
          </div>

          <div
            onClick={() => onNavigate("screen-12")}
            className="p-4 rounded-xl cursor-pointer flex items-center gap-3"
            style={{ background: "#111827", border: "1px solid #1E2D45" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(136, 150, 168, 0.15)" }}
            >
              <TrendingUp size={24} style={{ color: "#8896A8" }} />
            </div>
            <div>
              <div className="text-sm font-semibold">Trends</div>
              <div className="text-xs" style={{ color: "#8896A8" }}>
                View history
              </div>
            </div>
          </div>

          <div
            onClick={() => onNavigate("screen-10")}
            className="p-4 rounded-xl cursor-pointer flex items-center gap-3"
            style={{ background: "#111827", border: "1px solid #1E2D45" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(167, 139, 250, 0.15)" }}
            >
              <Pill size={24} style={{ color: "#A78BFA" }} />
            </div>
            <div>
              <div className="text-sm font-semibold">Medications</div>
              <div className="text-xs" style={{ color: "#8896A8" }}>
                Manage meds
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Medication Reminders */}
      {reminders.length > 0 && (
        <div className="mb-4">
          <div
            className="text-sm font-semibold mb-3"
            style={{ color: "#8896A8" }}
          >
            REMINDERS
          </div>
          {reminders.map((med, i) => (
            <div
              key={i}
              className="px-4 py-3 rounded-xl mb-2 flex justify-between items-center"
              style={{
                background: "rgba(167, 139, 250, 0.08)",
                border: "1px solid #A78BFA",
              }}
            >
              <div className="flex items-center gap-3">
                <Pill size={18} style={{ color: "#A78BFA" }} />
                <div>
                  <div className="text-sm font-medium">{med.name}</div>
                  <div className="text-xs" style={{ color: "#8896A8" }}>
                    Due at {med.time}
                  </div>
                </div>
              </div>
              <Clock size={16} style={{ color: "#A78BFA" }} />
            </div>
          ))}
        </div>
      )}

      {/* Today's Tip */}
      {homeData?.todayTip && (
        <div
          className="p-4 rounded-xl mb-4"
          style={{
            background: "rgba(0, 229, 204, 0.05)",
            border: "1px solid #1E2D45",
          }}
        >
          <div
            className="text-xs font-semibold mb-2"
            style={{ color: "#00E5CC" }}
          >
            💡 TODAY'S TIP
          </div>
          <div className="text-sm leading-relaxed">{homeData.todayTip}</div>
        </div>
      )}

      {/* Activity Summary */}
      <div
        className="text-sm mb-4 p-4 rounded-xl"
        style={{ background: "#111827", border: "1px solid #1E2D45" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs mb-1" style={{ color: "#8896A8" }}>
              TODAY'S ACTIVITY
            </div>
            <div className="text-sm">
              {homeData?.recentActivity || "Start tracking your activity"}
            </div>
          </div>
          <ChevronRight size={18} style={{ color: "#8896A8" }} />
        </div>
      </div>

      {/* Share Report Link */}
      <div
        onClick={() => onNavigate("screen-14")}
        className="text-center text-sm cursor-pointer py-3"
        style={{ color: "#00E5CC" }}
      >
        Share health report with your doctor →
      </div>
    </div>
  );
}
