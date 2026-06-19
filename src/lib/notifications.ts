import { toast } from "sonner";

export function notifySuccess(message: string, description?: string) {
  toast.success(message, {
    description,
    duration: 4000,
  });
}

export function notifyError(message: string, description?: string) {
  toast.error(message, {
    description,
    duration: 5000,
  });
}

export function notifyInfo(message: string, description?: string) {
  toast.info(message, {
    description,
    duration: 4000,
  });
}

export function notifyLoading(message: string) {
  return toast.loading(message);
}

export function copyToClipboard(text: string, label: string = "Copied") {
  navigator.clipboard.writeText(text).then(() => {
    toast.success(label, {
      description: "Text copied to clipboard",
      duration: 3000,
    });
  }).catch(() => {
    toast.error("Failed to copy", {
      description: "Please try again",
      duration: 4000,
    });
  });
}

export function notifyStatusChange(oldStatus: string, newStatus: string) {
  toast.success(`Status updated`, {
    description: `Changed from ${oldStatus} to ${newStatus}`,
    duration: 3000,
  });
}
