import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package2, TrendingUp, BarChart3, AlertCircle } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <nav className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gradient-primary p-2">
              <Package2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">InventoryPro</span>
          </div>
          <Link to="/auth">
            <Button>Get Started</Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Smart Inventory Management & Demand Forecasting
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Streamline your inventory operations with AI-powered insights, real-time tracking, and predictive analytics
          </p>
          <Link to="/auth">
            <Button size="lg" className="text-lg px-8">
              Start Free Trial
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="p-6 rounded-lg border border-border bg-card shadow-card">
            <div className="rounded-lg bg-primary/10 p-3 w-fit mb-4">
              <Package2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Product Management</h3>
            <p className="text-muted-foreground">
              Track products, SKUs, and inventory across multiple locations
            </p>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card shadow-card">
            <div className="rounded-lg bg-success/10 p-3 w-fit mb-4">
              <BarChart3 className="h-6 w-6 text-success" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Sales Tracking</h3>
            <p className="text-muted-foreground">
              Record and analyze sales transactions with detailed reporting
            </p>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card shadow-card">
            <div className="rounded-lg bg-accent/10 p-3 w-fit mb-4">
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-semibold text-lg mb-2">AI Forecasting</h3>
            <p className="text-muted-foreground">
              Predict demand and optimize reorder quantities with ML
            </p>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card shadow-card">
            <div className="rounded-lg bg-warning/10 p-3 w-fit mb-4">
              <AlertCircle className="h-6 w-6 text-warning" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Smart Alerts</h3>
            <p className="text-muted-foreground">
              Get notified about low stock, expiries, and reorder needs
            </p>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to optimize your inventory?</h2>
          <p className="text-muted-foreground mb-6">
            Join businesses that trust InventoryPro for their inventory management
          </p>
          <Link to="/auth">
            <Button size="lg" variant="outline">
              Sign Up Now
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Index;
