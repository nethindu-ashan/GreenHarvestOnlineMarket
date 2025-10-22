import React from 'react';

const SeasonalPicks = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Seasonal Picks</h1>
        <p className="text-gray-600 mb-6">Discover curated products that are fresh and in season right now. This is a placeholder page – you can enhance it later with dynamic filters, tags, or a backend endpoint for seasonal items.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Placeholder cards */}
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white shadow rounded-lg p-4 border border-gray-100">
              <div className="h-40 bg-gradient-to-br from-green-100 to-green-200 rounded mb-3 flex items-center justify-center text-green-700 font-semibold text-xl">
                Item {i}
              </div>
              <h2 className="font-semibold text-gray-800 mb-1">Seasonal Product {i}</h2>
              <p className="text-sm text-gray-600 mb-2">Short description about why it's seasonal.</p>
              <button className="w-full py-2 text-sm font-medium rounded text-white" style={{backgroundColor:'#51ac37'}}>
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SeasonalPicks;
