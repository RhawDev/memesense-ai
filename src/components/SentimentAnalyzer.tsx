
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AlertTriangle, TrendingUp, TrendingDown, Activity, RefreshCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type SentimentData = {
  period: string;
  value: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  tokens_launched: number;
  tokens_over_100k: number;
  tokens_over_1m: number;
  profitable_tokens_percent: number;
};

// Mock data in case the API call fails
const mockSentimentData = {
  sentiment24h: {
    period: '24h',
    value: 75,
    sentiment: 'bullish' as 'bullish',
    tokens_launched: 42,
    tokens_over_100k: 18,
    tokens_over_1m: 8,
    profitable_tokens_percent: 65
  },
  sentiment7d: {
    period: '7d',
    value: 62,
    sentiment: 'bullish' as 'bullish',
    tokens_launched: 124,
    tokens_over_100k: 58,
    tokens_over_1m: 22,
    profitable_tokens_percent: 52
  },
  sentiment30d: {
    period: '30d',
    value: 48,
    sentiment: 'neutral' as 'neutral',
    tokens_launched: 380,
    tokens_over_100k: 160,
    tokens_over_1m: 65,
    profitable_tokens_percent: 43
  }
};

const SentimentAnalyzer: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sentimentData, setSentimentData] = useState<{
    sentiment?: SentimentData;
    sentiment24h?: SentimentData;
    sentiment7d?: SentimentData;
    sentiment30d?: SentimentData;
  }>({});
  
  useEffect(() => {
    fetchSentimentData(timeframe);
  }, [timeframe]);

  const fetchSentimentData = async (period: '24h' | '7d' | '30d') => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching sentiment data for period: ${period}`);
      
      const { data, error } = await supabase.functions.invoke('analyze-market', {
        body: {
          timeframe: period,
          queryType: 'marketSentiment'
        }
      });
      
      if (error) {
        console.error("Supabase function error:", error);
        throw new Error(error.message || "Failed to fetch market data");
      }
      
      if (data.error) {
        console.error("Data error:", data.error);
        throw new Error(data.error);
      }
      
      console.log("Received sentiment data:", data);
      
      // If we get valid data, use it
      if (data && (data.sentiment || data.sentiment24h || data.sentiment7d || data.sentiment30d)) {
        setSentimentData(data);
      } else {
        console.warn("Invalid sentiment data format, using mock data");
        // If the data format is unexpected, use mock data
        setSentimentData({
          sentiment: mockSentimentData[`sentiment${period}` as keyof typeof mockSentimentData],
          sentiment24h: mockSentimentData.sentiment24h,
          sentiment7d: mockSentimentData.sentiment7d,
          sentiment30d: mockSentimentData.sentiment30d
        });
        
        toast.warning("Using simulated market data. Connect APIs for live data.");
      }
    } catch (err: any) {
      console.error("Error fetching sentiment data:", err);
      setError(err.message || "Failed to fetch market sentiment");
      
      // In case of error, use mock data
      setSentimentData({
        sentiment: mockSentimentData[`sentiment${period}` as keyof typeof mockSentimentData],
        sentiment24h: mockSentimentData.sentiment24h,
        sentiment7d: mockSentimentData.sentiment7d,
        sentiment30d: mockSentimentData.sentiment30d
      });
      
      toast.error(`Error loading market data: ${err.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create chart data from available periods
  const getChartData = () => {
    const chartData = [];
    
    if (sentimentData.sentiment24h) {
      chartData.push({
        name: '24h',
        sentiment: sentimentData.sentiment24h.value,
      });
    }
    
    if (sentimentData.sentiment7d) {
      chartData.push({
        name: '7d',
        sentiment: sentimentData.sentiment7d.value,
      });
    }
    
    if (sentimentData.sentiment30d) {
      chartData.push({
        name: '30d',
        sentiment: sentimentData.sentiment30d.value,
      });
    }
    
    return chartData;
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'bullish': return 'bg-green-500 text-green-50';
      case 'bearish': return 'bg-red-500 text-red-50';
      default: return 'bg-blue-500 text-blue-50';
    }
  };
  
  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'bullish': return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'bearish': return <TrendingDown className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5 text-blue-500" />;
    }
  };

  // Get the current sentiment based on the selected timeframe
  const currentSentiment = sentimentData.sentiment || 
                          (timeframe === '24h' ? sentimentData.sentiment24h : 
                           timeframe === '7d' ? sentimentData.sentiment7d : 
                           sentimentData.sentiment30d);

  return (
    <Card className="glass-card w-full overflow-hidden">
      <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-500" />
            Solana Market Sentiment
          </CardTitle>
          {!isLoading && currentSentiment && (
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getSentimentColor(currentSentiment.sentiment)}>
                {currentSentiment.sentiment.toUpperCase()}
              </Badge>
              <span className="text-gray-400 text-sm">Score: {currentSentiment.value}/100</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Button 
            variant={timeframe === '24h' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setTimeframe('24h')}
            className={timeframe === '24h' ? 'bg-indigo-500 hover:bg-indigo-600' : 'hover:bg-white/5'}
          >
            24h
          </Button>
          <Button 
            variant={timeframe === '7d' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setTimeframe('7d')}
            className={timeframe === '7d' ? 'bg-indigo-500 hover:bg-indigo-600' : 'hover:bg-white/5'}
          >
            7d
          </Button>
          <Button 
            variant={timeframe === '30d' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setTimeframe('30d')}
            className={timeframe === '30d' ? 'bg-indigo-500 hover:bg-indigo-600' : 'hover:bg-white/5'}
          >
            30d
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => fetchSentimentData(timeframe)}
            className="ml-2"
            title="Refresh data"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <Spinner className="text-indigo-500 mx-auto mb-4" />
              <p className="text-gray-400">Loading sentiment data...</p>
            </div>
          </div>
        ) : error && !currentSentiment ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-xl font-medium mb-2">Data Fetch Error</h3>
            <p className="text-gray-400 max-w-md mx-auto">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchSentimentData(timeframe)}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        ) : currentSentiment ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Tokens Launched</div>
                <div className="text-2xl font-bold">{currentSentiment.tokens_launched}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Tokens &gt;$100K Cap</div>
                <div className="text-2xl font-bold">{currentSentiment.tokens_over_100k}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Tokens &gt;$1M Cap</div>
                <div className="text-2xl font-bold">{currentSentiment.tokens_over_1m}</div>
              </div>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#999" />
                  <YAxis domain={[0, 100]} stroke="#999" />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Sentiment Score']}
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #444',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="sentiment" 
                    name="Market Sentiment" 
                    stroke="#8884d8" 
                    strokeWidth={2} 
                    dot={false} 
                    activeDot={{ r: 6, fill: '#8884d8', strokeWidth: 0 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-6">
              <div className="flex items-center mb-2">
                {getSentimentIcon(currentSentiment.sentiment)}
                <h3 className="text-lg font-medium ml-2">Market Insights</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Profitable Projects</div>
                  <div className="flex items-end gap-2">
                    <span className="text-xl font-bold">
                      {currentSentiment.profitable_tokens_percent}%
                    </span>
                    <span className="text-sm text-gray-400">of projects are profitable</span>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Market Status</div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      currentSentiment.sentiment === 'bullish' ? 'bg-green-500' :
                      currentSentiment.sentiment === 'bearish' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`}></div>
                    <span className="text-lg capitalize">
                      {currentSentiment.sentiment === 'bullish' ? 'Bullish Market' :
                       currentSentiment.sentiment === 'bearish' ? 'Bearish Market' :
                       'Neutral Market'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-400">No sentiment data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SentimentAnalyzer;
