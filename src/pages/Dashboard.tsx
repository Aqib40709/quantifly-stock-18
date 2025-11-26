import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, ShoppingCart, TrendingUp, BarChart3, PieChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

export default function Dashboard() {
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockItems, setLowStockItems] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [activeAlerts, setActiveAlerts] = useState(0);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [stockStatus, setStockStatus] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);

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
    
    setTotalProducts(productsCount || 0);
    setLowStockItems(lowStockCount);
    setTodaySales(salesCount || 0);
    setActiveAlerts(alertsCount || 0);
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
      { name: 'In Stock', value: inStock, color: 'hsl(var(--chart-1))' },
      { name: 'Low Stock', value: lowStock, color: 'hsl(var(--chart-2))' },
      { name: 'Out of Stock', value: outOfStock, color: 'hsl(var(--chart-3))' },
    ]);

    const { data: productsData } = await supabase.from("products").select("category");
    const categoryCounts = productsData?.reduce((acc: any, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {});
    setCategoryData(Object.entries(categoryCounts || {}).map(([name, count]) => ({ name, count })));
  };

  const statCards = [
    { title: "Total Products", value: totalProducts, icon: Package, color: "text-primary", bgColor: "bg-primary/10" },
    { title: "Low Stock Items", value: lowStockItems, icon: AlertTriangle, color: "text-warning", bgColor: "bg-warning/10" },
    { title: "Today's Sales", value: todaySales, icon: ShoppingCart, color: "text-success", bgColor: "bg-success/10" },
    { title: "Active Alerts", value: activeAlerts, icon: TrendingUp, color: "text-accent", bgColor: "bg-accent/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your inventory management system</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Sales Trend (Last 30 Days)</CardTitle></CardHeader>
          <CardContent>
            {salesTrend.length > 0 ? (
              <ChartContainer config={{ sales: { label: "Sales", color: "hsl(var(--chart-1))" } }} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey="sales" stroke="hsl(var(--chart-1))" strokeWidth={2} /></LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground">No sales data yet</div>}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Top 5 Products</CardTitle></CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <ChartContainer config={{ quantity: { label: "Quantity Sold", color: "hsl(var(--chart-2))" } }} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip content={<ChartTooltipContent />} /><Bar dataKey="quantity" fill="hsl(var(--chart-2))" /></BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground">No product data yet</div>}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" />Stock Status</CardTitle></CardHeader>
          <CardContent>
            {stockStatus.some(s => s.value > 0) ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie 
                      data={stockStatus} 
                      cx="50%" 
                      cy="50%" 
                      labelLine={false}
                      outerRadius={80} 
                      fill="#8884d8" 
                      dataKey="value"
                    >
                      {stockStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2">
                  {stockStatus.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value} items</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground">No inventory data yet</div>}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Products by Category</CardTitle></CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ChartContainer config={{ count: { label: "Products", color: "hsl(var(--chart-3))" } }} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip content={<ChartTooltipContent />} /><Bar dataKey="count" fill="hsl(var(--chart-3))" /></BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground">No category data yet</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
