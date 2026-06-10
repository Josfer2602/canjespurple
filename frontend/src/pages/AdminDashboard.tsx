import React, { useEffect, useState } from 'react';
import { 
  MapPin, Gift, TrendingUp, Clock, RefreshCw,
  Activity, Award, Users, Target, BarChart3, Calendar,
  ChevronDown, ArrowUpRight, ShoppingBag
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import api from '../utils/api';
import AdminLayout from '../layouts/AdminLayout';
import { MapContainer, TileLayer } from 'react-leaflet';
import GeoHeatmapLayer from '../components/GeoHeatmapLayer';
import 'leaflet/dist/leaflet.css';

const COLORS = ['#6b0096', '#00bcd4', '#5a0080', '#0097a7', '#4a0069'];

// ─── Date Filter Logic ───────────────────────────────────────────────────────

type QuickRange = 'today' | 'week' | 'month' | 'custom';

function getDateRange(range: QuickRange, customFrom?: string, customTo?: string) {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  if (range === 'today') {
    return { dateFrom: fmt(today), dateTo: fmt(today) };
  }
  if (range === 'week') {
    const from = new Date(today);
    from.setDate(today.getDate() - 6);
    return { dateFrom: fmt(from), dateTo: fmt(today) };
  }
  if (range === 'month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { dateFrom: fmt(from), dateTo: fmt(today) };
  }
  // custom
  return { dateFrom: customFrom || fmt(today), dateTo: customTo || fmt(today) };
}

// ─── Component ───────────────────────────────────────────────────────────────

const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // Filters
  const [quickRange, setQuickRange] = useState<QuickRange>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const [selectedMarket, setSelectedMarket] = useState('');
  const [selectedPoint, setSelectedPoint] = useState('');
  const [selectedUser, setSelectedUser] = useState('');

  const [marketsList, setMarketsList] = useState<any[]>([]);
  const [pointsList, setPointsList] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Data
  const [kpis, setKpis] = useState<any>({ 
    uniqueDnis: 0, 
    todayCount: 0, 
    conversionRate: 0, 
    topPoint: '—', 
    topPointCount: 0, 
    topPoints: [],
    todayRedemptions: 0,
    totalAmount: 0,
    avgTicket: 0,
    pendingStock: 0,
    topPointName: '—'
  });
  const [recentRedemptions, setRecentRedemptions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [breakdown, setBreakdown] = useState<any>({ topPoints: [], topRewards: [] });
  const [heatmap, setHeatmap] = useState<any>({ matrix: [], maxCount: 0 });
  const [geoHeatmap, setGeoHeatmap] = useState<any[]>([]);

  const project = JSON.parse(localStorage.getItem('project') || '{}');

  const isUnits = project.config?.redemption_unit === 'units';
  const unitPrefix = isUnits ? '' : 'S/ ';
  const unitSuffix = isUnits ? ' uds' : '';
  const formatValue = (val: number) => isUnits ? `${val.toLocaleString('es-PE')}${unitSuffix}` : `${unitPrefix}${val.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

  const buildParams = () => {
    const { dateFrom, dateTo } = getDateRange(quickRange, customFrom, customTo);
    const projectId = project.id;
    let base = projectId ? `projectId=${projectId}` : '';
    base += `&dateFrom=${dateFrom}&dateTo=${dateTo}`;
    if (selectedMarket) base += `&marketId=${selectedMarket}`;
    if (selectedPoint) base += `&pointId=${selectedPoint}`;
    if (selectedUser) base += `&userId=${selectedUser}`;
    return base;
  };

  const fetchFilterLists = async () => {
    if (!project.id) return;
    try {
      const [mRes, pRes, sRes] = await Promise.all([
        api.get(`/admin/markets?projectId=${project.id}`),
        api.get(`/admin/points?projectId=${project.id}`),
        api.get(`/admin/staff?projectId=${project.id}`)
      ]);
      setMarketsList(mRes.data);
      setPointsList(pRes.data);
      setStaffList(sRes.data);
    } catch (err) {
      console.error('Error fetching filter lists:', err);
    }
  };

  useEffect(() => {
    fetchFilterLists();
  }, [project.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = buildParams();

      const [kpisRes, recentRes, perfRes, breakRes, heatRes, geoHeatRes] = await Promise.all([
        api.get(`/analytics/kpis?${params}`),
        api.get(`/analytics/recent?${params}`),
        api.get(`/analytics/performance?${params}`),
        api.get(`/analytics/breakdown?${params}`),
        api.get(`/analytics/heatmap?${params}`),
        api.get(`/analytics/geo-heatmap?${params}`)
      ]);

      setKpis(kpisRes.data);
      setRecentRedemptions(recentRes.data);
      setChartData(perfRes.data);
      setBreakdown(breakRes.data);
      setHeatmap(heatRes.data);
      setGeoHeatmap(geoHeatRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [quickRange, customFrom, customTo, selectedMarket, selectedPoint, selectedUser]);

  const heatmapLevel = project.config?.heatmap_level || 'city';
  const defaultZoom = heatmapLevel === 'city' ? 12 : 15;
  const defaultCenter = { lat: -12.0464, lng: -77.0428 }; // Lima
  const mapCenter = geoHeatmap.length > 0
    ? {
        lat: geoHeatmap.reduce((acc, p) => acc + p.lat, 0) / geoHeatmap.length,
        lng: geoHeatmap.reduce((acc, p) => acc + p.lng, 0) / geoHeatmap.length
      }
    : defaultCenter;

  const daysArray = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

  const quickRangeLabel: Record<QuickRange, string> = {
    today: 'Hoy',
    week: 'Últimos 7 días',
    month: 'Este mes',
    custom: 'Rango personalizado'
  };

  return (
    <AdminLayout>
      <div className="space-y-8">

        {/* Header + Filters */}
        <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Estado de Operación</h2>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-slate-500 font-medium">
                Campaña: <span className="text-brand-purple font-black uppercase italic">{project.name || 'Todos los Proyectos'}</span>
              </p>
              {(project.config?.start_date || project.config?.end_date) && (
                <div className="flex items-center gap-2 px-3 py-1 bg-brand-teal/5 border border-brand-teal/10 rounded-full text-[10px] font-black text-brand-teal uppercase tracking-widest shadow-sm">
                  <Calendar size={12} className="opacity-70" />
                  <span>
                    {project.config.start_date || '?'} — {project.config.end_date || '?'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm gap-1">
              {(['today', 'week', 'month'] as QuickRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => { setQuickRange(r); setShowCustom(false); }}
                  className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                    quickRange === r ? 'bg-brand-purple text-white shadow' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {quickRangeLabel[r]}
                </button>
              ))}
              <button
                onClick={() => { setShowCustom(!showCustom); setQuickRange('custom'); }}
                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${
                  quickRange === 'custom' ? 'bg-brand-purple text-white shadow' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Calendar size={13} />
                Personalizado
                <ChevronDown size={12} />
              </button>
            </div>

            {showCustom && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="text-xs font-bold text-slate-700 outline-none bg-transparent"
                />
                <span className="text-slate-300 font-bold">→</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="text-xs font-bold text-slate-700 outline-none bg-transparent"
                />
              </div>
            )}

            <button
              onClick={fetchData}
              className="px-5 py-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors text-slate-600 shadow-sm flex items-center gap-2 font-bold text-xs uppercase"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-brand-purple' : ''} />
              {loading ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>
        </header>

        {/* ── Additional Filters Bar ── */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-100/50 p-4 rounded-3xl border border-slate-200/60">
          <select 
            value={selectedMarket} 
            onChange={e => setSelectedMarket(e.target.value)}
            className="flex-1 min-w-[150px] bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm text-[11px] font-bold uppercase tracking-widest text-slate-600 outline-none focus:border-brand-purple/40"
          >
            <option value="">Todos los Mercados</option>
            {marketsList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

          <select 
            value={selectedPoint} 
            onChange={e => setSelectedPoint(e.target.value)}
            className="flex-1 min-w-[150px] bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm text-[11px] font-bold uppercase tracking-widest text-slate-600 outline-none focus:border-brand-purple/40"
          >
            <option value="">Todos los PDVs</option>
            {pointsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select 
            value={selectedUser} 
            onChange={e => setSelectedUser(e.target.value)}
            className="flex-1 min-w-[150px] bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm text-[11px] font-bold uppercase tracking-widest text-slate-600 outline-none focus:border-brand-purple/40"
          >
            <option value="">Todo el Personal</option>
            {staffList.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
        </div>

        {/* ── Row 1: Main KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Inversión Total" 
            value={formatValue(kpis.totalAmount || 0)} 
            trend="+12.5%" 
            icon={<ShoppingBag size={20} />} 
            color="purple" 
          />
          <StatCard 
            label="Canjes Totales" 
            value={kpis.totalRedemptions?.toString() || '0'} 
            trend="+8.2%" 
            icon={<Gift size={20} />} 
            color="teal" 
          />
          <StatCard 
            label="Consumidores Únicos" 
            value={kpis.uniqueDnis?.toString() || '0'} 
            trend="+5.4%" 
            icon={<Users size={20} />} 
            color="purple" 
          />
          <StatCard 
            label="Stock Restante" 
            value={kpis.pendingStock?.toString() || '0'} 
            trend="-2.1%" 
            icon={<Activity size={20} />} 
            color="slate" 
          />
          <StatCard 
            label="Tasa Conversión" 
            value={`${kpis.conversionRate}%`} 
            trend="+1.2%" 
            icon={<Target size={20} />} 
            color="teal" 
          />
          <StatCard 
            label="Ticket Promedio" 
            value={formatValue(kpis.avgTicket || 0)} 
            trend="+3.1%" 
            icon={<TrendingUp size={20} />} 
            color="purple" 
          />
          <StatCard 
            label="Canjes Hoy" 
            value={kpis.todayRedemptions?.toString() || '0'} 
            trend="En vivo" 
            icon={<Clock size={20} />} 
            color="orange" 
          />
          <StatCard 
            label="Punto Líder" 
            value={kpis.topPointName || '—'} 
            trend="Más activo" 
            icon={<MapPin size={20} />} 
            color="indigo" 
          />
        </div>

        {/* ── Row 3: Heatmap ── */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="mb-8">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic flex items-center gap-2">
              <Activity size={20} className="text-brand-purple" />
              Mapa de Calor: Concentración de Tráfico
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Horarios pico de canjes en el período seleccionado</p>
          </div>
          <div className="w-full overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-1 mb-2 items-end">
                <div className="w-12"></div>
                {Array.from({length:24}).map((_,h) => (
                  <div key={h} className="text-[9px] font-black text-slate-300 text-center">{h}h</div>
                ))}
              </div>
              {daysArray.map((day, dIdx) => (
                <div key={dIdx} className="grid grid-cols-[auto_repeat(24,1fr)] gap-1 mb-1 items-center hover:bg-slate-50 transition-colors rounded-lg pr-2 py-0.5">
                  <div className="w-12 text-[10px] font-black text-slate-400 uppercase">{day}</div>
                  {Array.from({length:24}).map((_,h) => {
                    const cell = heatmap.matrix?.find((m:any) => m.day === dIdx && m.hour === h);
                    const val = cell ? cell.count : 0;
                    let bgClass = "bg-slate-50";
                    if (val > 0) {
                      const intensity = heatmap.maxCount > 0 ? val / heatmap.maxCount : 0;
                      if (intensity > 0.75) bgClass = "bg-brand-purple shadow-lg shadow-brand-purple/20";
                      else if (intensity > 0.5) bgClass = "bg-brand-purple/80";
                      else if (intensity > 0.25) bgClass = "bg-brand-purple/50";
                      else bgClass = "bg-brand-purple/20";
                    }
                    return <div key={`${dIdx}-${h}`} className={`w-full h-8 rounded-[0.5rem] transition-all duration-300 hover:scale-110 cursor-crosshair ${bgClass}`} title={`${val} canjes el ${day} a las ${h}:00`} />;
                  })}
                </div>
              ))}
              <div className="mt-6 flex items-center gap-6 text-[10px] font-black uppercase text-slate-400 justify-end">
                <span>Tráfico Bajo</span>
                <div className="flex gap-1.5 p-1 bg-slate-50 rounded-lg">
                  {['bg-slate-200','bg-brand-purple/20','bg-brand-purple/50','bg-brand-purple/80','bg-brand-purple'].map((c,i) => (
                    <div key={i} className={`w-4 h-4 rounded-sm ${c}`}></div>
                  ))}
                </div>
                <span>Tráfico Alto</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 4: Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 flex flex-col">
            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic flex items-center gap-2">
                <TrendingUp size={20} className="text-brand-teal" />
                Tendencia de Rendimiento
              </h3>
            </div>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6b0096" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6b0096" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:10, fontWeight:'black', fill:'#94a3b8'}} dy={10} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{borderRadius:'1.5rem', border:'none', boxShadow:'0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight:'black'}} 
                    labelStyle={{color:'#6b0096'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#6b0096" 
                    strokeWidth={5}
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 flex flex-col">
            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic flex items-center gap-2">
                <Award size={20} className="text-brand-purple" />
                Distribución de Premios
              </h3>
            </div>
            <div className="flex-1 min-h-[300px]">
              {breakdown.topRewards && breakdown.topRewards.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={breakdown.topRewards} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={8} dataKey="value">
                      {breakdown.topRewards.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius:'1.5rem', border:'none', boxShadow:'0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight:'black'}} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 font-black uppercase text-[10px] tracking-widest italic border-2 border-dashed border-slate-50 rounded-[2rem]">Sin datos acumulados</div>
              )}
            </div>
            <div className="flex flex-wrap gap-4 justify-center mt-6">
              {breakdown.topRewards?.map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                  <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-tighter">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 5: Top Points Ranking & Recent Feed ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40">
            <div className="mb-8">
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic flex items-center gap-2">
                <BarChart3 size={24} className="text-brand-teal" />
                Ranking de Puntos
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Efectividad por punto de canje autorizado</p>
            </div>
            {kpis.topPoints && kpis.topPoints.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {kpis.topPoints.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-[2rem] hover:bg-slate-50 transition-all group hover:scale-[1.02] shadow-sm">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-lg`} style={{backgroundColor: COLORS[i % COLORS.length]}}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate uppercase tracking-tighter">{p.name}</p>
                      <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 shadow-sm"
                          style={{
                            width: `${Math.round((p.count / (kpis.topPoints[0]?.count || 1)) * 100)}%`,
                            backgroundColor: COLORS[i % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900 tracking-tighter">{p.count}</p>
                      <p className="text-[9px] text-brand-purple font-black uppercase tracking-tighter">Canjes</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-[2.5rem] text-slate-300 text-xs font-black uppercase italic tracking-widest">Sin datos en el ranking</div>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic flex items-center gap-2 px-2">
              <RefreshCw size={20} className="text-brand-purple animate-pulse" />
              Feed en Tiempo Real
            </h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
              {recentRedemptions.length > 0 ? recentRedemptions.slice(0, 8).map((r: any) => (
                <div key={r.id} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 hover:shadow-brand-purple/10 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-brand-purple/5 rounded-full -mr-8 -mt-8"></div>
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-purple border border-slate-100 shadow-sm group-hover:bg-brand-purple group-hover:text-white transition-all duration-500">
                        <Gift size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase leading-none truncate w-32">{r.point?.name || 'Local'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{r.user?.fullName || 'Staff'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-sm font-black text-brand-teal">{formatValue(r.purchaseAmount)}</p>
                      <ArrowUpRight size={14} className="text-brand-teal opacity-50 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50 relative z-10">
                    <div className="flex items-center gap-2">
                      <Clock size={10} className="text-slate-300" />
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{new Date(r.createdAt).toLocaleTimeString('es-PE', {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    <span className="text-[9px] font-black text-brand-purple bg-brand-purple/10 px-2 py-1 rounded-full uppercase tracking-tighter">Validado</span>
                  </div>
                </div>
              )) : (
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-[2.5rem] text-slate-300 text-xs font-black uppercase italic tracking-widest bg-white">Esperando data...</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 6: GeoHeatmap ── */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm mt-8">
          <div className="mb-8">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic flex items-center gap-2">
              <MapPin size={20} className="text-brand-purple" />
              Concentración Geográfica de Canjes
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ubicación física de registros en el período seleccionado (Vista: {heatmapLevel})</p>
          </div>
          <div className="w-full h-[450px] rounded-[1.5rem] overflow-hidden border border-slate-200 shadow-inner relative z-0">
            {geoHeatmap.length > 0 ? (
              <MapContainer 
                center={[mapCenter.lat, mapCenter.lng]} 
                zoom={defaultZoom} 
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <GeoHeatmapLayer 
                  points={geoHeatmap} 
                  radius={heatmapLevel === 'city' ? 25 : 35} 
                  blur={15} 
                />
              </MapContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-slate-50 text-slate-300 text-xs font-black uppercase italic tracking-widest">
                Sin coordenadas para mostrar
              </div>
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

// ─── StatCard Component ───────────────────────────────────────────────────────

const colorMap: Record<string, { bg: string; icon: string; text: string; shadow: string }> = {
  purple:  { bg: 'bg-brand-purple/5',  icon: 'text-brand-purple',  text: 'text-brand-purple',  shadow: 'shadow-brand-purple/10' },
  teal:    { bg: 'bg-brand-teal/5',    icon: 'text-brand-teal',    text: 'text-brand-teal',    shadow: 'shadow-brand-teal/20'   },
  orange:  { bg: 'bg-orange-50',       icon: 'text-orange-500',    text: 'text-orange-500',    shadow: 'shadow-orange-200'      },
  indigo:  { bg: 'bg-indigo-50',       icon: 'text-indigo-500',    text: 'text-indigo-500',    shadow: 'shadow-indigo-200'      },
  slate:   { bg: 'bg-slate-50',        icon: 'text-slate-400',     text: 'text-slate-500',     shadow: 'shadow-slate-200'       },
};

const StatCard: React.FC<{
  icon: any; label: string; value: string; trend: string; color: string;
}> = ({ icon, label, value, trend, color }) => {
  const c = colorMap[color] || colorMap.purple;
  return (
    <div className={`bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl ${c.shadow} relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
      <div className={`absolute top-0 right-0 w-24 h-24 ${c.bg} rounded-full -mr-12 -mt-12 blur-3xl opacity-60 group-hover:opacity-100 transition-opacity`}></div>
      <div className="flex flex-col gap-4">
        <div className={`w-12 h-12 ${c.bg} ${c.icon} rounded-2xl flex items-center justify-center border border-white`}>
          {icon}
        </div>
        <div>
          <h4 className="text-2xl font-black text-slate-900 tracking-tighter truncate max-w-full leading-none">{value}</h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{label}</p>
        </div>
        <div className={`text-[10px] font-black uppercase tracking-tighter ${c.text} bg-white/80 self-start px-2 py-1 rounded-full border border-slate-50 shadow-sm`}>{trend}</div>
      </div>
    </div>
  );
};

export default AdminDashboard;
