// Custom Hooks
import { useState, useCallback } from "react";

// Toast hook for showing notifications
interface ToastState {
  isOpen: boolean;
  message: string;
  type: "success" | "error" | "info";
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    isOpen: false,
    message: "",
    type: "info",
  });

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      setToast({ isOpen: true, message, type });
      setTimeout(() => {
        setToast((prev) => ({ ...prev, isOpen: false }));
      }, 3000);
    },
    [],
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return { toast, showToast, hideToast };
}

// API loading state hook
export function useApiState<T>() {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      setData(result);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, isLoading, error, execute, reset, setData };
}

// Modal state hook
export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, open, close, toggle };
}

// Countdown hook for BP reading
export function useCountdown(initialValue: number, onComplete?: () => void) {
  const [countdown, setCountdown] = useState(initialValue);
  const [isRunning, setIsRunning] = useState(false);

  const start = useCallback(() => {
    setCountdown(initialValue);
    setIsRunning(true);
  }, [initialValue]);

  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setCountdown(initialValue);
    setIsRunning(false);
  }, [initialValue]);

  // Timer effect is handled in component using this hook
  // This is just state management

  return {
    countdown,
    setCountdown,
    isRunning,
    setIsRunning,
    start,
    stop,
    reset,
  };
}

export { useVoiceOnboarding } from "./useVoiceOnboarding";
export type { VoiceState } from "./useVoiceOnboarding";
export { useWakeWord } from "./useWakeWord";
export { useVoiceInput } from "./useVoiceInput";

export default useToast;
