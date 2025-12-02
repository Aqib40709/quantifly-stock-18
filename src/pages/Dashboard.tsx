import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, ShoppingCart, TrendingUp, BarChart3, PieChart, Activity, Zap, ArrowUpRight, ArrowDownRight, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, AreaChart, Area, ComposedChart } from "recharts";
import { Button } from "@/components/ui/button";

// Animated counter hook
const useAnimatedCounter = (end: number, duration: number = 1000) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  
  useEffect(() => {
    const startTime = Date.now();
    const startValue = countRef.current;
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (end - startValue) * easeOut);
      
      setCount(current);
      countRef.current = current;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [end, duration]);
  
  return count;
};

// Mini sparkline component
const MiniSparkline = ({ data, color }: { data: number[], color: string }) => {
  if (data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 60;
    const y = 20 - ((value - min) / range) * 18;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width="60" height="24" className="opacity-60">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export default function Dashboard() {
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockItems, setLowStockItems] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [activeAlerts, setActiveAlerts] = useState(0);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [stockStatus, setStockStatus] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sparklineData, setSparklineData] = useState<number[]>([]);

  // Animated values
  const animatedProducts = useAnimatedCounter(totalProducts);
  const animatedLowStock = useAnimatedCounter(lowStockItems);
  const animatedSales = useAnimatedCounter(todaySales);
  const animatedAlerts = useAnimatedCounter(activeAlerts);
  const animatedRevenue = useAnimatedCounter(totalRevenue);

  useEffect(() => {
    loadDashboardStats();
    loadChartData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadDashboardStats(), loadChartData()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const loadDashboardStats = async () => {
    const { count: productsCount } = await supabase.from("products").select("*", { count: "exact", head: true });
    const { data: lowStockData } = await supabase.from("inventory").select("*, products!inner(reorder_level)");
    const lowStockCount = lowStockData?.filter((item: any) => item.quantity <= item.products.reorder_level).length || 0;
    const today = new Date().toISOString().split("T")[0];
    const { count: salesCount } = await supabase.from("sales").select("*", { count: "exact", head: true }).gte("sale_date", today);
    const { count: alertsCount } = await supabase.from("inventory_alerts").select("*", { count: "exact", head: true }).eq("is_resolved", false);
    
    const { data: revenueData } = await supabase.from("sales").select("total_amount");
    const revenue = revenueData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
    
    setTotalProducts(productsCount || 0);
    setLowStockItems(lowStockCount);
    setTodaySales(salesCount || 0);
    setActiveAlerts(alertsCount || 0);
    setTotalRevenue(revenue);
  };

  const loadChartData = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: salesData } = await supabase.from("sales").select("sale_date, total_amount").gte("sale_date", thirtyDaysAgo.toISOString()).order("sale_date");
    const salesByDay = salesData?.reduce((acc: any, sale) => {
      const date = new Date(sale.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!acc[date]) acc[date] = 0;
      acc[date] += Number(sale.total_amount);
      return acc;
    }, {});
    const trendData = Object.entries(salesByDay || {}).map(([date, amount]) => ({ date, sales: amount }));
    setSalesTrend(trendData);
    setSparklineData(trendData.slice(-7).map((d: any) => d.sales));

    const { data: topProductsData } = await supabase.from("sales_items").select("product_id, quantity, products(name)").limit(100);
    const productSales = topProductsData?.reduce((acc: any, item: any) => {
      const name = item.products?.name || 'Unknown';
      if (!acc[name]) acc[name] = 0;
      acc[name] += item.quantity;
      return acc;
    }, {});
    setTopProducts(Object.entries(productSales || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([name, quantity]) => ({ name, quantity })));

    const { data: inventoryData } = await supabase.from("inventory").select("quantity, products(reorder_level)");
    let inStock = 0, lowStock = 0, outOfStock = 0;
    inventoryData?.forEach((item: any) => {
      if (item.quantity === 0) outOfStock++;
      else if (item.quantity <= (item.products?.reorder_level || 0)) lowStock++;
      else inStock++;
    });
    setStockStatus([
      { name: 'In Stock', value: inStock, fill: '#10b981' },
      { name: 'Low Stock', value: lowStock, fill: '#f59e0b' },
      { name: 'Out of Stock', value: outOfStock, fill: '#ef4444' },
    ]);

    const { data: productsData } = await supabase.from("products").select("category");
    const categoryCounts = productsData?.reduce((acc: any, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {});
    setCategoryData(Object.entries(categoryCounts || {}).map(([name, count], index) => ({ 
      name, 
      count,
      fill: ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899'][index % 6]
    })));
  };

  const statCards = [
    { 
      title: "Total Products", 
      value: animatedProducts, 
      icon: Package, 
      gradient: "from-violet-500 via-purple-500 to-indigo-500",
      glowColor: "violet",
      trend: "+12%",
      trendUp: true,
      sparkColor: "#a78bfa"
    },
    { 
      title: "Low Stock Items", 
      value: animatedLowStock, 
      icon: AlertTriangle, 
      gradient: "from-amber-500 via-orange-500 to-red-500",
      glowColor: "amber",
      trend: "-5%",
      trendUp: false,
      sparkColor: "#fbbf24",
      pulse: lowStockItems > 0
    },
    { 
      title: "Today's Sales", 
      value: animatedSales, 
      icon: ShoppingCart, 
      gradient: "from-emerald-500 via-teal-500 to-cyan-500",
      glowColor: "emerald",
      trend: "+18%",
      trendUp: true,
      sparkColor: "#34d399"
    },
    { 
      title: "Active Alerts", 
      value: animatedAlerts, 
      icon: Zap, 
      gradient: "from-rose-500 via-pink-500 to-fuchsia-500",
      glowColor: "rose",
      trend: "-2%",
      trendUp: false,
      sparkColor: "#fb7185",
      pulse: activeAlerts > 0
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  };

  const inventoryHealth = totalProducts > 0 ? Math.round(((totalProducts - lowStockItems) / totalProducts) * 100) : 0;

  return (
    <div className="space-y-8 p-2 min-h-screen">
      {/* Floating Particles Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header with glassmorphism */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-8 text-white shadow-2xl shadow-violet-500/25 z-10">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJjLTIgMC00IDItNCAyczIgNCA0IDRjMiAwIDQtMiA0LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')]"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg border border-white/20">
                <Activity className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
                  Dashboard
                  <Sparkles className="h-6 w-6 text-amber-300 animate-pulse" />
                </h1>
                <p className="text-white/80 text-lg">Real-time inventory analytics & insights</p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleRefresh}
              className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Revenue Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-5 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium">Total Revenue</p>
                  <p className="text-4xl font-bold mt-1">{formatCurrency(animatedRevenue)}</p>
                </div>
                <div className="p-3 bg-emerald-500/30 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-emerald-300" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-emerald-300">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm font-medium">+24% from last month</span>
              </div>
            </div>
            
            {/* Inventory Health Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-5 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium">Inventory Health</p>
                  <p className="text-4xl font-bold mt-1">{inventoryHealth}%</p>
                </div>
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                    <circle 
                      cx="32" cy="32" r="28" fill="none" 
                      stroke={inventoryHealth > 70 ? '#10b981' : inventoryHealth > 40 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="6" 
                      strokeDasharray={`${inventoryHealth * 1.76} 176`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-sm text-white/60">{lowStockItems} items need attention</p>
            </div>
            
            {/* Quick Stats Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-5 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] cursor-pointer">
              <p className="text-white/70 text-sm font-medium mb-3">Weekly Trend</p>
              <div className="flex items-end gap-1 h-12">
                {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                  <div 
                    key={i}
                    className="flex-1 bg-gradient-to-t from-cyan-400 to-cyan-300 rounded-t-sm transition-all duration-500 hover:from-cyan-300 hover:to-cyan-200"
                    style={{ height: `${height}%`, animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-white/50">
                <span>Mon</span>
                <span>Sun</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* 3D Stat Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 relative z-10">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-6 text-white shadow-xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 cursor-pointer`}
              style={{ 
                animationDelay: `${index * 100}ms`,
                boxShadow: `0 20px 40px -15px rgba(0,0,0,0.3), 0 0 30px -10px var(--${stat.glowColor}-500)`,
              }}
            >
              {/* Pulse effect for alerts */}
              {stat.pulse && (
                <div className="absolute inset-0 bg-white/20 animate-ping rounded-2xl"></div>
              )}
              
              {/* 3D shine effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Floating particles */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="absolute top-8 right-8 w-1 h-1 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute bottom-8 left-8 w-1.5 h-1.5 bg-white/35 rounded-full animate-bounce" style={{ animationDelay: '0.25s' }}></div>
              
              {/* Floating icon background */}
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-lg border border-white/20 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <MiniSparkline data={sparklineData} color={stat.sparkColor} />
                    <span className={`text-sm font-medium px-3 py-1 rounded-full flex items-center gap-1 ${stat.trendUp ? 'bg-emerald-500/30' : 'bg-rose-500/30'}`}>
                      {stat.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {stat.trend}
                    </span>
                  </div>
                </div>
                <p className="text-white/80 text-sm font-medium mb-1">{stat.title}</p>
                <p className="text-5xl font-bold tracking-tight">{stat.value}</p>
              </div>
              
              {/* Bottom gradient line */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2 relative z-10">
        {/* Sales Trend - Area Chart with gradient */}
        <Card className="overflow-hidden border-0 shadow-2xl bg-card/90 backdrop-blur-xl hover:shadow-violet-500/10 transition-all duration-500 group">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-indigo-500/10">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Sales Trend</span>
                <p className="text-xs text-muted-foreground font-normal">Last 30 days performance</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={salesTrend}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                      <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: 'none',
                      borderRadius: '16px',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
                    }}
                    formatter={(value: any) => [`$${value}`, 'Sales']}
                  />
                  <Area type="monotone" dataKey="sales" stroke="transparent" fill="url(#salesGradient)" />
                  <Line type="monotone" dataKey="sales" stroke="#8b5cf6" strokeWidth={3} dot={false} filter="url(#glow)" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={TrendingUp} message="No sales data yet" />
            )}
          </CardContent>
        </Card>

        {/* Top Products - 3D Bar Chart */}
        <Card className="overflow-hidden border-0 shadow-2xl bg-card/90 backdrop-blur-xl hover:shadow-cyan-500/10 transition-all duration-500 group">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl text-white shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Top Products</span>
                <p className="text-xs text-muted-foreground font-normal">Best selling items</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topProducts} layout="vertical">
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} opacity={0.5} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={100} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: 'none',
                      borderRadius: '16px',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
                    }}
                  />
                  <Bar dataKey="quantity" fill="url(#barGradient)" radius={[0, 12, 12, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={BarChart3} message="No product data yet" />
            )}
          </CardContent>
        </Card>

        {/* Stock Status - Donut Chart */}
        <Card className="overflow-hidden border-0 shadow-2xl bg-card/90 backdrop-blur-xl hover:shadow-emerald-500/10 transition-all duration-500 group">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                <PieChart className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Stock Status</span>
                <p className="text-xs text-muted-foreground font-normal">Inventory distribution</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {stockStatus.some(s => s.value > 0) ? (
              <div className="flex items-center gap-8">
                <div className="relative">
                  <ResponsiveContainer width={220} height={220}>
                    <RePieChart>
                      <defs>
                        <filter id="shadow3d" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000" floodOpacity="0.2"/>
                        </filter>
                      </defs>
                      <Pie 
                        data={stockStatus} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        filter="url(#shadow3d)"
                        cornerRadius={8}
                      >
                        {stockStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: 'none',
                          borderRadius: '16px',
                          boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
                        }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                  {/* Center text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-3xl font-bold">{stockStatus.reduce((a, b) => a + b.value, 0)}</p>
                      <p className="text-xs text-muted-foreground">Total Items</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  {stockStatus.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted hover:to-muted/50 transition-all duration-300 cursor-pointer group/item">
                      <div className="w-4 h-4 rounded-full shadow-lg ring-4 ring-offset-2 ring-offset-background" style={{ backgroundColor: item.fill, boxShadow: `0 0 20px ${item.fill}40` }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium group-hover/item:text-foreground transition-colors">{item.name}</p>
                      </div>
                      <p className="text-2xl font-bold">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState icon={PieChart} message="No inventory data yet" />
            )}
          </CardContent>
        </Card>

        {/* Products by Category */}
        <Card className="overflow-hidden border-0 shadow-2xl bg-card/90 backdrop-blur-xl hover:shadow-amber-500/10 transition-all duration-500 group">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Products by Category</span>
                <p className="text-xs text-muted-foreground font-normal">Category breakdown</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={categoryData}>
                  <defs>
                    {categoryData.map((entry, index) => (
                      <linearGradient key={index} id={`catGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                        <stop offset="100%" stopColor={entry.fill} stopOpacity={0.6} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: 'none',
                      borderRadius: '16px',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
                    }}
                  />
                  <Bar dataKey="count" radius={[12, 12, 0, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#catGradient${index})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={Package} message="No category data yet" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Empty state component
const EmptyState = ({ icon: Icon, message }: { icon: any, message: string }) => (
  <div className="h-[320px] flex items-center justify-center">
    <div className="text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-muted to-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground font-medium">{message}</p>
    </div>
  </div>
);
