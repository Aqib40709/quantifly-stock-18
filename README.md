# InventoryPro - Smart Inventory Management System

A modern, full-stack inventory management system built with React, TypeScript, and Lovable Cloud (Supabase).

## Features

- **Product Management**: Add, edit, and track products with SKU, pricing, and categories
- **Supplier Management**: Manage supplier information and relationships
- **Sales & Purchase Tracking**: Record and monitor sales and purchase transactions
- **Inventory Management**: Real-time stock tracking with automatic updates
- **Smart Alerts**: Get notified about low stock, reorder points, and critical inventory levels
- **AI-Powered Forecasting**: Predict future demand using machine learning
- **Analytics Dashboard**: Visual insights with charts and reports
- **User Authentication**: Secure login and signup with user-specific data isolation
- **Multi-user Support**: Each user only sees their own data

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Tailwind CSS
- **Backend**: Lovable Cloud (Supabase)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth
- **Charts**: Recharts
- **Form Handling**: React Hook Form with Zod validation

## Prerequisites

Before running this project, make sure you have:

- Node.js (v18 or higher)
- npm or yarn package manager
- A Lovable Cloud account (or Supabase account)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <YOUR_GIT_URL>
cd inventorypro
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

**Note**: If you created this project through Lovable, these are automatically configured.

### 4. Database Setup

The database migrations are located in `supabase/migrations/`. If you're using Lovable Cloud, migrations are applied automatically. For self-hosted Supabase:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

## Running the Project

### Development Mode

```bash
npm run dev
```

The application will start on `http://localhost:8080`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Deployment

### Deploying to Vercel

#### Option 1: Connect GitHub Repository (Recommended)

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. Go to [Vercel Dashboard](https://vercel.com/dashboard)

3. Click "Add New Project"

4. Import your GitHub repository

5. Configure project settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

6. Add Environment Variables in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`

7. Click "Deploy"

#### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Updating Deployment

**If connected to GitHub**: Simply push changes to your repository:
```bash
git add .
git commit -m "Update: your changes"
git push origin main
```

Vercel will automatically rebuild and deploy your changes.

**If using Vercel CLI**: Run `vercel --prod` again to deploy updates.

### Publishing via Lovable

If you're using Lovable, you can also publish directly:

1. Click the "Publish" button in Lovable (top right on desktop)
2. Click "Update" to push frontend changes live
3. Backend changes (edge functions, database) deploy automatically

**Note**: Frontend changes require clicking "Update" in the publish dialog, while backend changes deploy immediately.

## Project Structure

```
inventorypro/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── AddProductDialog.tsx
│   │   ├── AddSaleDialog.tsx
│   │   └── ...
│   ├── pages/            # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Products.tsx
│   │   ├── Sales.tsx
│   │   └── ...
│   ├── integrations/     # Backend integrations
│   │   └── supabase/     # Supabase client & types
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   └── main.tsx          # Application entry point
├── supabase/
│   ├── functions/        # Edge functions
│   └── migrations/       # Database migrations
├── public/               # Static assets
└── package.json
```

## Machine Learning Algorithms

### Demand Forecasting System

The demand forecasting feature uses an advanced **ensemble machine learning approach** similar to gradient boosting frameworks like XGBoost. Here's how it works:

#### 1. **Gradient Boosting Ensemble**
The system combines multiple weak learners using weighted voting to create a strong predictor:

- **Exponential Smoothing (ETS)** - Weight: 30%
  - Applies weighted averages with exponentially decreasing weights
  - Alpha parameter (0.3) controls the smoothing factor
  - Effective for time series with trends and noise reduction

- **Linear Regression (OLS)** - Weight: 30%
  - Fits a linear trend line using ordinary least squares
  - Calculates slope and intercept to project future values
  - Good for identifying long-term trends

- **Moving Average (MA)** - Weight: 40%
  - Uses 14-day rolling window for short-term stability
  - Reduces impact of outliers and random fluctuations
  - Highest weight due to proven stability

#### 2. **Seasonal Decomposition (STL)**
- Detects weekly patterns in sales data
- Applies multiplicative seasonal factors
- Accounts for cyclical variations in demand

#### 3. **AI Neural Network Enhancement** (Optional)
- Uses Google Gemini AI for complex pattern recognition
- Analyzes anomalies, external factors, and non-linear relationships
- Blends AI insights (30%) with statistical models (70%)

#### 4. **Confidence Scoring System**
The system calculates prediction confidence using:
- **Coefficient of Variation (CV)**: Measures data consistency (40% weight)
- **Prediction Reasonableness**: Deviation from recent averages (40% weight)
- **Data Volume Score**: More historical data = higher confidence (20% weight)

#### How It Works:
1. Collects 90 days of historical sales data
2. Applies time series preprocessing and gap filling
3. Runs all algorithms in parallel (ensemble approach)
4. Combines predictions using optimized weights
5. Applies seasonal adjustments
6. Optionally enhances with AI analysis
7. Generates confidence scores
8. Stores 30-day demand forecasts

This approach provides robust, interpretable forecasts similar to gradient boosting frameworks while being adaptable and production-ready.

## Key Features Explained

### Authentication
- Users must sign up/login to access the system
- Email auto-confirmation is enabled for development
- Each user's data is completely isolated using Row Level Security (RLS)

### Data Isolation
- Products, suppliers, customers, sales, and purchases are user-specific
- Users can only view and modify their own data
- Implemented through PostgreSQL RLS policies

### Dashboard Analytics
- Real-time inventory overview
- Sales and purchase trends
- Stock status visualization
- Low stock alerts

### AI Forecasting
- Predicts future product demand
- Uses historical sales data
- Confidence scores for predictions
- Accessible via Edge Functions

## Common Issues & Solutions

### Port Already in Use
```bash
# Kill process on port 8080
npx kill-port 8080

# Or use a different port
npm run dev -- --port 3000
```

### Database Connection Errors
- Verify your `.env` file has correct Supabase credentials
- Check if Supabase project is active
- Ensure RLS policies are properly configured

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Support

- **Lovable Documentation**: [https://docs.lovable.dev/](https://docs.lovable.dev/)
- **Lovable Community**: [Discord](https://discord.com/channels/1119885301872070706/1280461670979993613)
- **Project URL**: https://lovable.dev/projects/34a3890c-f767-4f9a-8a95-56fa66f93ec8

## License

This project is created with Lovable and is available for personal and commercial use.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add your feature"`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

Built with ❤️ using [Lovable](https://lovable.dev)
