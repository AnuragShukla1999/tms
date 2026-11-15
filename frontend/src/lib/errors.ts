import axios from "axios";

interface NestErrorBody {
  message?: string | string[];
}

/** Turns any thrown value into a message that is safe to show to a user. */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<NestErrorBody>(error)) {
    if (!error.response) {
      return error.code === "ECONNABORTED"
        ? "The request timed out. Try again."
        : "Can't reach the server. Check your connection and that the backend is running.";
    }
    const { status, data } = error.response;
    const raw = data?.message;
    const text = Array.isArray(raw) ? raw.join(". ") : raw;

    if (status >= 500) return "Something went wrong on the server. Try again shortly.";
    if (status === 429) return "Too many requests. Wait a moment and try again.";
    if (status === 404) return text ?? "That record could not be found.";
    if (status === 403) return text ?? "You don't have permission to do that.";
    if (status === 401) return text ?? "Your session has expired. Sign in again.";
    return text ?? "The request could not be completed.";
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function getStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
