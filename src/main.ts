import * as LightweightCharts from 'lightweight-charts';

// Create the chart
const chartContainer = document.getElementById('chart-container');

if (!chartContainer) {
    throw new Error('Chart container not found');
}

console.log('Creating chart...');

const chart = LightweightCharts.createChart(chartContainer, {
    width: chartContainer.clientWidth,
    height: 600,
    layout: {
        background: { type: LightweightCharts.ColorType.Solid, color: '#1e1e1e' },
        textColor: '#d1d4dc',
    },
    grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#363C4E' },
    },
});

console.log('Chart created:', chart);

// Create a candlestick series
// const candlestickSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
//     upColor: '#26a69a',
//     downColor: '#ef5350',
//     borderVisible: false,
//     wickUpColor: '#26a69a',
//     wickDownColor: '#ef5350',
// });

// Step line series
const solidLineSeries = chart.addSeries(LightweightCharts.LineSeries, {
    lineStyle: LightweightCharts.LineStyle.Solid,
    color: '#800080',
    lineWidth: 2,
    title: 'Asset Price',
});


// Create EMA line series
const emaLineSeries = chart.addSeries(LightweightCharts.LineSeries, {
    color: '#2962FF',
    lineWidth: 2,
    title: 'EMA 125',
});

// Create series for buy signals (green dots)
const buySignalSeries = chart.addSeries(LightweightCharts.LineSeries, {
    color: '#26a69a',
    lineVisible: false,
    pointMarkersVisible: true,
    crosshairMarkerVisible: true,
    crosshairMarkerRadius: 8,
    lastValueVisible: false,
    priceLineVisible: false,
});

// Create series for sell signals (red dots)
const sellSignalSeries = chart.addSeries(LightweightCharts.LineSeries, {
    color: '#ef5350',
    lineVisible: false,
    pointMarkersVisible: true,
    crosshairMarkerVisible: true,
    crosshairMarkerRadius: 8,
    lastValueVisible: false,
    priceLineVisible: false,
});

// Function to calculate EMA
function calculateEMA(data: any[], period: number) {
    const ema = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for the first value
    let sum = 0;
    for (let i = 0; i < period && i < data.length; i++) {
        sum += data[i].close;
    }
    let emaValue = sum / period;
    ema.push({ time: data[period - 1].time, value: emaValue });
    
    // Calculate EMA for remaining values
    for (let i = period; i < data.length; i++) {
        emaValue = (data[i].close - emaValue) * multiplier + emaValue;
        ema.push({ time: data[i].time, value: emaValue });
    }
    
    return ema;
}

// Function to detect crossovers with tolerance
function detectCrossovers(data: any[], emaData: any[], tolerance: number = 0.05) {
    const signals: any[] = [];
    let lastState: 'above' | 'below' | 'neutral' = 'neutral';
    
    for (let i = 0; i < data.length; i++) {
        const currentPrice = data[i].close;
        const currentEmaValue = emaData.find((e: any) => e.time === data[i].time)?.value;
        
        if (!currentEmaValue) continue;
        
        const upperBand = currentEmaValue * (1 + tolerance);
        const lowerBand = currentEmaValue * (1 - tolerance);
        
        // Determine current state
        let currentState: 'above' | 'below' | 'neutral' = 'neutral';
        if (currentPrice > upperBand) {
            currentState = 'above';
        } else if (currentPrice < lowerBand) {
            currentState = 'below';
        } else {
            currentState = lastState; // Maintain previous state in neutral zone
        }
        
        // Detect crossovers based on state change
        if (lastState === 'below' && currentState === 'above') {
            signals.push({
                time: data[i].time,
                type: 'bullish',
                price: currentPrice
            });
        } else if (lastState === 'above' && currentState === 'below') {
            signals.push({
                time: data[i].time,
                type: 'bearish',
                price: currentPrice
            });
        }
        
        // Update state for next iteration
        if (currentState !== 'neutral') {
            lastState = currentState;
        }
    }
    
    return signals;
}

// Function to fetch stock data
async function fetchStockData(symbol: string) {
    try {
        console.log(`Fetching data for ${symbol}...`);
        
        // Update page title
        const titleElement = document.getElementById('chart-title');
        if (titleElement) {
            titleElement.textContent = `${symbol} - Trading Chart`;
        }
        document.title = `${symbol} Chart`;
        
        // Using Twelve Data API (free tier: 800 requests/day, no credit card required)
        // Get your free API key from: https://twelvedata.com/pricing
        const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY;
        
        const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=5000&apikey=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.values && Array.isArray(data.values)) {
            const chartData = data.values.map((item: any) => ({
                time: item.datetime,
                value: parseFloat(item.close), // Use 'value' for line series instead of OHLC
            })).reverse(); // Reverse to get chronological order
            
            solidLineSeries.setData(chartData);
            
            // Calculate and display EMA 125
            const emaData = calculateEMA(
                data.values.map((item: any) => ({
                    time: item.datetime,
                    close: parseFloat(item.close),
                })).reverse(),
                125
            );
            emaLineSeries.setData(emaData);
            
            // Detect and display crossovers
            const chartDataWithClose = data.values.map((item: any) => ({
                time: item.datetime,
                close: parseFloat(item.close),
            })).reverse();
            const signals = detectCrossovers(chartDataWithClose, emaData, 0.05);
            
            // Separate buy and sell signals for visual markers
            const buySignals = signals
                .filter(s => s.type === 'bullish')
                .map(s => ({ time: s.time, value: s.price }));
            const sellSignals = signals
                .filter(s => s.type === 'bearish')
                .map(s => ({ time: s.time, value: s.price }));
            
            // Display signals on chart
            buySignalSeries.setData(buySignals);
            sellSignalSeries.setData(sellSignals);
            
            // Log crossover signals to console
            console.log('Chart loaded successfully!');
            console.log(`Found ${signals.length} crossover signals:`);
            signals.forEach(signal => {
                const date = new Date(signal.time).toLocaleDateString();
                const type = signal.type === 'bullish' ? '🟢 BUY' : '🔴 SELL';
                console.log(`${date}: ${type} at $${signal.price.toFixed(2)}`);
            });
        } else {
            console.error('Error fetching data:', data);
            alert(`Error loading data: ${data.message || 'Unknown error'}. Check console for details.`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to fetch stock data');
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    chart.applyOptions({ 
        width: chartContainer.clientWidth 
    });
});

// Add tooltip functionality
const tooltip = document.getElementById('tooltip');
if (tooltip) {
    chart.subscribeCrosshairMove((param) => {
        if (!param.time || param.point === undefined || param.point.x < 0 || param.point.y < 0) {
            tooltip.style.display = 'none';
            return;
        }

        // Get values for all series at the current time
        const priceData = param.seriesData.get(solidLineSeries) as any;
        const emaData = param.seriesData.get(emaLineSeries) as any;
        const buyData = param.seriesData.get(buySignalSeries) as any;
        const sellData = param.seriesData.get(sellSignalSeries) as any;

        // Build tooltip content
        let tooltipContent = '';
        
        // Format date
        const date = new Date(param.time as string);
        tooltipContent += `<div><strong>${date.toLocaleDateString()}</strong></div>`;
        
        // Add price if available
        if (priceData && priceData.value !== undefined) {
            tooltipContent += `<div><span class="tooltip-label tooltip-price">Price:</span>$${priceData.value.toFixed(2)}</div>`;
        }
        
        // Add EMA if available
        if (emaData && emaData.value !== undefined) {
            tooltipContent += `<div><span class="tooltip-label tooltip-ema">EMA 125:</span>$${emaData.value.toFixed(2)}</div>`;
        }
        
        // Add buy signal if available
        if (buyData && buyData.value !== undefined) {
            tooltipContent += `<div><span class="tooltip-label tooltip-buy">● BUY Signal:</span>$${buyData.value.toFixed(2)}</div>`;
        }
        
        // Add sell signal if available
        if (sellData && sellData.value !== undefined) {
            tooltipContent += `<div><span class="tooltip-label tooltip-sell">● SELL Signal:</span>$${sellData.value.toFixed(2)}</div>`;
        }

        tooltip.innerHTML = tooltipContent;
        tooltip.style.display = 'block';

        // Position tooltip
        const coordinate = solidLineSeries.priceToCoordinate(priceData?.value ?? emaData?.value ?? 0);
        let left = param.point.x + 15;
        let top = (coordinate ?? param.point.y) - 10;

        // Adjust position if tooltip would go off screen
        const tooltipWidth = tooltip.offsetWidth;
        const tooltipHeight = tooltip.offsetHeight;
        const containerRect = chartContainer.getBoundingClientRect();

        if (left + tooltipWidth > containerRect.width) {
            left = param.point.x - tooltipWidth - 15;
        }
        
        if (top + tooltipHeight > containerRect.height) {
            top = containerRect.height - tooltipHeight - 10;
        }
        
        if (top < 0) {
            top = 10;
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    });
}

// Load chart automatically on page load
fetchStockData('TQQQ');