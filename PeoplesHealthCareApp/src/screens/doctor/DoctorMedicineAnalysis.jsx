import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Platform, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';

// ── Constants ──────────────────────────────────────────────────
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CAT_KEYWORDS = {
  'Antidiabetic': ['metformin', 'glipizide', 'insulin', 'sitagliptin', 'gliclazide', 'glibenclamide', 'empagliflozin', 'dapagliflozin'],
  'Antihypertensive': ['lisinopril', 'amlodipine', 'losartan', 'atenolol', 'ramipril', 'telmisartan', 'valsartan', 'nifedipine', 'candesartan', 'bisoprolol'],
  'Antibiotic': ['amoxicillin', 'augmentin', 'azithromycin', 'cephalexin', 'ciprofloxacin', 'metronidazole', 'doxycycline', 'cloxacillin', 'co-amoxiclav'],
  'Analgesic': ['paracetamol', 'ibuprofen', 'diclofenac', 'tramadol', 'codeine', 'mefenamic', 'aspirin'],
  'Antacid/GI': ['omeprazole', 'pantoprazole', 'ranitidine', 'esomeprazole', 'domperidone', 'ondansetron', 'metoclopramide'],
  'Statin': ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin'],
  'Vitamin/Supplement': ['vitamin', 'zinc', 'iron', 'calcium', 'ferrous', 'folic', 'b12', 'vit d'],
  'Antihistamine': ['cetirizine', 'loratadine', 'chlorpheniramine', 'fexofenadine', 'promethazine'],
  'Antiviral': ['acyclovir', 'oseltamivir', 'valacyclovir', 'famciclovir'],
  'Thyroid': ['thyroxine', 'levothyroxine', 'methimazole', 'carbimazole', 'propylthiouracil'],
  'Respiratory': ['salbutamol', 'prednisolone', 'beclomethasone', 'montelukast', 'fluticasone', 'ipratropium'],
};

const CAT_COLORS = {
  'Antidiabetic': '#1565C0',
  'Antihypertensive': '#00897B',
  'Antibiotic': '#E65100',
  'Analgesic': '#EC4899',
  'Antacid/GI': '#F59E0B',
  'Statin': '#7B1FA2',
  'Vitamin/Supplement': '#84CC16',
  'Antihistamine': '#06B6D4',
  'Antiviral': '#EF4444',
  'Thyroid': '#F97316',
  'Respiratory': '#8B5CF6',
  'Other': '#94A3B8',
};

// ── Helper Functions ────────────────────────────────────────────
function inferCategory(name) {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CAT_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return 'Other';
}

function analyseRx(prescriptions, year, month) {
  const inPeriod = prescriptions.filter(rx => {
    const d = new Date(rx.createdAt);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const inPrev = prescriptions.filter(rx => {
    const d = new Date(rx.createdAt);
    return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
  });

  const countMeds = (list) => {
    const map = {};
    list.forEach(rx => {
      (rx.medications || []).forEach(med => {
        const key = med.name?.trim();
        if (!key) return;
        if (!map[key]) map[key] = { name: key, count: 0 };
        map[key].count++;
      });
    });
    return map;
  };

  const currMap = countMeds(inPeriod);
  const prevMap = countMeds(inPrev);

  const topMeds = Object.values(currMap)
    .map(m => ({ ...m, lastMonth: prevMap[m.name]?.count || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const catMap = {};
  inPeriod.forEach(rx => {
    (rx.medications || []).forEach(med => {
      const cat = inferCategory(med.name || '');
      if (!catMap[cat]) catMap[cat] = 0;
      catMap[cat]++;
    });
  });
  
  const categories = Object.entries(catMap)
    .map(([cat, total]) => ({ cat, total }))
    .sort((a, b) => b.total - a.total);

  const trend = [];
  for (let i = 5; i >= 0; i--) {
    let m = month - i;
    let y = year;
    while (m < 0) { m += 12; y--; }
    const slice = prescriptions.filter(rx => {
      const d = new Date(rx.createdAt);
      return d.getFullYear() === y && d.getMonth() === m;
    });
    const totalMeds = slice.reduce((s, rx) => s + (rx.medications?.length || 0), 0);
    trend.push({ month: MONTHS[m].slice(0, 3), total: totalMeds, rxCount: slice.length });
  }

  return {
    totalRx: inPeriod.length,
    totalMeds: inPeriod.reduce((s, rx) => s + (rx.medications?.length || 0), 0),
    uniqueMeds: Object.keys(currMap).length,
    topMeds,
    categories,
    trend,
  };
}

// ── Main Component ──────────────────────────────────────────────
export default function DoctorMedicineAnalysis() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const [medSearch] = useState('');
  const [medFilter, setMedFilter] = useState('All');
  const [sortBy, setSortBy] = useState('prescribed');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
  try {
    setLoading(true);
    setError(null);

    console.log('📡 Fetching prescriptions from:', '/prescriptions');

    const res = await api.get('/prescriptions');
    
    // Debug log - very important
    console.log('📊 Full API Response:', res);

    // Handle different possible response structures
    let prescriptionsData = [];

    if (res?.data) {
      // New api.js structure
      if (Array.isArray(res.data)) {
        prescriptionsData = res.data;
      } else if (Array.isArray(res.data?.prescriptions)) {
        prescriptionsData = res.data.prescriptions;
      } else if (Array.isArray(res.data?.data)) {
        prescriptionsData = res.data.data;
      } else if (res.data?.success && Array.isArray(res.data?.prescriptions)) {
        prescriptionsData = res.data.prescriptions;
      }
    }

    console.log(`✅ Loaded ${prescriptionsData.length} prescriptions`);
    setPrescriptions(prescriptionsData);

  } catch (err) {
    console.error('❌ Load error:', err?.response || err);
    setError(err?.message || 'Failed to load prescription data');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Compute analysis data
  const data = useMemo(() => {
    if (!prescriptions.length) return null;
    return analyseRx(prescriptions, selectedYear, selectedMonth);
  }, [prescriptions, selectedYear, selectedMonth]);

  // Filtered medicines
  const filteredMeds = useMemo(() => {
    if (!data?.topMeds) return [];
    let list = data.topMeds;
    
    if (medFilter !== 'All') {
      list = list.filter(m => inferCategory(m.name) === medFilter);
    }
    
    if (medSearch.trim()) {
      const term = medSearch.toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(term));
    }
    
    if (sortBy === 'growth') {
      list = [...list].sort((a, b) => {
        const deltaA = a.count - a.lastMonth;
        const deltaB = b.count - b.lastMonth;
        return deltaB - deltaA;
      });
    }
    
    return list;
  }, [data, medFilter, medSearch, sortBy]);

  const maxMed = data?.topMeds?.[0]?.count || 1;
  const maxCatV = data?.categories?.[0]?.total || 1;
  const maxTrend = Math.max(...(data?.trend || []).map(t => t.total), 1);

  const allCats = useMemo(() => {
    const cats = new Set(['All']);
    if (data?.topMeds) {
      data.topMeds.forEach(m => cats.add(inferCategory(m.name)));
    }
    return Array.from(cats);
  }, [data]);

  // Generate insights
  const insights = useMemo(() => {
    if (!data) return [];
    const list = [];
    
    if (data.topMeds.length > 0) {
      const top = data.topMeds[0];
      list.push({
        title: `#1 Medicine: ${top.name}`,
        desc: `Prescribed ${top.count} times this month`,
        color: '#1565C0',
      });
    }
    
    if (data.categories.length > 0) {
      const topCat = data.categories[0];
      list.push({
        title: `Leading Category`,
        desc: `${topCat.cat} with ${topCat.total} prescriptions`,
        color: CAT_COLORS[topCat.cat] || '#94A3B8',
      });
    }
    
    if (data.trend.length > 1) {
      const latest = data.trend[data.trend.length - 1].total;
      const prev = data.trend[data.trend.length - 2].total;
      const change = latest - prev;
      const pct = prev > 0 ? Math.round((change / prev) * 100) : 0;
      
      if (change > 0) {
        list.push({
          title: 'Prescription Growth',
          desc: `Up ${pct}% from last month`,
          color: '#22C55E',
        });
      } else if (change < 0) {
        list.push({
          title: 'Prescription Decline',
          desc: `Down ${Math.abs(pct)}% from last month`,
          color: '#EF4444',
        });
      }
    }
    
    return list;
  }, [data]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={styles.loadingText}>Loading analysis...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1565C0" />
      }
    >
      {/* Header */}
      <LinearGradient
        colors={['#0D2137', '#1565C0', '#00ACC1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="medical" size={24} color="#fff" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Medicine Analysis</Text>
            <Text style={styles.headerSubtitle}>Prescription trends & insights</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Period Selector */}
        <View style={styles.periodCard}>
          <Text style={styles.periodLabel}>Analysis Period</Text>
          <View style={styles.periodRow}>
            <TouchableOpacity
              style={styles.periodButton}
              onPress={() => {
                const newMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
                const newYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
                setSelectedMonth(newMonth);
                setSelectedYear(newYear);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-back" size={20} color="#1565C0" />
            </TouchableOpacity>

            <View style={styles.periodDisplay}>
              <Text style={styles.periodText}>
                {MONTHS[selectedMonth]} {selectedYear}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.periodButton}
              onPress={() => {
                const newMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
                const newYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
                if (newYear > now.getFullYear() || (newYear === now.getFullYear() && newMonth > now.getMonth())) {
                  return;
                }
                setSelectedMonth(newMonth);
                setSelectedYear(newYear);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-forward" size={20} color="#1565C0" />
            </TouchableOpacity>
          </View>
        </View>

        {!data ? (
          <View style={styles.noData}>
            <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
            <Text style={styles.noDataText}>No prescription data for this period</Text>
          </View>
        ) : (
          <>
          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#1565C0' }]}>
                <Ionicons name="document-text" size={20} color="#fff" />
              </View>
              <Text style={styles.statValue}>{data.totalRx}</Text>
              <Text style={styles.statLabel}>Prescriptions</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#22C55E' }]}>
                <Ionicons name="medical" size={20} color="#fff" />
              </View>
              <Text style={styles.statValue}>{data.totalMeds}</Text>
              <Text style={styles.statLabel}>Medicines</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#EF4444' }]}>
                <Ionicons name="apps" size={20} color="#fff" />
              </View>
              <Text style={styles.statValue}>{data.uniqueMeds}</Text>
              <Text style={styles.statLabel}>Unique</Text>
            </View>
          </View>

          {/* 6-Month Trend Chart */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>6-Month Prescription Trend</Text>
            <Text style={styles.cardSubtitle}>Total medicines prescribed per month</Text>
            
            <View style={styles.chartContainer}>
              {data.trend.map((item, idx) => {
                const barHeight = (item.total / maxTrend) * 120;
                return (
                  <View key={idx} style={styles.chartBar}>
                    <View style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: barHeight,
                            backgroundColor: idx === data.trend.length - 1 ? '#1565C0' : '#cbd5e1',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barValue}>{item.total}</Text>
                    <Text style={styles.barLabel}>{item.month}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Categories */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Prescriptions by Category</Text>
            <Text style={styles.cardSubtitle}>Total items per drug class</Text>
            
            <View style={styles.categoriesContainer}>
              {data.categories.map(cat => {
                const color = CAT_COLORS[cat.cat] || '#94A3B8';
                const percentage = Math.round((cat.total / maxCatV) * 100);
                
                return (
                  <View key={cat.cat} style={styles.categoryItem}>
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryLeft}>
                        <View style={[styles.categoryDot, { backgroundColor: color }]} />
                        <Text style={styles.categoryName}>{cat.cat}</Text>
                      </View>
                      <Text style={styles.categoryValue}>{cat.total}</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${percentage}%`, backgroundColor: color },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Filter Chips */}
          <View style={styles.filterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {allCats.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterChip,
                    medFilter === cat && styles.filterChipActive,
                  ]}
                  onPress={() => setMedFilter(cat)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      medFilter === cat && styles.filterChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Sort Buttons */}
          <View style={styles.sortContainer}>
            <Text style={styles.sortLabel}>Sort by:</Text>
            <View style={styles.sortButtons}>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'prescribed' && styles.sortButtonActive]}
                onPress={() => setSortBy('prescribed')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'prescribed' && styles.sortButtonTextActive]}>
                  Volume
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'growth' && styles.sortButtonActive]}
                onPress={() => setSortBy('growth')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'growth' && styles.sortButtonTextActive]}>
                  Growth
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Medicine List */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Most Prescribed Medicines</Text>
            <Text style={styles.cardSubtitle}>
              Ranked by frequency — {filteredMeds.length} medicines
            </Text>

            <View style={styles.medicineList}>
              {filteredMeds.map((med, idx) => {
                const barPct = Math.round((med.count / maxMed) * 100);
                const delta = med.count - med.lastMonth;
                const category = inferCategory(med.name);
                const catColor = CAT_COLORS[category] || '#94A3B8';
                
                let rankEmoji = '';
                let rankStyle = {};
                if (idx === 0) {
                  rankEmoji = '🥇';
                  rankStyle = styles.rankGold;
                } else if (idx === 1) {
                  rankEmoji = '🥈';
                  rankStyle = styles.rankSilver;
                } else if (idx === 2) {
                  rankEmoji = '🥉';
                  rankStyle = styles.rankBronze;
                }

                return (
                  <View key={med.name} style={styles.medicineItem}>
                    <View style={[styles.rankBadge, rankStyle]}>
                      <Text style={styles.rankText}>
                        {rankEmoji || `#${idx + 1}`}
                      </Text>
                    </View>

                    <View style={styles.medicineContent}>
                      <View style={styles.medicineHeader}>
                        <Text style={styles.medicineName}>{med.name}</Text>
                        <View style={[styles.categoryBadge, { backgroundColor: `${catColor}20` }]}>
                          <Text style={[styles.categoryBadgeText, { color: catColor }]}>
                            {category}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.medicineProgress}>
                        <View style={styles.progressBarSmall}>
                          <LinearGradient
                            colors={['#1565C0', '#00ACC1']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.progressFillSmall, { width: `${barPct}%` }]}
                          />
                        </View>
                        <Text style={styles.progressPercent}>{barPct}%</Text>
                      </View>

                      <View style={styles.medicineStats}>
                        <View style={styles.medicineStat}>
                          <Text style={styles.medicineStatValue}>{med.count}</Text>
                          <Text style={styles.medicineStatLabel}>this month</Text>
                        </View>
                        <View style={styles.medicineStat}>
                          <Text style={styles.medicineStatValue}>{med.lastMonth}</Text>
                          <Text style={styles.medicineStatLabel}>last month</Text>
                        </View>
                        <View
                          style={[
                            styles.trendBadge,
                            delta > 0
                              ? styles.trendBadgeUp
                              : delta < 0
                              ? styles.trendBadgeDown
                              : styles.trendBadgeNeutral,
                          ]}
                        >
                          <Text
                            style={[
                              styles.trendBadgeText,
                              delta > 0
                                ? styles.trendTextUp
                                : delta < 0
                                ? styles.trendTextDown
                                : styles.trendTextNeutral,
                            ]}
                          >
                            {delta > 0 ? `↑ +${delta}` : delta < 0 ? `↓ ${delta}` : '→ 0'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}

              {filteredMeds.length === 0 && (
                <View style={styles.noMedicines}>
                  <Ionicons name="search-outline" size={48} color="#cbd5e1" />
                  <Text style={styles.noMedicinesText}>No medicines found</Text>
                </View>
              )}
            </View>
          </View>

          {/* Insights */}
          {insights.length > 0 && (
            <View style={styles.insightsContainer}>
              {insights.map((insight, idx) => (
                <View key={idx} style={styles.insightCard}>
                  <View style={[styles.insightIcon, { backgroundColor: `${insight.color}18` }]}>
                    <Ionicons
                      name={
                        insight.title.includes('#1')
                          ? 'trophy'
                          : insight.title.includes('Leading')
                          ? 'bar-chart'
                          : 'trending-up'
                      }
                      size={20}
                      color={insight.color}
                    />
                  </View>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightDesc}>{insight.desc}</Text>
                </View>
              ))}
            </View>
          )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

// ── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingBottom: 24,
  },
  body: {
    padding: 14,
    gap: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1565C0',
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  decCircle1: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decCircle2: {
    position: 'absolute',
    right: 60,
    bottom: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.68)',
    marginTop: 2,
  },

  // Period Selector
  periodCard: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  periodLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  periodDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  periodText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },

  // No Data
  noData: {
    padding: 48,
    alignItems: 'center',
  },
  noDataText: {
    marginTop: 16,
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0D2137',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // Card
  card: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 16,
  },

  // Chart
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
    paddingTop: 16,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 24,
    borderRadius: 6,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
  },
  barLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Categories
  categoriesContainer: {
    gap: 16,
  },
  categoryItem: {
    gap: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    fontSize: 13,
    color: '#475569',
  },
  categoryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Filters
  filterContainer: {
    marginHorizontal: -14,
  },
  filterScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#1565C0',
    borderColor: '#1565C0',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#fff',
  },

  // Sort
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  sortButtonTextActive: {
    color: '#1D4ED8',
  },

  // Medicine List
  medicineList: {
    gap: 12,
  },
  medicineItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  rankGold: {
    backgroundColor: '#fef3c7',
  },
  rankSilver: {
    backgroundColor: '#e5e7eb',
  },
  rankBronze: {
    backgroundColor: '#fef2e8',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
  },
  medicineContent: {
    flex: 1,
    gap: 8,
  },
  medicineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  medicineName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  medicineProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarSmall: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFillSmall: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: 11,
    color: '#94A3B8',
    width: 36,
  },
  medicineStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  medicineStat: {
    alignItems: 'center',
  },
  medicineStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  medicineStatLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  trendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  trendBadgeUp: {
    backgroundColor: '#dcfce7',
  },
  trendBadgeDown: {
    backgroundColor: '#fee2e2',
  },
  trendBadgeNeutral: {
    backgroundColor: '#F1F5F9',
  },
  trendBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  trendTextUp: {
    color: '#15803d',
  },
  trendTextDown: {
    color: '#b91c1c',
  },
  trendTextNeutral: {
    color: '#64748B',
  },

  // No Medicines
  noMedicines: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  noMedicinesText: {
    marginTop: 12,
    fontSize: 13,
    color: '#94A3B8',
  },

  // Insights
  insightsContainer: {
    gap: 12,
  },
  insightCard: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  insightDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
});
