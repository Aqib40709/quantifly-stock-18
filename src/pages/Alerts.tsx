import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Alert {
  id: string;
  alert_type: string;
  message: string;
  is_resolved: boolean;
  created_at: string;
  products: { name: string; sku: string } | null;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("inventory_alerts")
        .select(`
          *,
          products(name, sku)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error("Error loading alerts:", error);
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("inventory_alerts")
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq("id", alertId);

      if (error) throw error;
      toast.success("Alert resolved");
      loadAlerts();
    } catch (error) {
      console.error("Error resolving alert:", error);
      toast.error("Failed to resolve alert");
    }
  };

  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case "low_stock":
        return "bg-warning text-warning-foreground";
      case "expiry":
        return "bg-destructive text-destructive-foreground";
      case "reorder":
        return "bg-primary text-primary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory Alerts</h1>
        <p className="text-muted-foreground">Monitor and manage inventory notifications</p>
      </div>

      <div className="space-y-3">
        {loading ? (
          <Card className="p-6 shadow-card">
            <div className="text-center text-muted-foreground">Loading alerts...</div>
          </Card>
        ) : alerts.length === 0 ? (
          <Card className="p-6 shadow-card">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-12 w-12 text-success mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Alerts</h3>
              <p className="text-muted-foreground">
                All inventory levels are within normal range
              </p>
            </div>
          </Card>
        ) : (
          alerts.map((alert) => (
            <Card
              key={alert.id}
              className={`p-4 shadow-card ${
                alert.is_resolved ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <AlertCircle className={`h-5 w-5 mt-0.5 ${
                    alert.is_resolved ? "text-muted-foreground" : "text-warning"
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getAlertTypeColor(alert.alert_type)}>
                        {alert.alert_type.replace("_", " ").toUpperCase()}
                      </Badge>
                      {alert.products && (
                        <span className="text-sm font-mono text-muted-foreground">
                          {alert.products.sku}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mb-1">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!alert.is_resolved && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveAlert(alert.id)}
                  >
                    Resolve
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}