import React, { useState } from 'react';

const FarmerReports = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadReport = async (period = null, startDate = null, endDate = null) => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to download reports');
        return;
      }

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';
    let url = `${apiBaseUrl}/reports/farmer/sold-products`;
      const params = new URLSearchParams();
      
      if (period) {
        params.append('period', period);
      } else if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status} - ${text}`);
      }

      const contentType = response.headers.get('Content-Type') || '';
      if (!contentType.includes('pdf')) {
        const text = await response.text();
        throw new Error(`Unexpected content type: ${contentType}. Body: ${text}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      
      const fileName = period 
        ? `sold-products-${period}-${new Date().toISOString().split('T')[0]}.pdf`
        : `sold-products-${startDate}-to-${endDate}.pdf`;
      
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickDownload = (period) => {
    downloadReport(period);
  };

  const handleCustomDownload = () => {
    const startDate = document.getElementById('customStartDate').value;
    const endDate = document.getElementById('customEndDate').value;
    
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today
    
    if (start > today) {
      alert('Start date cannot be in the future');
      return;
    }
    
    if (end > today) {
      alert('End date cannot be in the future');
      return;
    }
    
    if (start > end) {
      alert('Start date must be before or equal to end date');
      return;
    }
    
    downloadReport(null, startDate, endDate);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <div className="p-2 bg-green-100 rounded-lg mr-3">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Sold Products Report</h2>
          <p className="text-gray-600">Generate and download aggregated sales by product</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Reports */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">Quick Reports</h3>
          
          <div className="space-y-2">
            {[
              { label: 'Last Week', period: 'week' },
              { label: 'Last Month', period: 'month' },
              { label: 'Last 3 Months', period: '3months' },
              { label: 'Last 6 Months', period: '6months' },
              { label: 'Last Year', period: 'year' }
            ].map((option) => (
              <button
                key={option.period}
                onClick={() => handleQuickDownload(option.period)}
                disabled={isGenerating}
                className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-gray-700">{option.label}</span>
                <div className="flex items-center text-green-600">
                  {isGenerating ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">Custom Date Range</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="customStartDate"
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  const endDateInput = document.getElementById('customEndDate');
                  endDateInput.min = e.target.value;
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                id="customEndDate"
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={handleCustomDownload}
              disabled={isGenerating}
              className="w-full px-4 py-3 text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{backgroundColor: '#51ac37'}}
            >
              <div className="flex items-center justify-center">
                {isGenerating ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Custom Report
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

  <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">About Sold Products Report</h3>
            <div className="mt-2 text-sm text-green-700">
              <p>Your sold products report includes:</p>
              <ul className="mt-1 list-disc list-inside">
                <li>Products you sold in the selected period</li>
                <li>Total quantity and revenue per product</li>
                <li>Average unit price</li>
                <li>Overall totals and quick stats</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerReports;