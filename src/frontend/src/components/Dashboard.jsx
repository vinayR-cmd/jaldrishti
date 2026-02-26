import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Droplets, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';

const SOCKET_URL = 'http://localhost:3001';

const getWaterQualityInfo = (tds) => {
    if (tds < 50) return { label: 'Excellent', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: CheckCircle2 };
    if (tds < 150) return { label: 'Good', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle2 };
    if (tds < 300) return { label: 'Fair', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Activity };
    if (tds < 500) return { label: 'Poor', color: 'text-orange-400', bg: 'bg-orange-400/10', icon: AlertTriangle };
    return { label: 'Unacceptable', color: 'text-red-400', bg: 'bg-red-400/10', icon: AlertTriangle };
};

const Dashboard = () => {
    const [currentTds, setCurrentTds] = useState(0);
    const [history, setHistory] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Connect to the Node.js backend
        const socket = io(SOCKET_URL);

        socket.on('connect', () => {
            setIsConnected(true);
            console.log('Connected to WebSocket');
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
            console.log('Disconnected from WebSocket');
        });

        socket.on('tdsUpdate', (data) => {
            console.log('Received TDS update:', data);
            setCurrentTds(data.tds);

            const now = new Date();
            const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

            setHistory(prev => {
                const newHistory = [...prev, { time: timeStr, tds: data.tds }];
                // Keep only last 20 data points for the chart
                if (newHistory.length > 20) return newHistory.slice(newHistory.length - 20);
                return newHistory;
            });
        });

        return () => socket.disconnect();
    }, []);

    const qualityInfo = getWaterQualityInfo(currentTds);
    const StatusIcon = qualityInfo.icon;

    return (
        <div className="w-full max-w-4xl bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
            {/* Header */}
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                        Water Quality Monitor
                    </h1>
                    <p className="text-slate-400 mt-2 flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></span>
                        {isConnected ? 'Connected to Sensor' : 'Disconnected'}
                    </p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-2xl flex items-center justify-center">
                    <Droplets className="w-10 h-10 text-cyan-400" />
                </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Current Value Card */}
                <div className="col-span-1 bg-slate-800/40 rounded-3xl p-6 border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2 z-10">Current TDS</p>
                    <div className="flex items-baseline gap-2 z-10">
                        <span className="text-6xl font-black text-white">{currentTds.toFixed(1)}</span>
                        <span className="text-xl text-slate-500 font-bold">ppm</span>
                    </div>
                </div>

                {/* Status Card */}
                <div className={`col-span-1 md:col-span-2 rounded-3xl p-6 border border-slate-700/50 flex items-center ${qualityInfo.bg} transition-colors duration-500 relative overflow-hidden`}>
                    <div className={`p-4 rounded-2xl bg-slate-900/50 mr-6 ${qualityInfo.color}`}>
                        <StatusIcon className="w-12 h-12" />
                    </div>
                    <div>
                        <p className="text-slate-300 text-sm font-medium uppercase tracking-wider mb-1">Water Status</p>
                        <h2 className={`text-4xl font-bold ${qualityInfo.color}`}>{qualityInfo.label}</h2>
                    </div>
                </div>

                {/* Chart Card */}
                <div className="col-span-1 md:col-span-3 bg-slate-800/40 rounded-3xl p-6 border border-slate-700/50">
                    <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-cyan-500" />
                        Live TDS Readings
                    </h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis
                                    dataKey="time"
                                    stroke="#94a3b8"
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', color: '#f8fafc' }}
                                    itemStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="tds"
                                    stroke="#22d3ee"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#0f172a', stroke: '#22d3ee', strokeWidth: 2 }}
                                    activeDot={{ r: 6, fill: '#22d3ee', stroke: '#0f172a', strokeWidth: 2 }}
                                    animationDuration={300}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
