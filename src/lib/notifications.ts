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
    notifySuccess(label, "Text copied to clipboard");
  }).catch(() => {
    notifyError("Failed to copy", "Please try again");
  });
}
