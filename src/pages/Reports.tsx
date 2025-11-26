import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, DollarSign, TrendingUp, Package, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StockValuation {
  product_name: string;
  quantity: number;
  cost_price: number;
  unit_price: number;
  total_cost: number;
  total_value: number;
}

interface SalesSummary {
  period: string;
  total_sales: number;
  total_revenue: number;
  transactions: number;
}

export default function Reports() {
  const [stockValuation, setStockValuation] = useState<StockValuation[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    await Promise.all([loadStockValuation(), loadSalesSummary()]);
    setLoading(false);
  };

  const loadStockValuation = async () => {
    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        cost_price,
        unit_price,
        inventory(quantity)
      `);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load stock valuation",
        variant: "destructive",
      });
      return;
    }

    const valuations = data.map((product: any) => {
      const quantity = product.inventory?.[0]?.quantity || 0;
      return {
        product_name: product.name,
        quantity,
        cost_price: Number(product.cost_price),
        unit_price: Number(product.unit_price),
        total_cost: quantity * Number(product.cost_price),
        total_value: quantity * Number(product.unit_price),
      };
    });

    setStockValuation(valuations);
  };

  const loadSalesSummary = async () => {
    const { data, error } = await supabase
      .from("sales")
      .select("sale_date, total_amount")
      .order("sale_date", { ascending: false })
      .limit(30);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load sales summary",
        variant: "destructive",
      });
      return;
    }

    const grouped = data.reduce((acc: any, sale: any) => {
      const date = new Date(sale.sale_date).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { total_revenue: 0, transactions: 0 };
      }
      acc[date].total_revenue += Number(sale.total_amount);
      acc[date].transactions += 1;
      return acc;
    }, {});

    const summary = Object.entries(grouped).map(([date, stats]: [string, any]) => ({
      period: date,
      total_sales: stats.transactions,
      total_revenue: stats.total_revenue,
      transactions: stats.transactions,
    }));

    setSalesSummary(summary);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) => Object.values(row).join(","));
    const csv = [headers, ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();

    toast({
      title: "Export Successful",
      description: "Report exported as CSV",
    });
  };

  const getTotalStockValue = () => {
    return stockValuation.reduce((sum, item) => sum + item.total_value, 0);
  };

  const getTotalStockCost = () => {
    return stockValuation.reduce((sum, item) => sum + item.total_cost, 0);
  };

  const getPotentialProfit = () => {
    return getTotalStockValue() - getTotalStockCost();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">Comprehensive business insights and reports</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${getTotalStockValue().toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total inventory value</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Cost</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${getTotalStockCost().toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total cost basis</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${getPotentialProfit().toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">If all stock sold</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">Stock Valuation</TabsTrigger>
          <TabsTrigger value="sales">Sales Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Current Stock Valuation</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(stockValuation, "stock-valuation")}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead className="text-right">Profit Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockValuation.map((item, index) => {
                    const profitMargin =
                      item.unit_price > 0
                        ? ((item.unit_price - item.cost_price) / item.unit_price) * 100
                        : 0;
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">${item.cost_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${item.total_cost.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${item.total_value.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{profitMargin.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Daily Sales Summary</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(salesSummary, "sales-summary")}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead className="text-right">Avg. Transaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesSummary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No sales data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    salesSummary.map((summary, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{summary.period}</TableCell>
                        <TableCell className="text-right">{summary.transactions}</TableCell>
                        <TableCell className="text-right">
                          ${summary.total_revenue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          ${(summary.total_revenue / summary.transactions).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
