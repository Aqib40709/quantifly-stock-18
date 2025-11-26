import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Exponential Smoothing forecasting
function exponentialSmoothing(data: number[], alpha = 0.3): number {
  if (data.length === 0) return 0;
  
  let smoothed = data[0];
  for (let i = 1; i < data.length; i++) {
    smoothed = alpha * data[i] + (1 - alpha) * smoothed;
  }
  
  // Forecast next value using the smoothed trend
  const trend = (data[data.length - 1] - data[0]) / data.length;
  return Math.max(0, Math.round(smoothed + trend));
}

// Linear Regression for trend analysis
function linearRegression(data: number[]): { slope: number; intercept: number; prediction: number } {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0, prediction: 0 };
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const prediction = Math.max(0, Math.round(slope * n + intercept));
  
  return { slope, intercept, prediction };
}

// Seasonal decomposition (simple weekly pattern)
function detectSeasonality(sales: any[]): number {
  if (sales.length < 14) return 1;
  
  const weeklyAverages: number[] = [];
  for (let i = 0; i < Math.min(4, Math.floor(sales.length / 7)); i++) {
    const weekStart = i * 7;
    const weekData = sales.slice(weekStart, weekStart + 7);
    const weekAvg = weekData.reduce((sum, s) => sum + s.quantity, 0) / weekData.length;
    weeklyAverages.push(weekAvg);
  }
  
  if (weeklyAverages.length < 2) return 1;
  
  const trend = (weeklyAverages[weeklyAverages.length - 1] - weeklyAverages[0]) / weeklyAverages.length;
  const seasonalityFactor = 1 + (trend * 4); // Project 4 weeks ahead
  
  return Math.max(0.5, Math.min(2, seasonalityFactor));
}

// Advanced confidence scoring using multiple metrics
function calculateAdvancedConfidence(data: number[], prediction: number): number {
  if (data.length === 0) return 0.5;
  
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  
  // Coefficient of variation (lower is better)
  const cv = mean > 0 ? stdDev / mean : 1;
  
  // Data consistency score (0-1)
  const consistencyScore = Math.max(0, 1 - cv);
  
  // Prediction reasonableness (how close to recent average)
  const recentAvg = data.slice(-7).reduce((sum, val) => sum + val, 0) / Math.min(7, data.length);
  const predictionDeviation = Math.abs(prediction - recentAvg) / (recentAvg || 1);
  const reasonablenessScore = Math.max(0, 1 - predictionDeviation / 2);
  
  // Data volume score (more data = higher confidence)
  const volumeScore = Math.min(1, data.length / 30);
  
  // Combined confidence score
  const confidence = (consistencyScore * 0.4 + reasonablenessScore * 0.4 + volumeScore * 0.2);
  
  return Math.max(0.3, Math.min(0.95, confidence));
}

// Hybrid forecasting model combining multiple methods
function hybridForecast(sales: any[]): { prediction: number; confidence: number } {
  if (sales.length === 0) return { prediction: 0, confidence: 0.3 };
  
  // Sort sales by date
  sales.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const dailyQuantities: number[] = [];
  const salesMap = new Map<string, number>();
  
  // Aggregate by day
  sales.forEach(sale => {
    const date = new Date(sale.date).toISOString().split('T')[0];
    salesMap.set(date, (salesMap.get(date) || 0) + sale.quantity);
  });
  
  // Fill missing days with 0
  const startDate = new Date(sales[0].date);
  const endDate = new Date(sales[sales.length - 1].date);
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  for (let i = 0; i <= daysDiff; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];
    dailyQuantities.push(salesMap.get(dateStr) || 0);
  }
  
  // Apply multiple forecasting methods
  const esPredict = exponentialSmoothing(dailyQuantities);
  const lrResult = linearRegression(dailyQuantities);
  const seasonalityFactor = detectSeasonality(sales);
  
  // Moving average for stability
  const recentData = dailyQuantities.slice(-14);
  const movingAvg = recentData.reduce((sum, val) => sum + val, 0) / recentData.length;
  
  // Weighted ensemble prediction
  let prediction = (
    esPredict * 0.3 +           // Exponential smoothing
    lrResult.prediction * 0.3 + // Linear regression
    movingAvg * 0.4             // Moving average
  ) * seasonalityFactor;
  
  // Scale to 30-day forecast
  prediction = Math.round(prediction * 30);
  
  const confidence = calculateAdvancedConfidence(dailyQuantities, prediction);
  
  return { prediction: Math.max(0, prediction), confidence };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch historical sales data (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: salesData, error: salesError } = await supabase
      .from("sales_items")
      .select(`
        product_id,
        quantity,
        sales!inner(sale_date),
        products(name, reorder_level)
      `)
      .gte("sales.sale_date", ninetyDaysAgo.toISOString());

    if (salesError) throw salesError;

    if (!salesData || salesData.length === 0) {
      return new Response(
        JSON.stringify({ error: "No historical sales data available" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group sales by product
    const productSales: any = {};
    salesData.forEach((item: any) => {
      const productId = item.product_id;
      if (!productSales[productId]) {
        productSales[productId] = {
          name: item.products?.name || 'Unknown',
          reorder_level: item.products?.reorder_level || 10,
          sales: [],
        };
      }
      productSales[productId].sales.push({
        date: item.sales.sale_date,
        quantity: item.quantity,
      });
    });

    // Generate forecasts for each product using hybrid ML model
    const forecasts = [];
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    for (const [productId, data] of Object.entries(productSales)) {
      const productData = data as any;
      
      // Apply hybrid forecasting
      const { prediction, confidence } = hybridForecast(productData.sales);

      // Optionally enhance with AI for complex patterns
      let finalPrediction = prediction;
      let finalConfidence = confidence;
      
      if (lovableApiKey && productData.sales.length > 20) {
        try {
          const recentSales = productData.sales.slice(-21).map((s: any) => s.quantity);
          const prompt = `Analyze sales pattern for "${productData.name}":
Recent 21-day sales: ${recentSales.join(', ')}
ML Model prediction (30-day): ${prediction} units
Confidence: ${(confidence * 100).toFixed(0)}%

Consider trends, seasonality, anomalies. Return JSON: {"prediction": number, "reasoning": "brief explanation"}`;

          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [{ role: 'user', content: prompt }],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices[0]?.message?.content.trim();
            const jsonMatch = content.match(/\{[^}]+\}/);
            
            if (jsonMatch) {
              const aiResult = JSON.parse(jsonMatch[0]);
              if (aiResult.prediction > 0 && !isNaN(aiResult.prediction)) {
                // Blend AI prediction with ML prediction (70% ML, 30% AI for stability)
                finalPrediction = Math.round(prediction * 0.7 + aiResult.prediction * 0.3);
                finalConfidence = Math.min(0.95, confidence * 1.1); // Slight confidence boost
                console.log(`AI enhanced prediction for ${productData.name}: ${aiResult.reasoning}`);
              }
            }
          }
        } catch (error) {
          console.error('AI enhancement failed, using ML prediction:', error);
        }
      }

      forecasts.push({
        product_id: productId,
        predicted_demand: finalPrediction,
        confidence_score: finalConfidence,
        forecast_date: thirtyDaysFromNow.toISOString(),
      });
    }

    // Store forecasts in database
    const { error: insertError } = await supabase
      .from("demand_forecasts")
      .insert(forecasts);

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ 
        success: true,
        forecasts_generated: forecasts.length,
        message: 'Advanced ML forecasts generated successfully',
        methods_used: 'Exponential Smoothing, Linear Regression, Seasonal Decomposition, AI Enhancement'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating forecast:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
