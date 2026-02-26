import React, { useState, useEffect } from 'react';
import {
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Map as MapIcon,
  Activity,
  MessageSquare,
  ShieldAlert,
  RefreshCw,
  Navigation,
  Home,
  MapPin,
  Info,
  Zap,
  Bell,
  X,
  ArrowRight,
  ShieldCheck,
  Users,
  Globe,
  LogIn,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeWaterQuality, WaterAnalysis } from './services/geminiService';
import { SensorData, CommunityReport } from './types';
import 'leaflet/dist/leaflet.css';
import MapView from './MapView';
import { waterData } from './data';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'heatmap' | 'reports'>('dashboard');
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [analysis, setAnalysis] = useState<WaterAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReporting, setIsReporting] = useState(false);
  const [newReport, setNewReport] = useState({ issue_type: 'Taste', description: '' });
  const [notification, setNotification] = useState<{ message: string, type: 'warning' | 'info' } | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showCriticalModal, setShowCriticalModal] = useState(false);
  const [graphData, setGraphData] = useState<any[]>([]);

  // Calculate distance between coords in km
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const p = 0.017453292519943295; // Math.PI / 180
    const c = Math.cos;
    const a = 0.5 - c((lat2 - lat1) * p) / 2 +
      c(lat1 * p) * c(lat2 * p) *
      (1 - c((lon2 - lon1) * p)) / 2;
    return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
  };

  // Smooth data linearly via moving average
  const smoothData = (data: any[], windowSize = 5) => {
    let result = [];
    for (let i = 0; i < data.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
        sum += data[j].tds;
        count++;
      }
      result.push({
        ...data[i],
        smoothed_tds: Math.round(sum / count),
        timeLabel: new Date(data[i].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
    return result;
  };

  // Dummy Heatmap Data
  const heatmapData = Array.from({ length: 24 }).map((_, i) => {
    const tds = Math.floor(Math.random() * 800) + 100;
    let status: 'safe' | 'risk' | 'warning' | 'unsafe' = 'safe';
    if (tds > 500) status = 'unsafe';
    else if (tds > 300) status = 'warning';
    else if (tds > 150) status = 'risk';

    return {
      id: i,
      name: `Sector ${i + 1}`,
      status,
      tds
    };
  });

  const fetchData = async (localPoints: any[] = null) => {
    setLoading(true);
    try {
      const sourcePoints = localPoints || waterData.slice(0, 10);
      const sData = sourcePoints.map(d => ({ tds_value: d.tds, lat: d.lat, lng: d.lng }));

      let rData = [];
      try {
        const rRes = await fetch('/api/reports');
        rData = await rRes.json();
      } catch (e) {
        // Ignore reports error if no backend
      }

      setSensorData(sData as any);
      setReports(rData);

      if (sData.length > 0) {
        try {
          const areaResult = await analyzeWaterQuality(sData[0].tds_value, rData);
          setAnalysis(areaResult);

          if (areaResult.score === 'Unsafe' || areaResult.score === 'Risk') {
            // Only set critical early notifications if there isn't already a notification
            setNotification(prev => prev || {
              message: `Area Scan: ${areaResult.score} water detected locally.`,
              type: 'warning'
            });
            if (areaResult.score === 'Unsafe') {
              setShowCriticalModal(true);
            }
          }
        } catch (分析error) {
          console.error("Analysis generation failed");
        }
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  const initializeLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const sorted = [...waterData].sort((a, b) => getDistance(latitude, longitude, a.lat, a.lng) - getDistance(latitude, longitude, b.lat, b.lng));
          // Take nearest 50 points and sort them chronologically
          const nearestRegionTokens = sorted.slice(0, 50).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          setGraphData(smoothData(nearestRegionTokens));
          fetchData(nearestRegionTokens);
        },
        () => {
          // Fallback if denied
          const fallbackRegion = [...waterData].slice(0, 50).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          setGraphData(smoothData(fallbackRegion));
          fetchData(fallbackRegion);
        }
      );
    } else {
      const fallbackRegion = [...waterData].slice(0, 50).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setGraphData(smoothData(fallbackRegion));
      fetchData(fallbackRegion);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      initializeLocation();
      const interval = setInterval(() => { fetchData(graphData) }, 30000);

      // 1 minute timeout notification for nearby contamination area
      const contaminationTimeout = setTimeout(() => {
        setNotification({
          message: "Alert: A high contamination area has been identified near your active sector.",
          type: 'warning'
        });
        setShowAlerts(true);
      }, 60000);

      return () => {
        clearInterval(interval);
        clearTimeout(contaminationTimeout);
      };
    }
  }, [isLoggedIn]);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newReport, lat: 0, lng: 0 })
      });
      setIsReporting(false);
      fetchData();
    } catch (error) {
      console.error("Report failed");
    }
  };

  const simulateSensor = async () => {
    const randomTDS = Math.floor(Math.random() * 1000);
    try {
      await fetch('/api/water-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tds: randomTDS, lat: 0, lng: 0 })
      });
      fetchData();
    } catch (error) {
      console.error("Simulation failed");
    }
  };

  const getStatusInfo = (tds: number) => {
    if (tds <= 150) return { color: 'text-safe', bg: 'bg-safe/10', border: 'border-safe/20', glow: 'bg-safe', label: 'Safe' };
    if (tds <= 300) return { color: 'text-risk', bg: 'bg-risk/10', border: 'border-risk/20', glow: 'bg-risk', label: 'Moderate' };
    if (tds <= 500) return { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', glow: 'bg-warning', label: 'High Risk' };
    return { color: 'text-unsafe', bg: 'bg-unsafe/10', border: 'border-unsafe/20', glow: 'bg-unsafe', label: 'Unsafe' };
  };

  const currentTDS = sensorData[0]?.tds_value || 0;
  const statusInfo = getStatusInfo(currentTDS);
  const houseTDS = Math.max(50, currentTDS - 100);
  const houseStatus = getStatusInfo(houseTDS);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-bg text-ink selection:bg-accent selection:text-black overflow-x-hidden relative">
        <div className="hero-gradient fixed inset-0 pointer-events-none" />

        {/* Landing Header */}
        <nav className="relative z-50 flex justify-between items-center p-6 md:p-10 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(0,255,204,0.3)]">
              <Droplets className="text-black w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase">Jal-Drishti</span>
          </motion.div>
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setIsLoggedIn(true)}
            className="btn-primary !py-2.5 !px-6 !text-[10px]"
          >
            Log In/Sign Up
          </motion.button>
        </nav>

        {/* Hero Section */}
        <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-10 md:pt-20 pb-32">
          <div className="flex flex-col items-center text-center mb-20 md:mb-32">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-accent text-[10px] font-black uppercase tracking-[0.3em] mb-8"
            >
              <Globe className="w-3 h-3" />
              Water Intelligence Redefined
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
              className="text-[12vw] md:text-[8vw] font-black tracking-tighter leading-[0.85] uppercase mb-10"
            >
              Pure Water <br />
              <span className="text-accent">Pure Life.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/50 text-base md:text-xl max-w-2xl leading-relaxed mb-12"
            >
              Jal-Drishti is an AI-powered ecosystem that provides real-time water safety analysis, converting complex data into clear, life-saving actions.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <button onClick={() => setIsLoggedIn(true)} className="btn-primary group">
                Enter Dashboard <ArrowRight className="inline-block ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="btn-secondary">Explore Impact</button>
            </motion.div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 mb-24 md:mb-40">
            {[
              {
                icon: ShieldCheck,
                title: "Real-time Safety",
                desc: "Hyperlocal sensors provide instant TDS readings and safety scores for your exact location.",
                color: "text-safe",
                bg: "bg-safe/10"
              },
              {
                icon: MapIcon,
                title: "Live Heatmap",
                desc: "Visualize water contamination trends across your city with our interactive, data-driven map.",
                color: "text-accent",
                bg: "bg-accent/10"
              },
              {
                icon: Zap,
                title: "AI Guidance",
                desc: "Gemini AI analyzes data to provide personalized health advice and improvement tips.",
                color: "text-risk",
                bg: "bg-risk/10"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30, rotateX: 20 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
                whileHover={{ rotateY: 10, rotateX: -5, scale: 1.02, translateZ: 20 }}
                className="glass-card group"
              >
                <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-4">{feature.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Societal Impact Section */}
          <div className="relative">
            <div className="absolute inset-0 bg-accent/5 blur-[120px] rounded-full -z-10" />
            <motion.div
              initial={{ opacity: 0, y: 50, rotateX: 15 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="glass-card p-10 md:p-20 text-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="max-w-3xl mx-auto"
              >
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-8">Empowering Communities, <br /><span className="text-accent">Saving Lives.</span></h2>
                <p className="text-white/60 text-base md:text-lg leading-relaxed mb-12">
                  Water contamination is a silent crisis affecting millions. Jal-Drishti bridges the information gap by providing accessible, real-time data to every citizen. By democratizing water intelligence, we reduce waterborne diseases, improve public health outcomes, and foster a more resilient society.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {[
                    { label: "Health Risk Reduced", value: "40%" },
                    { label: "Community Reports", value: "10k+" },
                    { label: "Active Sensors", value: "500+" },
                    { label: "Lives Impacted", value: "1M+" }
                  ].map((stat, i) => (
                    <div key={i}>
                      <span className="block text-2xl md:text-4xl font-black text-accent mb-1">{stat.value}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-bg selection:bg-accent selection:text-black pb-32 md:pb-8">
      <div className="map-bg" />
      <div className="map-overlay" />

      <div className="p-4 md:p-8 max-w-7xl mx-auto relative z-10">
        {/* Header - Sticky for better navigation */}
        <header className="sticky top-0 z-50 flex justify-between items-center mb-8 md:mb-12 bg-bg/60 backdrop-blur-xl py-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-white/5">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-accent rounded-xl md:rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,255,204,0.3)]">
              <Droplets className="text-black w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase leading-none">JAL-DRISHTI</h1>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                  <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                  <span className="text-[8px] font-black text-accent uppercase tracking-widest">Live</span>
                </div>
              </div>
              <p className="text-white/40 text-[8px] md:text-[10px] font-mono mt-1 uppercase tracking-[0.2em]">Hyperlocal Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={simulateSensor}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-wider hover:bg-accent/20 transition-all active:scale-95"
            >
              <Activity className="w-4 h-4" />
              Simulate
            </button>

            <div className="relative">
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all relative ${notification ? 'border-unsafe/40' : ''}`}
              >
                <Bell className={`w-5 h-5 ${notification ? 'text-unsafe animate-pulse' : 'text-white/60'}`} />
                {notification && <div className="notification-badge">1</div>}
              </button>

              <AnimatePresence>
                {showAlerts && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-[-60px] md:right-0 mt-4 w-[280px] md:w-80 glass-card p-6 z-[100] border-white/10"
                  >
                    <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Notifications</h4>
                    {notification ? (
                      <div className="p-4 rounded-xl bg-unsafe/10 border border-unsafe/20">
                        <p className="text-sm font-bold text-unsafe leading-tight">{notification.message}</p>
                        <button
                          onClick={() => setNotification(null)}
                          className="mt-3 text-[10px] font-black uppercase text-unsafe/60 hover:text-unsafe"
                        >
                          Dismiss Alert
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-white/30 italic">No new alerts.</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setIsLoggedIn(false)}
              className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/60"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile Navigation */}
        <div className="mobile-nav">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Home</span>
          </button>
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`mobile-nav-item ${activeTab === 'heatmap' ? 'active' : ''}`}
          >
            <MapIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Heatmap</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`mobile-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
          >
            <MessageSquare className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Feed</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="space-y-8">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Removed the fixed overlay Warning Banner entirely to avoid mobile overlap */}

              {/* Main Display Card */}
              <motion.div
                initial={{ opacity: 0, y: 20, rotateY: -10 }}
                animate={{ opacity: 1, y: 0, rotateY: 0 }}
                whileHover={{ rotateY: 2, rotateX: -2 }}
                className="lg:col-span-8 space-y-8"
              >
                <div className={`glass-card group ${statusInfo.border} p-6 md:p-12 relative overflow-hidden`}>
                  {/* Scanning Line Animation */}
                  <motion.div
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-[1px] bg-accent/30 z-0 pointer-events-none"
                  />

                  <div className="flex flex-col md:flex-row gap-10 md:gap-16 justify-between relative z-10">
                    <div className="space-y-8 md:space-y-10 text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-3 text-white/40 font-mono text-[8px] md:text-[10px] uppercase tracking-[0.4em]">
                        <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                        Active Monitoring • Sector 04
                      </div>
                      <div>
                        <div className="flex items-baseline justify-center md:justify-start gap-3 md:gap-6">
                          <motion.h2
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className={`text-8xl md:text-[12rem] font-black tracking-tighter leading-[0.8] ${statusInfo.color}`}
                          >
                            {currentTDS}
                          </motion.h2>
                          <div className="flex flex-col">
                            <span className="text-xl md:text-3xl font-black text-white/20 uppercase tracking-widest">PPM</span>
                            <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest">Total Dissolved Solids</span>
                          </div>
                        </div>
                        <div className={`inline-flex items-center gap-3 mt-6 md:mt-10 px-6 md:px-8 py-2 md:py-3 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.3em] ${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border} shadow-2xl`}>
                          <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full animate-pulse ${statusInfo.glow}`} />
                          {statusInfo.label}
                        </div>
                      </div>
                      <p className="text-lg md:text-2xl font-medium text-white/70 max-w-xl leading-relaxed italic">
                        "{analysis?.explanation || 'Analyzing water quality parameters...'}"
                      </p>
                    </div>

                    <div className="flex flex-col gap-4 md:gap-6 justify-center">
                      <motion.div
                        whileHover={{ translateZ: 30, scale: 1.02 }}
                        className={`z-40 p-5 md:p-6 rounded-3xl bg-card/80 backdrop-blur-2xl border ${houseStatus.border} hover:border-white/10 transition-all flex items-center gap-4 md:gap-6 group/item shadow-2xl`}
                      >
                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl ${houseStatus.bg} ${houseStatus.color} flex items-center justify-center group-hover/item:scale-110 transition-transform`}>
                          <Home className="w-6 h-6 md:w-8 h-8" />
                        </div>
                        <div>
                          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1">House Quality</span>
                          <span className={`text-2xl md:text-4xl font-black tracking-tighter ${houseStatus.color}`}>{houseTDS} <span className="text-xs md:text-sm text-white/20 font-medium ml-1">PPM</span></span>
                        </div>
                      </motion.div>
                      <motion.div
                        whileHover={{ translateZ: 20, scale: 1.02 }}
                        className={`p-5 md:p-6 rounded-3xl bg-white/5 border ${statusInfo.border} hover:border-white/10 transition-all flex items-center gap-4 md:gap-6 group/item`}
                      >
                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl ${statusInfo.bg} ${statusInfo.color} flex items-center justify-center group-hover/item:scale-110 transition-transform`}>
                          <MapIcon className="w-6 h-6 md:w-8 h-8" />
                        </div>
                        <div>
                          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1">Area Average</span>
                          <span className={`text-2xl md:text-4xl font-black tracking-tighter ${statusInfo.color}`}>{currentTDS} <span className="text-xs md:text-sm text-white/20 font-medium ml-1">PPM</span></span>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Mini Heatmap Preview */}
                  <div className="mt-8 p-6 rounded-3xl bg-white/5 border border-white/5 overflow-hidden group/heatmap cursor-pointer" onClick={() => setActiveTab('heatmap')}>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                        <Globe className="w-3 h-3 text-accent" />
                        Regional Risk Map
                      </h4>
                      <span className="text-[8px] font-black text-accent uppercase tracking-widest group-hover:underline">Click Map Marker for details</span>
                    </div>
                    <div className="relative h-48 md:h-64 rounded-xl border border-white/5 overflow-hidden pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                      <MapView height="100%" analysis={analysis} />
                    </div>
                  </div>

                  {/* Dynamic Water Timeline Graph */}
                  <div className="mt-8 p-6 md:p-8 rounded-3xl bg-white/5 border border-white/5">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-accent" />
                      Local Water Quality Timeline
                    </h3>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={graphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis
                            dataKey="timeLabel"
                            stroke="rgba(255,255,255,0.2)"
                            fontSize={10}
                            tickMargin={10}
                            minTickGap={30}
                          />
                          <YAxis
                            stroke="rgba(255,255,255,0.2)"
                            fontSize={10}
                            tickFormatter={(val) => `${val}`}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(0,21,41,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', backdropFilter: 'blur(10px)', fontSize: '12px' }}
                            itemStyle={{ color: '#0ea5e9', fontWeight: 'bold' }}
                            labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}
                          />
                          {/* Linear type to keep purely straight lines */}
                          <Line
                            type="linear"
                            dataKey="smoothed_tds"
                            name="TDS Level (PPM)"
                            stroke="#0ea5e9"
                            strokeWidth={3}
                            dot={false}
                            animationDuration={1500}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Analysis Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20, rotateY: 10 }}
                    animate={{ opacity: 1, y: 0, rotateY: 0 }}
                    transition={{ delay: 0.1 }}
                    whileHover={{ rotateY: -5, translateZ: 20 }}
                    className="glass-card p-6 md:p-8"
                  >
                    <h3 className="text-base md:text-lg font-black uppercase tracking-widest mb-6 md:mb-8 flex items-center gap-4 text-unsafe">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-unsafe/10 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 md:w-5 h-5" />
                      </div>
                      Side Effects
                    </h3>
                    <ul className="space-y-4 md:space-y-6">
                      {analysis?.side_effects.map((effect, i) => (
                        <li key={i} className="flex items-start gap-3 md:gap-4 text-white/60 group/li">
                          <div className="w-1.5 h-1.5 rounded-full bg-unsafe mt-2 shrink-0 group-hover/li:scale-150 transition-transform" />
                          <span className="text-xs md:text-sm leading-relaxed">{effect}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20, rotateY: -10 }}
                    animate={{ opacity: 1, y: 0, rotateY: 0 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ rotateY: 5, translateZ: 20 }}
                    className="glass-card p-6 md:p-8"
                  >
                    <h3 className="text-base md:text-lg font-black uppercase tracking-widest mb-6 md:mb-8 flex items-center gap-4 text-safe">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-safe/10 flex items-center justify-center">
                        <Zap className="w-4 h-4 md:w-5 h-5" />
                      </div>
                      Improvement Tips
                    </h3>
                    <ul className="space-y-4 md:space-y-6">
                      {analysis?.improvement_tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-3 md:gap-4 text-white/60 group/li">
                          <div className="w-1.5 h-1.5 rounded-full bg-safe mt-2 shrink-0 group-hover/li:scale-150 transition-transform" />
                          <span className="text-xs md:text-sm leading-relaxed">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </div>
              </motion.div>

              {/* Sidebar - Hidden on mobile, shown on desktop */}
              <div className="hidden lg:block lg:col-span-4 space-y-8">
                <motion.div
                  initial={{ opacity: 0, x: 20, rotateY: 10 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0 }}
                  whileHover={{ rotateY: -5, translateZ: 20 }}
                  className="glass-card"
                >
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="font-black uppercase tracking-widest text-xs flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-accent" />
                      Community
                    </h3>
                    <button
                      onClick={() => setIsReporting(true)}
                      className="text-[10px] font-black text-accent hover:underline uppercase tracking-widest"
                    >
                      Report
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {reports.length === 0 ? (
                      <p className="text-white/20 text-xs italic">No reports found.</p>
                    ) : (
                      reports.map((report) => (
                        <div key={report.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black text-accent uppercase tracking-widest">{report.issue_type}</span>
                            <span className="text-[9px] text-white/20 font-mono">{new Date(report.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-sm text-white/50 leading-relaxed">{report.description}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20, rotateY: 10 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0 }}
                  transition={{ delay: 0.1 }}
                  whileHover={{ rotateY: -5, translateZ: 20 }}
                  className="glass-card bg-accent/5 border-accent/10"
                >
                  <h3 className="font-black uppercase tracking-widest text-xs flex items-center gap-3 mb-8">
                    <Navigation className="w-5 h-5 text-accent" />
                    Network
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 rounded-2xl bg-black/40 border border-white/5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/20 block mb-2">Sensors</span>
                      <span className="text-3xl font-black">12</span>
                    </div>
                    <div className="p-6 rounded-2xl bg-black/40 border border-white/5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/20 block mb-2">Risks</span>
                      <span className="text-3xl font-black text-risk">03</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {activeTab === 'heatmap' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, rotateX: 10 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              className="glass-card p-6 md:p-10"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/60 group"
                  >
                    <ArrowRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
                  </button>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase mb-1">Live Heatmap</h2>
                    <p className="text-white/40 text-[10px] font-mono uppercase tracking-[0.2em]">Real-time contamination insights</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-safe" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Safe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-risk" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-unsafe" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Unsafe</span>
                  </div>
                </div>
              </div>

              <div className="w-full relative z-10 mb-12">
                <MapView />
              </div>

              <div className="mt-12 p-8 rounded-[2rem] bg-white/5 border border-white/5">
                <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-accent" />
                  Heatmap Intelligence
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  Our heatmap uses a combination of real-time sensor data and community reports to predict contamination trends. Areas marked in <span className="text-unsafe font-bold">RED</span> are currently experiencing high contamination levels. We recommend avoiding open water sources in these sectors.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                  <MessageSquare className="w-6 h-6 text-accent" />
                  Community Feed
                </h3>
                <button
                  onClick={() => setIsReporting(true)}
                  className="btn-primary py-2 px-6 text-[10px]"
                >
                  Report Issue
                </button>
              </div>

              <div className="space-y-4">
                {reports.length === 0 ? (
                  <p className="text-white/20 text-sm italic py-20 text-center">No reports found in your area.</p>
                ) : (
                  reports.map((report) => (
                    <div key={report.id} className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-accent" />
                          </div>
                          <span className="text-xs font-black text-accent uppercase tracking-widest">{report.issue_type}</span>
                        </div>
                        <span className="text-[10px] text-white/20 font-mono">{new Date(report.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-base text-white/60 leading-relaxed">{report.description}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Critical Alert Modal */}
        <AnimatePresence>
          {showCriticalModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-unsafe/20 backdrop-blur-xl">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="glass-card w-full max-w-lg border-unsafe/30 text-center p-10 md:p-16"
              >
                <div className="w-24 h-24 rounded-3xl bg-unsafe/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(239,68,68,0.3)]">
                  <ShieldAlert className="text-unsafe w-12 h-12 animate-bounce" />
                </div>
                <h2 className="text-4xl font-black tracking-tighter uppercase text-unsafe mb-4">DANGER DETECTED</h2>
                <p className="text-white/60 text-lg leading-relaxed mb-10">
                  The water quality in your area has dropped to critical levels. Consumption may lead to serious health risks.
                </p>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 mb-10 text-left">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Immediate Action</h4>
                  <p className="text-xl font-bold text-white tracking-tight">DO NOT DRINK OPEN WATER. USE CERTIFIED FILTERS ONLY.</p>
                </div>
                <button
                  onClick={() => setShowCriticalModal(false)}
                  className="w-full py-5 rounded-2xl bg-unsafe text-white font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-105 transition-transform"
                >
                  I Understand the Risk
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Report Modal */}
        <AnimatePresence>
          {isReporting && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-card w-full max-w-md border-white/10"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black tracking-tighter uppercase">Report Issue</h2>
                  <button onClick={() => setIsReporting(false)} className="p-2 hover:bg-white/5 rounded-full">
                    <X className="w-6 h-6 text-white/30" />
                  </button>
                </div>
                <form onSubmit={handleReportSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Issue Type</label>
                    <select
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-accent transition-colors appearance-none"
                      value={newReport.issue_type}
                      onChange={(e) => setNewReport({ ...newReport, issue_type: e.target.value })}
                    >
                      <option value="Taste">Bad Taste</option>
                      <option value="Smell">Foul Smell</option>
                      <option value="Color">Discoloration</option>
                      <option value="Health">Health Issues Reported</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Description</label>
                    <textarea
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-accent h-32 transition-colors"
                      placeholder="Describe the issue in detail..."
                      value={newReport.description}
                      onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-5 rounded-2xl bg-accent text-black font-black uppercase tracking-widest text-xs shadow-[0_0_30px_rgba(0,255,204,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Submit Report
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-20 pt-10 border-t border-white/5 text-white/20 text-[9px] font-black uppercase tracking-[0.3em] flex flex-col md:flex-row justify-between items-center gap-6 pb-10">
          <p>© 2026 JAL-DRISHTI • PREVENTIVE WATER INTELLIGENCE</p>
          <div className="flex gap-8">
            <span className="hover:text-white transition-colors cursor-pointer">Hardware Specs</span>
            <span className="hover:text-white transition-colors cursor-pointer">API Docs</span>
            <span className="hover:text-white transition-colors cursor-pointer">Privacy</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
