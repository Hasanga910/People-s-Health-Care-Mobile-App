import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PlaceholderScreen({ route }) {
  const screenName = route?.name || 'Screen';
  return (
    <View style={styles.root}>
      <Ionicons name="construct-outline" size={56} color="#cbd5e1" />
      <Text style={styles.title}>{screenName}</Text>
      <Text style={styles.sub}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginTop: 16 },
  sub: { fontSize: 14, color: '#64748b', marginTop: 6 },
});
