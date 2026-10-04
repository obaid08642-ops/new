// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText, IconButton } from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

interface CallSession {
  id: string;
  room_name: string;
  caller_id: string;
  callee_id: string;
  call_type: "voice" | "video" | "group";
  status: "pending" | "active" | "ended" | "missed" | "rejected";
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  createdAt: string;
}

export default function CallHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const currentUser = useSelector((state: any) => state.auth.user) || {
    id: "patient_default",
  };

  const [calls, setCalls] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchHistory = async (pageNum: number, isRefresh = false) => {
    try {
      if (pageNum === 1 && !isRefresh) setLoading(true);
      const data = await apiFetch(`/calls/history?page=${pageNum}&limit=20`);
      if (data && Array.isArray(data.calls)) {
        if (isRefresh || pageNum === 1) {
          setCalls(data.calls);
        } else {
          setCalls((prev) => [...prev, ...data.calls]);
        }
        setHasMore(calls.length + data.calls.length < data.total);
      }
    } catch (err) {
      console.warn("Could not fetch call history", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchHistory(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchHistory(nextPage);
    }
  };

  const handleRedial = (item: CallSession) => {
    const isCaller = item.caller_id === currentUser.id;
    const targetUserId = isCaller ? item.callee_id : item.caller_id;

    router.push({
      pathname: "/consultations/video-call",
      params: { appointmentId: item.id },
    });
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return "0 ثواني";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s} ث`;
    return `${m} د و ${s} ث`;
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString("ar-EG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusText = (status: string, isCaller: boolean) => {
    switch (status) {
      case "ended":
        return "مكالمة مكتملة";
      case "rejected":
        return isCaller ? "مرفوضة من الطرف الآخر" : "تم رفضها";
      case "missed":
        return isCaller ? "لم يتم الرد" : "مكالمة فائتة";
      case "active":
        return "مكالمة نشطة حالياً";
      default:
        return "مكالمة معلقة";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ended":
        return colors.success || "#10B981";
      case "missed":
      case "rejected":
        return colors.error || "#F0695C";
      default:
        return colors.warning || "#F0A526";
    }
  };

  const renderItem = ({ item }: { item: CallSession }) => {
    const isCaller = item.caller_id === currentUser.id;
    const iconName = item.call_type === "video" ? "video" : "call";
    const statusColor = getStatusColor(item.status);
    const title = isCaller ? "اتصال صادر" : "اتصال وارد";

    return (
      <View
        style={[
          st.card,
          {
            backgroundColor: colors.surfaceSecondary || "#1A2232",
            borderColor: colors.borderLight,
          },
        ]}
      >
        <View style={st.cardHeader}>
          <View
            style={[
              st.iconWrap,
              {
                backgroundColor:
                  item.status === "missed"
                    ? "rgba(239, 68, 68, 0.1)"
                    : "rgba(16, 185, 129, 0.1)",
              },
            ]}
          >
            <Icon name={iconName} size={24} color={statusColor} />
          </View>
          <View style={st.infoWrap}>
            <AppText variant="labelLG" color={colors.textPrimary}>
              {title}
            </AppText>
            <AppText
              variant="caption"
              color={statusColor}
              style={{ marginTop: 2 }}
            >
              {getStatusText(item.status, isCaller)}
            </AppText>
          </View>
          <TouchableOpacity
            onPress={() => handleRedial(item)}
            style={[
              st.redialBtn,
              { backgroundColor: colors.primary || "#4F46E5" },
            ]}
          >
            <Icon name="call" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={[st.cardFooter, { borderTopColor: colors.borderLight }]}>
          <AppText variant="caption" color={colors.textTertiary}>
            {formatDate(item.createdAt)}
          </AppText>
          {item.status === "ended" && (
            <AppText variant="caption" color={colors.textSecondary}>
              المدة: {formatDuration(item.duration_seconds)}
            </AppText>
          )}
        </View>
      </View>
    );
  };

  return (
    <View
      style={[
        st.container,
        { backgroundColor: colors.background || "#090D14" },
      ]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View
        style={[
          st.hdr,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <View style={{ width: 44 }} />
        <AppText
          variant="h4"
          color={colors.textPrimary}
          style={{ fontWeight: "800" }}
        >
          سجل المكالمات
        </AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      {loading ? (
        <View style={st.centered}>
          <ActivityIndicator size="large" color={colors.primary || "#4F46E5"} />
        </View>
      ) : calls.length === 0 ? (
        <View style={st.centered}>
          <View
            style={[
              st.emptyIconWrap,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <Icon name="call" size={48} color={colors.textTertiary} />
          </View>
          <AppText
            variant="h5"
            color={colors.textSecondary}
            style={{ marginTop: 16 }}
          >
            لا يوجد مكالمات سابقة
          </AppText>
          <AppText
            variant="bodySM"
            color={colors.textTertiary}
            style={{ marginTop: 8, textAlign: "center", paddingHorizontal: 40 }}
          >
            المكالمات التي تقوم بها مع الأطباء الاستشاريين ستظهر هنا للرجوع
            إليها لاحقاً.
          </AppText>
        </View>
      ) : (
        <FlatList
          data={calls}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            st.listContent,
            { paddingBottom: insets.bottom + 16 },
          ]}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            hasMore ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ marginVertical: 16 }}
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  hdr: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: { padding: 16, gap: 12 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  infoWrap: {
    flex: 1,
    marginRight: 12,
    alignItems: "flex-start",
  },
  redialBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardFooter: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
