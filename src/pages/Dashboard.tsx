import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, ShoppingCart, TrendingUp, BarChart3, PieChart, Activity, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar, Legend } from "recharts";

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

  useEffect(() => {
    loadDashboardStats();
    loadChartData();
  }, []);

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
    setSalesTrend(Object.entries(salesByDay || {}).map(([date, amount]) => ({ date, sales: amount })));

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
      value: totalProducts, 
      icon: Package, 
      gradient: "from-violet-500 to-purple-600",
      shadowColor: "shadow-violet-500/30",
      trend: "+12%",
      trendUp: true
    },
    { 
      title: "Low Stock Items", 
      value: lowStockItems, 
      icon: AlertTriangle, 
      gradient: "from-amber-500 to-orange-600",
      shadowColor: "shadow-amber-500/30",
      trend: "-5%",
      trendUp: false
    },
    { 
      title: "Today's Sales", 
      value: todaySales, 
      icon: ShoppingCart, 
      gradient: "from-emerald-500 to-teal-600",
      shadowColor: "shadow-emerald-500/30",
      trend: "+18%",
      trendUp: true
    },
    { 
      title: "Active Alerts", 
      value: activeAlerts, 
      icon: Zap, 
      gradient: "from-rose-500 to-pink-600",
      shadowColor: "shadow-rose-500/30",
      trend: "-2%",
      trendUp: false
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="space-y-8 p-2">
      {/* Header with glassmorphism */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJjLTIgMC00IDItNCAyczIgNCA0IDRjMiAwIDQtMiA0LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Activity className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          </div>
          <p className="text-white/80 text-lg">Real-time inventory analytics & insights</p>
          <div className="mt-6 flex flex-wrap gap-6">
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-6 py-4 border border-white/20">
              <p className="text-white/70 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-6 py-4 border border-white/20">
              <p className="text-white/70 text-sm">Inventory Health</p>
              <p className="text-3xl font-bold">{totalProducts > 0 ? Math.round(((totalProducts - lowStockItems) / totalProducts) * 100) : 0}%</p>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* 3D Stat Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-6 text-white shadow-xl ${stat.shadowColor} transition-all duration-500 hover:scale-105 hover:shadow-2xl cursor-pointer`}
              style={{ 
                animationDelay: `${index * 100}ms`,
                transform: 'perspective(1000px) rotateX(0deg)',
              }}
            >
              {/* 3D shine effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Floating icon background */}
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-lg">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${stat.trendUp ? 'bg-white/20' : 'bg-white/20'}`}>
                    {stat.trend}
                  </span>
                </div>
                <p className="text-white/80 text-sm font-medium mb-1">{stat.title}</p>
                <p className="text-4xl font-bold tracking-tight">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Trend - Area Chart with gradient */}
        <Card className="overflow-hidden border-0 shadow-xl bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-violet-500/10 to-purple-500/10">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white shadow-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <span className="text-lg font-bold">Sales Trend</span>
                <p className="text-xs text-muted-foreground font-normal">Last 30 days performance</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                    }}
                    formatter={(value: any) => [`$${value}`, 'Sales']}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#8b5cf6" strokeWidth={3} fill="url(#salesGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No sales data yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products - 3D Bar Chart */}
        <Card className="overflow-hidden border-0 shadow-xl bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl text-white shadow-lg">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-lg font-bold">Top Products</span>
                <p className="text-xs text-muted-foreground font-normal">Best selling items</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts} layout="vertical">
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                    }}
                  />
                  <Bar dataKey="quantity" fill="url(#barGradient)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No product data yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Status - Radial Chart */}
        <Card className="overflow-hidden border-0 shadow-xl bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-lg">
                <PieChart className="h-5 w-5" />
              </div>
              <div>
                <span className="text-lg font-bold">Stock Status</span>
                <p className="text-xs text-muted-foreground font-normal">Inventory distribution</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {stockStatus.some(s => s.value > 0) ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="60%" height={280}>
                  <RePieChart>
                    <defs>
                      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.3"/>
                      </filter>
                    </defs>
                    <Pie 
                      data={stockStatus} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      filter="url(#shadow)"
                    >
                      {stockStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                      }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-4">
                  {stockStatus.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                      <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: item.fill }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-2xl font-bold">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <PieChart className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No inventory data yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products by Category - Modern Bar */}
        <Card className="overflow-hidden border-0 shadow-xl bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-lg">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <span className="text-lg font-bold">Products by Category</span>
                <p className="text-xs text-muted-foreground font-normal">Category breakdown</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                    }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No category data yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
