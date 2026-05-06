import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { COLORS, SHADOW } from '../../constants/theme';
import api from '../../services/api';

const C = COLORS?.patient || {
  primary: '#0D2137',
  secondary: '#1565C0',
  accent: '#00ACC1',
  light: '#E0F2FE',
};

function extractArray(payload, keys = []) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }

  if (Array.isArray(payload?.data)) return payload.data;

  return [];
}

function formatPrettyDate(dateString) {
  if (!dateString) return 'Unknown date';

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function mapHolidayNotifications(list) {
  return list.map((item, index) => ({
    id: `holiday-${item?._id || item?.id || index}`,
    type: 'holiday',
    icon: 'calendar-clear-outline',
    chipText: 'Appointment',
    chipBg: '#FEE2E2',
    chipColor: '#B91C1C',
    title: 'Appointment Cancelled',
    message:
      item?.message ||
      `Your ${item?.session || 'session'} appointment on ${formatPrettyDate(
        item?.date
      )} has been cancelled.`,
    createdAt: item?.createdAt || item?.date || '',
  }));
}

function mapPrecheckNotifications(list) {
  return list.map((item, index) => {
    const fastingHours =
      item?.fastingHours && Number(item?.fastingHours) > 0
        ? ` Fasting required: ${item.fastingHours} hour(s).`
        : '';

    return {
      id: `precheck-${item?._id || item?.id || index}`,
      type: 'precheck',
      icon: 'flask-outline',
      chipText: 'Lab',
      chipBg: '#EDE9FE',
      chipColor: '#7C3AED',
      title: 'Lab Pre-Check Required',
      message:
        item?.message ||
        `${item?.testName || 'A lab test'} requires pre-check instructions.${fastingHours}`,
      createdAt: item?.createdAt || '',
    };
  });
}

function NotificationCard({ item }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconWrap}>
          <Ionicons name={item.icon} size={22} color={C.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>

          <View
            style={[
              styles.chip,
              { backgroundColor: item.chipBg },
            ]}
          >
            <Text style={[styles.chipText, { color: item.chipColor }]}>
              {item.chipText}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.cardMessage}>{item.message}</Text>

      {!!item.createdAt && (
        <Text style={styles.cardDate}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      )}
    </View>
  );
}

export default function NotificationScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const [holidayResult, precheckResult] = await Promise.allSettled([
        api.get('/appointments/holiday-cancellations'),
        api.get('/lab-results/patient-notifications'),
      ]);

      let holidayItems = [];
      let precheckItems = [];

      if (holidayResult.status === 'fulfilled') {
        const holidayRaw = extractArray(holidayResult.value?.data, [
          'cancellations',
          'notifications',
          'data',
        ]);
        holidayItems = mapHolidayNotifications(holidayRaw);
      }

      if (precheckResult.status === 'fulfilled') {
        const precheckRaw = extractArray(precheckResult.value?.data, [
          'notifications',
          'prechecks',
          'data',
        ]);
        precheckItems = mapPrecheckNotifications(precheckRaw);
      }

      const merged = [...holidayItems, ...precheckItems].sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });

      setItems(merged);
    } catch (error) {
      console.log('Notification load error:', error?.message);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.listContent,
        items.length === 0 && { flexGrow: 1, justifyContent: 'center' },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={C.primary}
          colors={[C.primary]}
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="notifications-off-outline" size={38} color={C.primary} />
          </View>
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptySubtitle}>
            Appointment and lab notifications will appear here.
          </Text>
        </View>
      }
      renderItem={({ item }) => <NotificationCard item={item} />}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  listContent: {
    padding: 16,
    backgroundColor: '#F8FAFC',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOW?.sm,
  },

  cardTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },

  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.light || '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },

  chip: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  chipText: {
    fontSize: 11,
    fontWeight: '900',
  },

  cardMessage: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
    fontWeight: '600',
  },

  cardDate: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 10,
    fontWeight: '700',
  },

  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  emptyIconBox: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: C.light || '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  emptyTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
  },

  emptySubtitle: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
});