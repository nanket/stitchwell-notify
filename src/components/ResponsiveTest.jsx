import React from 'react';

const ResponsiveTest = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Responsive Test</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="bg-blue-100 p-4 rounded">Column 1</div>
        <div className="bg-green-100 p-4 rounded">Column 2</div>
        <div className="bg-yellow-100 p-4 rounded">Column 3</div>
        <div className="bg-red-100 p-4 rounded">Column 4</div>
      </div>
    </div>
  );
};

export default ResponsiveTest;