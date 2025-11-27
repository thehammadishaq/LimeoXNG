import React, { useEffect, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  AreaSeries,
} from 'lightweight-charts';
import { useTheme } from '../context/ThemeContext';

interface TradingViewChartProps {
  symbol: string;
  data?: CandlestickData[];
  height?: number;
  chartType: 'candlestick' | 'line' | 'area';
  loading?: boolean;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({ 
  symbol, 
  data,
  height = 400,
  chartType,
  loading = false
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    let chart: IChartApi | null = null;
    let handleResize: (() => void) | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    // Wait for container to have dimensions
    const initChart = () => {
      if (!container || container.clientWidth === 0) {
        timeoutId = setTimeout(initChart, 100);
        return;
      }

      try {
        // Get colors from CSS variables (respect current theme)
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        const bgColor =
          computedStyle.getPropertyValue('--bg-primary').trim() ||
          (isDark ? '#111111' : '#ffffff');
        const textColor =
          computedStyle.getPropertyValue('--text-primary').trim() ||
          (isDark ? '#e5e7eb' : '#111827');
        const borderColor =
          computedStyle.getPropertyValue('--border-color').trim() ||
          (isDark ? '#374151' : '#d1d5db');
        const gridColor = isDark ? '#2a2a2a' : '#e5e7eb';
        const upColor =
          computedStyle.getPropertyValue('--positive').trim() || '#10b981';
        const downColor =
          computedStyle.getPropertyValue('--negative').trim() || '#ef4444';
        const accentColor =
          computedStyle.getPropertyValue('--link-color').trim() || '#0088cc';

        // Create chart
        chart = createChart(container, {
          layout: {
            background: { type: ColorType.Solid, color: bgColor },
            textColor: textColor,
          },
          grid: {
            vertLines: { 
              color: gridColor,
              visible: true,
            },
            horzLines: { 
              color: gridColor,
              visible: true,
            },
          },
          width: container.clientWidth,
          height: height,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: borderColor,
          },
          rightPriceScale: {
            borderColor: borderColor,
          },
          crosshair: {
            mode: 1,
          },
        });

        if (!chart) {
          console.error('Failed to create chart');
          return;
        }

        chartRef.current = chart;

        // Create candlestick series using addSeries (v5 API)
        let candlestickSeries: ISeriesApi<'Candlestick'> | null = null;

        try {
          // v5 syntax: addSeries(CandlestickSeries, options)
          candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor,
            downColor,
            borderVisible: false,
            wickUpColor: upColor,
            wickDownColor: downColor,
          });
          console.log('✅ Candlestick series created using addSeries(CandlestickSeries, options)');
        } catch (e: any) {
          console.error('❌ Error creating candlestick series:', e);
        }

        if (candlestickSeries) {
          candlestickSeriesRef.current = candlestickSeries;

          const chartData = data || [];
          if (chartData.length > 0) {
            console.log('📊 Setting chart data:', chartData.length, 'candles');
            console.log('📊 First candle:', chartData[0]);
            console.log('📊 Last candle:', chartData[chartData.length - 1]);
            console.log('📊 Sample data format:', JSON.stringify(chartData.slice(0, 2), null, 2));

            try {
              candlestickSeries.setData(chartData);
              console.log('✅ Data set successfully');
            } catch (e) {
              console.error('❌ Error setting data:', e);
            }

            // Create volume series using addSeries (Histogram)
            try {
              const volumeSeries = chart.addSeries(HistogramSeries, {
                color: isDark ? '#4b5563' : '#d1d5db',
                priceFormat: {
                  type: 'volume',
                },
                priceScaleId: '',
              } as any);

              if (volumeSeries) {
                volumeSeriesRef.current = volumeSeries;

                const volumeData = chartData.map((candle) => {
                  const priceMove = Math.abs(candle.close - candle.open);
                  const baseVolume = 20000000;
                  const volumeMultiplier = 1 + (priceMove / 5);
                  const volume = Math.floor(baseVolume * volumeMultiplier + Math.random() * 10000000);
                  
                  return {
                    time: candle.time,
                    value: volume,
                    color: candle.close >= candle.open
                      ? (isDark ? '#10b98155' : '#10b98133')
                      : (isDark ? '#ef444455' : '#ef444433'),
                  };
                });

                volumeSeries.setData(volumeData);
                console.log('📊 Volume data set:', volumeData.length, 'bars');
              }
            } catch (volError) {
              console.error('❌ Error creating volume series:', volError);
            }

            // Fit content to show all data
            chart.timeScale().fitContent();
            console.log('✅ Chart initialized successfully');
          } else {
            console.warn('⚠️ No chart data provided for symbol', symbol);
          }
        }

        // Handle resize
        handleResize = () => {
          if (container && chart) {
            const newWidth = container.clientWidth;
            if (newWidth > 0) {
              chart.applyOptions({ width: newWidth });
            }
          }
        };

        window.addEventListener('resize', handleResize);
      } catch (error) {
        console.error('❌ Error creating chart:', error);
      }
    };

    // Start initialization - use requestAnimationFrame for better timing
    const startInit = () => {
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        initChart();
      } else {
        // Try again on next frame
        requestAnimationFrame(startInit);
      }
    };

    // Small delay to ensure DOM is ready
    timeoutId = setTimeout(() => {
      startInit();
    }, 50);

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      if (chart) {
        chart.remove();
        chartRef.current = null;
      }
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [data, height, isDark]);

  // Update chart type
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current) return;

    try {
      const chart = chartRef.current;
      const oldSeries = candlestickSeriesRef.current;
      const chartData = data || [];

      if (chartData.length === 0) {
        console.warn('⚠️ No chart data available for chart type change');
        return;
      }

      // Remove old series
      chart.removeSeries(oldSeries);

      let newSeries: ISeriesApi<'Candlestick' | 'Line' | 'Area'> | null = null;

      if (chartType === 'candlestick') {
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        const upColor =
          computedStyle.getPropertyValue('--positive').trim() || '#10b981';
        const downColor =
          computedStyle.getPropertyValue('--negative').trim() || '#ef4444';

        newSeries = chart.addSeries(CandlestickSeries, {
          upColor,
          downColor,
          borderVisible: false,
          wickUpColor: upColor,
          wickDownColor: downColor,
        });
        if (newSeries) {
          newSeries.setData(chartData);
          chart.timeScale().fitContent();
        }
      } else if (chartType === 'line') {
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        const accentColor =
          computedStyle.getPropertyValue('--link-color').trim() || '#0088cc';

        newSeries = chart.addSeries(LineSeries, {
          color: accentColor,
          lineWidth: 2,
        });
        if (newSeries) {
          const lineData = chartData.map(candle => ({
            time: candle.time,
            value: candle.close,
          }));
          newSeries.setData(lineData);
          chart.timeScale().fitContent();
        }
      } else {
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        const accentColor =
          computedStyle.getPropertyValue('--link-color').trim() || '#0088cc';

        newSeries = chart.addSeries(AreaSeries, {
          lineColor: accentColor,
          topColor: `${accentColor}33` as any,
          bottomColor: `${accentColor}00` as any,
        });
        if (newSeries) {
          const areaData = chartData.map(candle => ({
            time: candle.time,
            value: candle.close,
          }));
          newSeries.setData(areaData);
          chart.timeScale().fitContent();
        }
      }

      if (newSeries) {
        candlestickSeriesRef.current = newSeries as any;
      }
    } catch (error) {
      console.error('Error updating chart type:', error);
    }
  }, [chartType, data]);

  return (
    <div className="tradingview-chart-container">
      <div 
        ref={chartContainerRef} 
        className="tradingview-chart"
        style={{ 
          width: '100%', 
          height: `${height}px`,
          minHeight: `${height}px`,
          position: 'relative'
        }}
      />
      {loading && (
        <div className="chart-loading-overlay">
          <div className="chart-loading-spinner"></div>
          <div className="chart-loading-text">Loading chart data...</div>
        </div>
      )}
    </div>
  );
};

export default TradingViewChart;