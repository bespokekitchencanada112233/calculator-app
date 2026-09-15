export type UpdateStatus =
  | { type: "checking" }
  | { type: "available"; version: string }
  | { type: "up-to-date"; version: string }
  | { type: "downloading"; percent: number }
  | { type: "downloaded"; version: string }
  | { type: "error"; message: string };

declare global {
  interface Window {
    electronAPI?: {
      onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
    };
  }
}
