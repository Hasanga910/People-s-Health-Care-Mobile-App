import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, StatusBar, Animated,
  Linking, Platform, Image, StyleSheet, KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BASE_URL } from '../services/api';

const LOGO = require('../../assets/Logo.png');
const API  = BASE_URL;

const SERVICES = [
  { emoji: '📋', title: 'Medical Consultations',    desc: 'Comprehensive consultations with our experienced physician, with personalized care plans tailored to your health needs.',  color: '#1565C0', bg: '#EFF6FF' },
  { emoji: '💊', title: 'Pharmacy Services',         desc: 'Full-service in-house pharmacy ensuring you receive prescribed medications promptly with expert pharmaceutical guidance.',    color: '#00897B', bg: '#F0FDF4' },
  { emoji: '🧪', title: 'Laboratory & Diagnostics',  desc: 'Advanced laboratory testing and ECG services providing accurate diagnostic results to support informed medical decisions.',   color: '#7B1FA2', bg: '#FAF5FF' },
  { emoji: '📅', title: 'Appointment Scheduling',    desc: 'Convenient appointment booking with flexible scheduling options, ensuring you get timely access to medical care.',           color: '#E65100', bg: '#FFF7ED' },
];

const SLIDES = [
  { emoji: '🏥', title: 'Your Health Records, Always With You',  desc: 'Access your prescriptions, lab results, and appointment history anytime — all in one secure place.', cta: 'Create Your Account' },
  { emoji: '💊', title: 'Digital Prescriptions Sent Instantly',  desc: 'No more paper prescriptions. Your doctor sends them directly to the pharmacy — ready when you arrive.', cta: 'Sign Up Free' },
  { emoji: '🧪', title: 'Lab Results in Your Pocket',            desc: 'Get notified the moment your lab results are ready. View detailed reports from your phone.', cta: 'Get Started Today' },
  { emoji: '📅', title: 'Book Appointments in Seconds',          desc: 'Skip the phone queue. Book, reschedule, or cancel appointments online — whenever it suits you.', cta: 'Register Now' },
];

const WHY_US = [
  { icon: '🏥', title: 'Integrated Care',         desc: 'From consultation to prescription and lab testing — everything happens seamlessly under one roof.' },
  { icon: '👨‍⚕️', title: 'Expert Physician',      desc: 'Benefit from the experience of Dr. M.T.D. Jayaweera, who personally oversees every aspect of your care.' },
  { icon: '🔬', title: 'Advanced Diagnostics',    desc: 'State-of-the-art laboratory and ECG facilities ensuring accurate and timely diagnostic results.' },
  { icon: '💊', title: 'In-House Pharmacy',       desc: 'Get your prescriptions filled immediately without the hassle of visiting an external pharmacy.' },
  { icon: '📋', title: 'Complete Health Records', desc: 'Your medical history, test results, and prescriptions are securely maintained and easily accessible.' },
  { icon: '⚡', title: 'Fast & Efficient',         desc: 'Streamlined processes minimize your waiting time so you can focus on what matters — your recovery.' },
];

const QUICK_REPLIES = [
  'How do I book an appointment?',
  'How can I view my lab results?',
  'Where can I see my prescriptions?',
  'How do I cancel an appointment?',
  'How do I check my bills?',
];

function getClinicStatus() {
  const total = new Date().getHours() * 60 + new Date().getMinutes();
  if (total >= 420  && total < 480)  return { open: true,  label: 'Open Now · Morning' };
  if (total >= 1020 && total < 1200) return { open: true,  label: 'Open Now · Evening' };
  if (total < 420)                   return { open: false, label: 'Opens at 7:00 AM' };
  if (total >= 480  && total < 1020) return { open: false, label: 'Opens at 5:00 PM' };
  return                                    { open: false, label: 'Opens Tomorrow 7 AM' };
}

function Slideshow({ onRegister, onLogin }) {
  const [current, setCurrent] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const go = (idx) => {
    const next = ((idx % SLIDES.length) + SLIDES.length) % SLIDES.length;
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setCurrent(next), 200);
  };

  useEffect(() => {
    const t = setInterval(() => go(current + 1), 4500);
    return () => clearInterval(t);
  }, [current]);

  const slide = SLIDES[current];

  return (
    <View>
      <Animated.View style={[sl.card, { opacity: fadeAnim }]}>
        <View style={sl.inner}>
          <Text style={sl.emoji}>{slide.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={sl.title}>{slide.title}</Text>
            <Text style={sl.desc}>{slide.desc}</Text>
            <TouchableOpacity style={sl.cta} onPress={onRegister} activeOpacity={0.85}>
              <Text style={sl.ctaText}>{slide.cta} →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <View style={sl.controls}>
        <TouchableOpacity style={sl.arrow} onPress={() => go(current - 1)}>
          <Text style={sl.arrowText}>‹</Text>
        </TouchableOpacity>
        <View style={sl.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => go(i)}>
              <View style={[sl.dot, i === current && sl.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={sl.arrow} onPress={() => go(current + 1)}>
          <Text style={sl.arrowText}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={onLogin}>
        <Text style={sl.loginLink}>
          Already have an account? <Text style={{ color: 'rgba(255,255,255,0.8)', textDecorationLine: 'underline' }}>Login here</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ChatBot() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "👋 Hello! I'm your navigation assistant for People's Health Care. Ask me anything about the system." },
  ]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const scrollRef               = useRef(null);

  const send = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setLoading(true);
    try {
      const res  = await fetch(`${API}/chatbot/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userText }) });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', text: data.reply || "I couldn't process that." }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, the assistant is temporarily unavailable.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <>
      <TouchableOpacity style={cb.fab} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Text style={{ fontSize: 24 }}>💬</Text>
      </TouchableOpacity>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={cb.overlay} onPress={() => setOpen(false)}>
            <View style={cb.sheet} onStartShouldSetResponder={() => true}>
              <View style={cb.header}>
                <Text style={{ fontSize: 28 }}>🏥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={cb.headerTitle}>PHC Navigation Assistant</Text>
                  <Text style={cb.headerSub}>🟢 Online — ask me anything</Text>
                </View>
                <TouchableOpacity onPress={() => setOpen(false)} style={cb.closeBtn}>
                  <Text style={{ color: '#fff' }}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView ref={scrollRef} style={cb.messages} contentContainerStyle={{ gap: 10, padding: 14 }}>
                {messages.map((msg, i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
                    {msg.role === 'bot' && <Text style={{ fontSize: 18 }}>🤖</Text>}
                    <View style={[cb.bubble, msg.role === 'user' ? cb.bubbleUser : cb.bubbleBot]}>
                      <Text style={{ color: msg.role === 'user' ? '#fff' : '#1E293B', fontSize: 13, lineHeight: 20 }}>{msg.text}</Text>
                    </View>
                  </View>
                ))}
                {loading && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 18 }}>🤖</Text>
                    <ActivityIndicator size="small" color="#1565C0" />
                  </View>
                )}
              </ScrollView>
              {messages.length <= 2 && (
                <View style={cb.quickReplies}>
                  {QUICK_REPLIES.map((q, i) => (
                    <TouchableOpacity key={i} style={cb.quickBtn} onPress={() => send(q)}>
                      <Text style={cb.quickText}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={cb.inputRow}>
                <TextInput value={input} onChangeText={setInput} placeholder="Ask about appointments, results…" placeholderTextColor="#9CA3AF" multiline style={cb.input} />
                <TouchableOpacity onPress={() => send()} disabled={!input.trim() || loading} style={[cb.sendBtn, { backgroundColor: input.trim() && !loading ? '#1565C0' : '#E2E8F0' }]}>
                  <Text style={{ fontSize: 16 }}>➤</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

export default function IndexScreen() {
  const navigation = useNavigation();
  const [doctor, setDoctor]           = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const clinicStatus = getClinicStatus();

  useEffect(() => {
    fetch(`${API}/public/doctor`).then(r => r.json()).then(d => { if (d.doctor) setDoctor(d.doctor); }).catch(() => {});
    fetch(`${API}/feedback/public/mixed`).then(r => r.json()).then(d => setTestimonials(d.feedbacks || [])).catch(() => {});
  }, []);

  const doctorName  = doctor?.name || 'Dr. M.T.D. Jayaweera';
  const doctorExp   = doctor?.doctorDetails?.workingExperience || '15+';
  const doctorPhone = doctor?.telephone || '0777 883 343';

  const STATS = [
    { number: '5000+', label: 'Patients Treated' },
    { number: `${doctorExp}`.includes('+') ? `${doctorExp}` : `${doctorExp}+`, label: 'Years Experience' },
    { number: '98%',   label: 'Satisfaction' },
    { number: '24/7',  label: 'Emergency' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* ── HERO ── */}
        <LinearGradient
          colors={['#0D2137', '#1565C0', '#00ACC1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          {/* Decorative radial blobs */}
          <View style={s.blob1} />
          <View style={s.blob2} />

          {/* ── NAVBAR ── */}
          <View style={s.navbar}>
            <View style={s.navLeft}>
              <View style={s.navLogoBox}>
                <Image source={LOGO} style={s.navLogoImg} resizeMode="contain" />
              </View>
              <View>
                <Text style={s.navBrand}>People's Health Care</Text>
                <Text style={s.navSub}>MEDICAL CENTRE</Text>
              </View>
            </View>
            <TouchableOpacity style={s.loginBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
              <Text style={s.loginBtnText}>Login</Text>
            </TouchableOpacity>
          </View>

          {/* Clinic status badge */}
          <View style={[s.statusBadge, { marginHorizontal: 20, marginBottom: 20 }]}>
            <View style={[s.statusDot, { backgroundColor: clinicStatus.open ? '#4ADE80' : '#FB923C' }]} />
            <Text style={s.statusText}>{clinicStatus.label}</Text>
          </View>

          {/* Hero text */}
          <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
            <Text style={s.heroTitle}>Your Health, Our{'\n'}<Text style={{ color: '#7DD3FC' }}>Sacred Commitment</Text></Text>
            <Text style={s.heroSub}>Delivering compassionate, comprehensive healthcare with a personal touch. Trusted medical care for your entire family.</Text>

            <View style={s.heroBtns}>
              <TouchableOpacity style={s.btnBook} onPress={() => navigation.navigate('Register')} activeOpacity={0.85}>
                <Text style={s.btnBookText}>📅 Book Appointment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnCall} onPress={() => Linking.openURL(`tel:${doctorPhone.replace(/\s/g, '')}`)} activeOpacity={0.85}>
                <Text style={s.btnCallText}>📞 Call</Text>
              </TouchableOpacity>
            </View>

            <View style={s.infoPills}>
              {['Mon–Sat: 7AM–8AM | 5PM–8PM', 'Emergency: 24/7'].map(item => (
                <View key={item} style={s.infoPill}>
                  <View style={s.pillDot} />
                  <Text style={s.pillText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Stats card — with logo like web */}
          <View style={[s.statsCard, { marginHorizontal: 20, marginBottom: 32 }]}>
            <View style={s.statsGrid}>
              {STATS.map(stat => (
                <View key={stat.label} style={s.statItem}>
                  <Text style={s.statNum}>{stat.number}</Text>
                  <Text style={s.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
            {/* Logo row inside card — matching web */}
            <View style={s.statsLogoRow}>
              <View style={s.statsLogoBox}>
                <Image source={LOGO} style={s.statsLogoImg} resizeMode="contain" />
              </View>
              <View>
                <Text style={s.statsLogoBrand}>People's Health Care</Text>
                <Text style={s.statsLogoAddress}>No 123 Matara - Akuressa Hwy, Matara</Text>
              </View>
            </View>
            {/* Status chip */}
            <View style={[s.statsStatusChip, { backgroundColor: clinicStatus.open ? '#4ADE80' : '#FB923C' }]}>
              <View style={[s.statsStatusDot, { backgroundColor: clinicStatus.open ? '#166534' : '#92400E' }]} />
              <Text style={[s.statsStatusText, { color: clinicStatus.open ? '#166534' : '#92400E' }]}>{clinicStatus.label}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── WHY CHOOSE US ── */}
        <View style={s.section}>
          <Text style={s.tag}>Why Choose Us</Text>
          <Text style={s.sectionTitle}>Healthcare Built on Trust & Excellence</Text>
          <View style={s.accentBar} />
          {WHY_US.map(item => (
            <View key={item.title} style={s.whyCard}>
              <Text style={s.whyEmoji}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.whyTitle}>{item.title}</Text>
                <Text style={s.whyDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── SERVICES ── */}
        <View style={[s.section, { backgroundColor: '#F0F7FF' }]}>
          <Text style={s.tag}>Our Services</Text>
          <Text style={s.sectionTitle}>Comprehensive Medical Services</Text>
          <View style={s.accentBar} />
          {SERVICES.map(svc => (
            <View key={svc.title} style={s.svcCard}>
              <View style={[s.svcIconBox, { backgroundColor: svc.bg }]}>
                <Text style={{ fontSize: 24 }}>{svc.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.svcTitle}>{svc.title}</Text>
                <Text style={s.svcDesc}>{svc.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── DOCTOR ── */}
        <View style={s.section}>
          <Text style={s.tag}>Our Doctor</Text>
          <Text style={s.sectionTitle}>Meet Our Physician</Text>
          <View style={s.accentBar} />
          <View style={s.doctorCard}>
            <View style={s.doctorAvatar}><Text style={{ fontSize: 44 }}>👨‍⚕️</Text></View>
            <Text style={s.doctorName}>{doctorName}</Text>
            <Text style={s.doctorRole}>Founder & Chief Physician</Text>
            <Text style={s.doctorSub}>People's Health Care, Matara</Text>
            <View style={s.doctorStats}>
              {[{ n: `${doctorExp}+`, l: 'Years' }, { n: '5K+', l: 'Patients' }, { n: '98%', l: 'Satisfaction' }].map(st => (
                <View key={st.l} style={s.dStat}>
                  <Text style={s.dStatN}>{st.n}</Text>
                  <Text style={s.dStatL}>{st.l}</Text>
                </View>
              ))}
            </View>
            {['General Medicine', 'Preventive Healthcare', 'Chronic Disease Management', 'Family Health'].map(sp => (
              <Text key={sp} style={s.specialty}>• {sp}</Text>
            ))}
            <TouchableOpacity style={s.callCard} onPress={() => Linking.openURL(`tel:${doctorPhone.replace(/\s/g, '')}`)} activeOpacity={0.8}>
              <Text style={{ fontSize: 16 }}>📞</Text>
              <Text style={s.callText}>{doctorPhone}</Text>
            </TouchableOpacity>
          </View>

          {/* About text */}
          <Text style={s.aboutText}>People's Health Care is a patient-first medical centre established in Matara, dedicated to delivering comprehensive, high-quality medical services to the community of Southern Sri Lanka.</Text>
          <Text style={[s.aboutText, { marginTop: 10 }]}>Under the personal guidance of Dr. M.T.D. Jayaweera, our centre integrates primary care, pharmaceutical services, and advanced diagnostic testing — all seamlessly coordinated under one roof.</Text>
          {[
            { label: 'Hours',    value: 'Mon–Sat: 7AM–8AM | 5PM–8PM' },
            { label: 'Location', value: 'No 123 Matara - Akuressa Hwy, Matara' },
            { label: 'Contact',  value: 'thilakjayaweera9@gmail.com' },
          ].map(item => (
            <View key={item.label} style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#00ACC1', marginTop: 5 }} />
              <Text style={{ color: '#374151', fontSize: 13, flex: 1 }}>
                <Text style={{ fontWeight: '600' }}>{item.label}: </Text>{item.value}
              </Text>
            </View>
          ))}
        </View>

        {/* ── TESTIMONIALS ── */}
        {testimonials.length > 0 && (
          <View style={[s.section, { backgroundColor: '#F8FAFC' }]}>
            <Text style={s.tag}>Patient Stories</Text>
            <Text style={s.sectionTitle}>What Our Patients Say</Text>
            <View style={s.accentBar} />
            {testimonials.slice(0, 5).map((fb, i) => (
              <View key={fb._id || i} style={[s.tCard, { borderTopColor: fb.rating === 5 ? '#1565C0' : fb.rating >= 4 ? '#10B981' : '#F59E0B' }]}>
                <View style={{ flexDirection: 'row', gap: 2, marginBottom: 8 }}>
                  {[1,2,3,4,5].map(st => <Text key={st} style={{ fontSize: 14, color: st <= fb.rating ? '#F59E0B' : '#E5E7EB' }}>★</Text>)}
                  <Text style={{ color: '#D97706', fontSize: 12, marginLeft: 4, fontWeight: '600' }}>{fb.rating}.0</Text>
                </View>
                <Text style={{ color: '#4B5563', fontSize: 13, lineHeight: 20, fontStyle: 'italic' }}>"{fb.description}"</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── CONTACT / SLIDESHOW ── */}
        <LinearGradient
          colors={['#0D2137', '#1565C0', '#00ACC1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.section]}
        >
          <Text style={[s.tag, { color: '#7DD3FC' }]}>Get In Touch</Text>
          <Text style={[s.sectionTitle, { color: '#fff' }]}>Book Your Appointment Today</Text>
          <View style={{ marginTop: 16, gap: 14 }}>
            {[
              { icon: '📍', label: 'Address', value: 'No 123 Matara - Akuressa Hwy, Matara' },
              { icon: '📞', label: 'Phone',   value: doctorPhone },
              { icon: '📧', label: 'Email',   value: 'thilakjayaweera9@gmail.com' },
              { icon: '🕐', label: 'Hours',   value: 'Mon–Sat: 7AM–8AM | 5PM–8PM' },
            ].map(item => (
              <View key={item.label} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{item.label}</Text>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500', marginTop: 2 }}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ marginTop: 28 }}>
            <Text style={[s.tag, { color: '#7DD3FC', marginBottom: 16 }]}>Why Join Us</Text>
            <Slideshow onRegister={() => navigation.navigate('Register')} onLogin={() => navigation.navigate('Login')} />
          </View>
        </LinearGradient>

        {/* ── FOOTER ── */}
        <LinearGradient
          colors={['#00ACC1', '#1565C0', '#0D2137']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.footer}
        >
          {/* Logo row — properly aligned */}
          <View style={s.footerLogoRow}>
            <View style={s.footerLogoBox}>
              <Image source={LOGO} style={s.footerLogoImg} resizeMode="contain" />
            </View>
            <View>
              <Text style={s.footerBrand}>People's Health Care</Text>
              <Text style={s.footerBrandSub}>Medical Centre, Matara</Text>
            </View>
          </View>
          <Text style={s.footerSub}>Providing compassionate, integrated healthcare services to the community of Matara and beyond.</Text>
          <View style={s.footerDivider} />
          <Text style={s.footerCopy}>© {new Date().getFullYear()} People's Health Care. All rights reserved.</Text>
        </LinearGradient>

      </ScrollView>
      <ChatBot />
    </View>
  );
}

const s = StyleSheet.create({
  // Hero
  hero: { overflow: 'hidden', paddingTop: 0, paddingBottom: 0 },
  blob1: { position: 'absolute', top: '20%', right: 10, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(0,172,193,0.1)' },
  blob2: { position: 'absolute', bottom: 0, left: 20, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)' },
  navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 20 },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navLogoBox: { width: 40, height: 40, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.15)' },
  navLogoImg: { width: 40, height: 40 },
  navBrand: { color: '#fff', fontWeight: '700', fontSize: 15 },
  navSub: { color: 'rgba(255,255,255,0.6)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginTop: 1 },
  loginBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  loginBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, alignSelf: 'flex-start' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '500' },
  heroTitle: { fontSize: 30, fontWeight: '800', color: '#fff', lineHeight: 38, marginBottom: 14 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 22, marginBottom: 24 },
  heroBtns: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  btnBook: { flex: 1, backgroundColor: '#00ACC1', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnBookText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnCall: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center' },
  btnCallText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  infoPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#67E8F9' },
  pillText: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },

  // Stats card
  statsCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', overflow: 'visible' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statItem: { flex: 1, minWidth: '44%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  statNum: { color: '#7DD3FC', fontWeight: '900', fontSize: 22 },
  statLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2, textAlign: 'center' },
  statsLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statsLogoBox: { width: 40, height: 40, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.15)' },
  statsLogoImg: { width: 40, height: 40 },
  statsLogoBrand: { color: '#fff', fontWeight: '600', fontSize: 13 },
  statsLogoAddress: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 1 },
  statsStatusChip: { position: 'absolute', top: -10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statsStatusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statsStatusText: { fontSize: 11, fontWeight: '700' },

  // Sections
  section: { padding: 24, backgroundColor: '#fff' },
  tag: { fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: '#00ACC1', marginBottom: 6 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#0D2137', lineHeight: 30 },
  accentBar: { width: 48, height: 3, backgroundColor: '#1565C0', borderRadius: 2, marginTop: 10, marginBottom: 20 },

  // Why us
  whyCard: { flexDirection: 'row', gap: 14, backgroundColor: '#FAFBFF', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  whyEmoji: { fontSize: 26, marginTop: 2 },
  whyTitle: { fontSize: 14, fontWeight: '600', color: '#0D2137', marginBottom: 4 },
  whyDesc: { fontSize: 13, color: '#64748B', lineHeight: 20 },

  // Services
  svcCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  svcIconBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  svcTitle: { fontSize: 14, fontWeight: '600', color: '#0D2137', marginBottom: 4 },
  svcDesc: { fontSize: 13, color: '#64748B', lineHeight: 18 },

  // Doctor
  doctorCard: { backgroundColor: '#0D2137', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20 },
  doctorAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 14 },
  doctorName: { color: '#fff', fontWeight: '700', fontSize: 20 },
  doctorRole: { color: '#93C5FD', fontSize: 13, marginTop: 4 },
  doctorSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2, marginBottom: 16 },
  doctorStats: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  dStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, alignItems: 'center' },
  dStatN: { color: '#7DD3FC', fontWeight: '800', fontSize: 18 },
  dStatL: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  specialty: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 4, alignSelf: 'flex-start' },
  callCard: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  callText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  aboutText: { color: '#4B5563', fontSize: 14, lineHeight: 22 },

  // Testimonials
  tCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderTopWidth: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },

  // CTA
  bigCta: { backgroundColor: '#1565C0', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  bigCtaText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Footer
  footer: { padding: 24, paddingBottom: 40 },
  footerLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  footerLogoBox: { width: 42, height: 42, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.15)', padding: 4 },
  footerLogoImg: { width: 34, height: 34 },
  footerBrand: { color: '#fff', fontWeight: '700', fontSize: 15 },
  footerBrandSub: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 },
  footerSub: { color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 20, marginBottom: 16 },
  footerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 16 },
  footerCopy: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center' },
});

// Slideshow styles
const sl = StyleSheet.create({
  card: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', minHeight: 200, overflow: 'hidden' },
  inner: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  emoji: { fontSize: 40, flexShrink: 0, marginTop: 4 },
  title: { color: '#fff', fontWeight: '700', fontSize: 15, lineHeight: 22 },
  desc:  { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 6, lineHeight: 20 },
  cta:   { marginTop: 14, backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start' },
  ctaText: { color: '#0D2137', fontWeight: '700', fontSize: 13 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 },
  arrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: '#fff', fontSize: 20 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { width: 24, backgroundColor: '#fff' },
  loginLink: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginTop: 10 },
});

// Chatbot styles
const cb = StyleSheet.create({
  fab: { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center', shadowColor: '#1565C0', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', overflow: 'hidden' },
  header: { backgroundColor: '#0D2137', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  closeBtn: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 8, borderRadius: 8 },
  messages: { maxHeight: 340, backgroundColor: '#FAFBFD' },
  bubble: { maxWidth: '78%', padding: 10, borderRadius: 16 },
  bubbleUser: { backgroundColor: '#1565C0' },
  bubbleBot: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  quickReplies: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingBottom: 8, backgroundColor: '#FAFBFD' },
  quickBtn: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#fff' },
  quickText: { color: '#1565C0', fontSize: 11, fontWeight: '500' },
  inputRow: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', alignItems: 'flex-end' },
  input: { flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#0F172A', maxHeight: 80 },
  sendBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});