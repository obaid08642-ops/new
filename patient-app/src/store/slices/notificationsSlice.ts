import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsState {
  items: AppNotification[];
  /** Unread rows of GET /notifications; null while it is unknown (not loaded, or the load failed): no dot is drawn. */
  unreadCount: number | null;
}

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unreadCount: null } as NotificationsState,
  reducers: {
    setNotifications: (state, action: PayloadAction<AppNotification[]>) => {
      state.items = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.isRead).length;
    },
    /** The real count, from the rows the server sent (Home and the notifications screen both report it). */
    setUnreadCount: (state, action: PayloadAction<number | null>) => {
      state.unreadCount = action.payload;
    },
    addNotification: (state, action: PayloadAction<AppNotification>) => {
      state.items.unshift(action.payload);
      if (!action.payload.isRead) state.unreadCount = (state.unreadCount ?? 0) + 1;
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const n = state.items.find((n) => n.id === action.payload);
      if (n && !n.isRead) {
        n.isRead = true;
        state.unreadCount = Math.max(0, (state.unreadCount ?? 0) - 1);
      }
    },
    markAllAsRead: (state) => {
      state.items.forEach((n) => (n.isRead = true));
      state.unreadCount = 0;
    },
  },
});
export const { setNotifications, setUnreadCount, addNotification, markAsRead, markAllAsRead } = notificationsSlice.actions;
export default notificationsSlice.reducer;
