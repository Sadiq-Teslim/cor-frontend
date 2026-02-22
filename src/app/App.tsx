import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "../context/UserContext";
import { userApi, medicalApi } from "../api";
import { LANGUAGE_MAP } from "../api/types";
import type { AlertData } from "../api/types";
import type { OnboardingFormData } from "./screens";
import { useWakeWord } from "../hooks";

import { Home, Clock, ClipboardPen, Settings, Mic, MicOff } from "lucide-react";

import {
  WelcomeScreen,
  OnboardingScreen,
  MedicalRecordsScreen,
  SmartwatchScreen,
  FirstReadingScreen,
  HomeScreen,
  BPCheckScreen,
  FoodLoggerScreen,
  MedicationScreen,
  InsightsScreen,
  TrendsScreen,
  ClinicalShareScreen,
  SettingsScreen,
  AlertOverlay,
  HeyCorModal,
} from "./screens";

export default function App() {
  const { user, userId, setUser, setUserId } = useUser();

  const [currentScreen, setCurrentScreen] = useState("screen-1");
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [onboardingData, setOnboardingData] = useState<OnboardingFormData>({
    name: "",
    age: "",
    sex: "",
    highBP: "",
    medication: "",
    smokeDrink: "",
    activity: "",
    sleep: "",
  });
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState<string[]>([]);
  const [showHeyCor, setShowHeyCor] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertData, setAlertData] = useState<AlertData | null>(null);
  const [activeNav, setActiveNav] = useState("home");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);

  // Refs to track latest values for callbacks (avoid stale closures)
  const onboardingDataRef = useRef(onboardingData);
  const selectedLanguageRef = useRef(selectedLanguage);
  const connectedDevicesRef = useRef(connectedDevices);

  // Keep refs in sync with state
  useEffect(() => {
    onboardingDataRef.current = onboardingData;
  }, [onboardingData]);
  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
  }, [selectedLanguage]);
  useEffect(() => {
    connectedDevicesRef.current = connectedDevices;
  }, [connectedDevices]);

  // Determine if we should show post-onboarding UI
  const isPostOnboarding = [
    "screen-7",
    "screen-8",
    "screen-9",
    "screen-10",
    "screen-11",
    "screen-12",
    "screen-13",
    "screen-14",
  ].includes(currentScreen);

  // Wake word detection - "Hey Cor" activates voice assistant
  const { isListening: wakeIsListening, isSupported: wakeSupported } =
    useWakeWord({
      wakePhrase: "hey cor",
      enabled: wakeWordEnabled && isPostOnboarding && !showHeyCor,
      onWake: () => {
        console.log("[App] Wake word detected - opening Hey Cor");
        setShowHeyCor(true);
      },
      onListening: setIsWakeWordListening,
    });

  // On mount, if user already exists, skip to home
  useEffect(() => {
    if (userId && user) {
      setOnboardingData((prev) => ({ ...prev, name: user.name }));
      setCurrentScreen("screen-7");
    }
  }, [user]);

  const showScreen = (id: string) => {
    setCurrentScreen(id);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    setActiveNav("home");
    showScreen("screen-7");
  };

  // Map UI values to API values
  const mapSex = (sex: string) =>
    sex === "Male"
      ? ("male" as const)
      : sex === "Female"
        ? ("female" as const)
        : ("other" as const);
  const mapActivity = (a: string) =>
    a === "Sedentary"
      ? ("low" as const)
      : a === "Moderate"
        ? ("moderate" as const)
        : ("high" as const);
  const mapSmartwatch = (d: string) =>
    d.includes("Apple")
      ? ("apple" as const)
      : d.includes("Google")
        ? ("google" as const)
        : d.includes("Samsung")
          ? ("samsung" as const)
          : ("fitbit" as const);

  // Complete onboarding via API - uses refs to always read latest state
  const completeOnboarding = useCallback(async () => {
    // Read from refs to get latest values (avoids stale closure)
    const data = onboardingDataRef.current;
    const language = selectedLanguageRef.current;
    const devices = connectedDevicesRef.current;

    setIsSubmitting(true);
    try {
      const langCode = LANGUAGE_MAP[language] || "en";
      const smokesOrDrinks =
        data.smokeDrink === "Yes" || data.smokeDrink === "Sometimes";
      const response = await userApi.onboard({
        name: data.name,
        age: parseInt(data.age) || 25,
        biologicalSex: mapSex(data.sex),
        preferredLanguage: langCode,
        hasHypertension: data.highBP || "No",
        medications: data.medication === "Yes" ? undefined : "No",
        smokes: smokesOrDrinks,
        drinksAlcohol: smokesOrDrinks,
        activityLevel: mapActivity(data.activity),
        averageSleepHours: parseInt(data.sleep) || 7,
        smartwatchConnected: devices.length > 0,
        smartwatchType:
          devices.length > 0 ? mapSmartwatch(devices[0]) : undefined,
      });
      setUser(response.user);
      setUserId(response.user.id);
      showScreen("screen-4");
    } catch (err) {
      console.error("Onboarding failed:", err);
      alert("Failed to save your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [setUser, setUserId]);

  // Upload medical records via API
  const handleFileUpload = async (file: File) => {
    if (!userId) return;
    setIsSubmitting(true);
    try {
      await medicalApi.uploadRecord(file, userId);
      setFileUploaded(true);
    } catch {
      setFileUploaded(true); // Still mark for UX
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateTo = (tab: string) => {
    setActiveNav(tab);
    switch (tab) {
      case "home":
        showScreen("screen-7");
        break;
      case "insights":
        showScreen("screen-11");
        break;
      case "log":
        showScreen("screen-9");
        break;
      case "settings":
        showScreen("screen-15");
        break;
    }
  };

  const handleShowAlert = (data: AlertData | null) => {
    setAlertData(data);
    setShowAlert(true);
  };

  // Render the active screen
  const renderScreen = () => {
    switch (currentScreen) {
      case "screen-1":
        return (
          <WelcomeScreen
            selectedLanguage={selectedLanguage}
            onSelectLanguage={setSelectedLanguage}
            onContinue={() => showScreen("screen-3")}
          />
        );

      case "screen-3":
        return (
          <OnboardingScreen
            data={onboardingData}
            step={onboardingStep}
            isSubmitting={isSubmitting}
            language={selectedLanguage}
            onUpdateData={setOnboardingData}
            onNextStep={() => setOnboardingStep((s) => s + 1)}
            onComplete={completeOnboarding}
          />
        );

      case "screen-4":
        return (
          <MedicalRecordsScreen
            fileUploaded={fileUploaded}
            isSubmitting={isSubmitting}
            onUploadFile={handleFileUpload}
            onContinue={() => showScreen("screen-5")}
            onSkip={() => showScreen("screen-5")}
          />
        );

      case "screen-5":
        return (
          <SmartwatchScreen
            connectedDevices={connectedDevices}
            onConnect={(device) =>
              setConnectedDevices((prev) => [...prev, device])
            }
            onContinue={() => showScreen("screen-6")}
            onSkip={() => showScreen("screen-6")}
          />
        );

      case "screen-6":
        return (
          <FirstReadingScreen
            userId={userId}
            onComplete={() => showScreen("screen-7")}
          />
        );

      case "screen-7":
        return (
          <HomeScreen
            userId={userId}
            userName={user?.name || onboardingData.name || "there"}
            onNavigate={showScreen}
            onShowAlert={handleShowAlert}
          />
        );

      case "screen-8":
        return <BPCheckScreen userId={userId} onBack={goBack} />;

      case "screen-9":
        return (
          <FoodLoggerScreen
            userId={userId}
            selectedLanguage={selectedLanguage}
            onBack={goBack}
          />
        );

      case "screen-10":
        return <MedicationScreen userId={userId} onBack={goBack} />;

      case "screen-11":
        return <InsightsScreen userId={userId} onBack={goBack} />;

      case "screen-12":
        return <TrendsScreen userId={userId} onBack={goBack} />;

      case "screen-14":
        return <ClinicalShareScreen userId={userId} onBack={goBack} />;

      case "screen-15":
        return (
          <SettingsScreen
            selectedLanguage={selectedLanguage}
            connectedDevices={connectedDevices}
            fileUploaded={fileUploaded}
            user={user}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div
        className="relative mx-auto max-w-[480px] min-h-screen"
        style={{
          background: "#0A0F1E",
          fontFamily: "Inter, sans-serif",
          color: "#F0F4FF",
        }}
      >
        <div className="min-h-screen animate-fadeIn">{renderScreen()}</div>

        {/* Alert Overlay */}
        {showAlert && (
          <AlertOverlay
            alertData={alertData}
            onDismiss={() => setShowAlert(false)}
          />
        )}

        {/* Hey Cor Modal */}
        {showHeyCor && (
          <HeyCorModal
            userId={userId}
            selectedLanguage={selectedLanguage}
            onClose={() => setShowHeyCor(false)}
          />
        )}

        {/* Hey Cor Button with Wake Word Indicator */}
        {isPostOnboarding && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center">
            {/* Wake word status */}
            {wakeSupported && wakeWordEnabled && (
              <div
                className="mb-2 px-3 py-1 rounded-full text-xs flex items-center gap-1"
                style={{
                  background: isWakeWordListening
                    ? "rgba(0, 229, 204, 0.2)"
                    : "rgba(136, 150, 168, 0.2)",
                  color: isWakeWordListening ? "#00E5CC" : "#8896A8",
                }}
              >
                {isWakeWordListening ? <Mic size={12} /> : <MicOff size={12} />}
                {isWakeWordListening ? 'Say "Hey Cor"' : "Wake word off"}
              </div>
            )}
            <button
              onClick={() => setShowHeyCor(true)}
              className="w-14 h-14 rounded-full flex items-center justify-center relative"
              style={{
                background: isWakeWordListening ? "#00E5CC" : "#00E5CC",
                color: "#0A0F1E",
                animation: isWakeWordListening
                  ? "pulse 1s ease-in-out infinite"
                  : "pulse 2s ease-in-out infinite",
              }}
            >
              <Mic size={24} />
              {/* Listening indicator ring */}
              {isWakeWordListening && (
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: "2px solid #00E5CC",
                    animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
                  }}
                />
              )}
            </button>
          </div>
        )}

        {/* Bottom Navigation */}
        {isPostOnboarding && (
          <nav
            className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[480px] h-16 flex items-center justify-around z-[9999]"
            style={{ background: "#111827", borderTop: "1px solid #1E2D45" }}
          >
            {[
              { key: "home", icon: <Home size={20} />, label: "Home" },
              {
                key: "insights",
                icon: <Clock size={20} />,
                label: "History",
              },
              { key: "log", icon: <ClipboardPen size={20} />, label: "Log" },
              {
                key: "settings",
                icon: <Settings size={20} />,
                label: "Settings",
              },
            ].map((tab) => (
              <div
                key={tab.key}
                onClick={() => navigateTo(tab.key)}
                className="flex flex-col items-center justify-center flex-1 text-[11px] font-semibold cursor-pointer px-2 py-2"
                style={{ color: activeNav === tab.key ? "#00E5CC" : "#8896A8" }}
              >
                <div className="mb-1">{tab.icon}</div>
                <div>{tab.label}</div>
              </div>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
