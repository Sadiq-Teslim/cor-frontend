// Custom Modal Component for Cor App
import { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  showCloseButton?: boolean;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  showCloseButton = true,
  className = "",
}: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(6, 9, 18, 0.95)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`relative w-full max-w-md rounded-2xl p-6 ${className}`}
            style={{ background: "#111827", border: "1px solid #1E2D45" }}
          >
            {showCloseButton && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-lg transition-colors hover:bg-[#1E2D45]"
                style={{ color: "#8896A8" }}
              >
                <X size={20} />
              </button>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Alert Modal - for confirmations and alerts
interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  type?: "info" | "success" | "warning" | "error";
}

const alertColors = {
  info: "#00E5CC",
  success: "#00E5CC",
  warning: "#F5A623",
  error: "#FF6B6B",
};

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  confirmText = "OK",
  cancelText,
  onConfirm,
  type = "info",
}: AlertModalProps) {
  const color = alertColors[type];

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-3" style={{ color: "#F0F4FF" }}>
          {title}
        </h2>
        <p className="text-base mb-6" style={{ color: "#8896A8" }}>
          {message}
        </p>
        <div className="flex gap-3 justify-center">
          {cancelText && (
            <button
              onClick={onClose}
              className="flex-1 font-semibold text-base px-4 py-3 rounded-xl"
              style={{
                background: "transparent",
                border: "1px solid #1E2D45",
                color: "#F0F4FF",
              }}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => {
              onConfirm?.();
              onClose();
            }}
            className="flex-1 font-bold text-base px-4 py-3 rounded-xl"
            style={{ background: color, color: "#0A0F1E" }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Loading Modal
interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
}

export function LoadingModal({
  isOpen,
  message = "Loading...",
}: LoadingModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(6, 9, 18, 0.95)" }}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="text-center p-8 rounded-2xl"
            style={{ background: "#111827", border: "1px solid #1E2D45" }}
          >
            <div
              className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: "#00E5CC" }}
            >
              <div
                className="w-6 h-6 border-3 border-t-transparent rounded-full animate-spin"
                style={{
                  borderColor: "#0A0F1E",
                  borderTopColor: "transparent",
                }}
              />
            </div>
            <p className="text-base" style={{ color: "#F0F4FF" }}>
              {message}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Bottom Sheet Modal
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  className = "",
}: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(6, 9, 18, 0.7)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-6 py-6 rounded-t-3xl z-50 ${className}`}
            style={{ background: "#111827", borderTop: "1px solid #1E2D45" }}
          >
            <div
              className="w-10 h-1 mx-auto mb-4 rounded-full"
              style={{ background: "#1E2D45" }}
            />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1"
              style={{ color: "#8896A8" }}
            >
              <X size={20} />
            </button>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Toast component for notifications
interface ToastProps {
  isOpen: boolean;
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
}

export function Toast({ isOpen, message, type = "info", onClose }: ToastProps) {
  const colors = {
    success: "#00E5CC",
    error: "#FF6B6B",
    info: "#8896A8",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl"
          style={{ background: "#111827", border: `1px solid ${colors[type]}` }}
        >
          <p className="text-sm" style={{ color: colors[type] }}>
            {message}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Modal;
