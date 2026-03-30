import React from 'react';

const ViewToggle = ({ view, setView }) => {
  const views = [
    { id: 'day', label: 'Day', icon: '📅' },
    { id: 'custom', label: 'Custom', icon: '⚙️' }
  ];
  
  return (
    <div className="flex space-x-2 mb-6">
      {views.map(v => (
        <button
          key={v.id}
          onClick={() => setView(v.id)}
          className={`px-4 py-2 rounded-lg font-medium transition flex items-center ${
            view === v.id
              ? 'bg-red-600 text-white shadow-md'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span className="mr-2">{v.icon}</span>
          {v.label}
        </button>
      ))}
    </div>
  );
};

export default ViewToggle;
