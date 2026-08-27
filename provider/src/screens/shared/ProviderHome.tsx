// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth, useTheme } from '../../context';
import { apiFetch } from '../../utils/api';

export const ProviderHome = ({ navigation }: any) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (user?.providerType === 'pharmacist') {
          const res = await apiFetch('/pharmacy/orders/pending');
          setItems(res.orders || []);
        } else {
          const res = await apiFetch('/calls/provider/waiting-room');
          setItems(res || []);
        }
      } catch (err) {
        // Silent fail — no console spam
        setItems([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleAction = (item: any) => {
    if (item.type === 'call') {
      navigation.navigate('LiveKitRoomProvider', { roomId: item.roomId });
    } else if (item.type === 'chat') {
      navigation.navigate('PharmacyChatResponder', { threadId: item.threadId, patientName: item.name });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>مرحباً دكتور {user?.name || ''}</Text>
        <Text style={styles.headerSubtitle}>لديك {items.length} طلبات قيد الانتظار</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 50 }} color={theme.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 15 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardName, { color: theme.text }]}>{item.name}</Text>
                <Text style={{ color: theme.textMuted }}>{item.time}</Text>
              </View>
              <Text style={{ color: theme.text, marginBottom: 15 }}>
                {item.type === 'call' ? '📞 طلب استشارة فيديو' : '💬 طلب استشارة صيدلانية'}
              </Text>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: item.type === 'call' ? theme.green : theme.primary }]}
                onPress={() => handleAction(item)}
              >
                <Text style={styles.btnText}>{item.type === 'call' ? 'بدء المكالمة' : 'الرد على المحادثة'}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 30, paddingTop: 60, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { color: '#fff', fontSize: 14, opacity: 0.8, marginTop: 5 },
  card: { padding: 20, borderRadius: 12, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardName: { fontSize: 18, fontWeight: 'bold' },
  btn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
