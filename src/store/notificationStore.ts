import { create } from "zustand";
import { countUnread } from "@/lib/notificationsApi";

type NotificationState = {
  unread: number;
  tradeUnread: number;
  refresh: (userId: string) => Promise<void>;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  unread: 0,
  tradeUnread: 0,
  refresh: async (userId) => {
    try {
      const counts = await countUnread(userId);
      set({ unread: counts.total, tradeUnread: counts.trade });
    } catch {
      // keep the last known numbers if a refresh fails
    }
  },
}));