import { createChart, ColorType } from 'lightweight-charts';

// Create the chart
const chartContainer = document.getElementById('chart-container');

if (!chartContainer) {
    throw new Error('Chart container not found');
}

const chart = createChart(chartContainer, {
    width: chartContainer.clientWidth,
    height: 600,
    layout: {
        background: { type: ColorType.Solid, color: '#1e1e1e' },
        textColor: '#d1d4dc',
    },
    grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#363C4E' },
    },
});

// Create a candlestick series
const candlestickSeries = chart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
});

// Function to fetch stock data
async function fetchStockData(symbol: string) {
    try {
        console.log(`Fetching data for ${symbol}...`);
        
        // Using Alpha Vantage free API
        const apiKey = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;
        
        if (!apiKey) {
            throw new Error('API key not found. Please set VITE_ALPHA_VANTAGE_API_KEY in your .env file');
        }
        
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data['Time Series (Daily)']) {
            const timeSeries = data['Time Series (Daily)'];
            const chartData = Object.keys(timeSeries).map(date => ({
                time: date,
                open: parseFloat(timeSeries[date]['1. open']),
                high: parseFloat(timeSeries[date]['2. high']),
                low: parseFloat(timeSeries[date]['3. low']),
                close: parseFloat(timeSeries[date]['4. close']),
            })).reverse(); // Reverse to get chronological order
            
            candlestickSeries.setData(chartData);
            console.log('Chart loaded successfully!');
        } else {
            console.error('Error fetching data:', data);
            alert('Error loading data. Check console for details.');
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

// Load chart button
const loadButton = document.getElementById('load-chart');
if (loadButton) {
    loadButton.addEventListener('click', () => {
        fetchStockData('AAPL');
    });
}

console.log('App initialized. Click the button to load chart data.');