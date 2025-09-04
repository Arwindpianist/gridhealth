import React from 'react'

export default function TestDeviceDetailsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Device Details Test</h1>
        
        <div className="bg-dark-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test Instructions</h2>
          <ol className="text-gray-300 space-y-2">
            <li>1. Navigate to the dashboard</li>
            <li>2. Click on any device to view its details</li>
            <li>3. Check that the health metrics breakdown shows accurate individual scores</li>
            <li>4. Verify that Performance, Disk, Memory, Network, Services, and Security scores are not all 0/100</li>
            <li>5. The overall health score should be consistent with the individual scores</li>
          </ol>
        </div>

        <div className="bg-dark-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Expected Results</h2>
          <div className="text-gray-300 space-y-2">
            <p>✅ Individual health scores should be realistic values (not all 0/100)</p>
            <p>✅ Performance score should be based on CPU and memory usage</p>
            <p>✅ Disk score should be based on disk usage</p>
            <p>✅ Memory score should be based on memory usage</p>
            <p>✅ Network score should be 100 for connected devices, 0 for offline</p>
            <p>✅ Services score should be 80-100 for online devices</p>
            <p>✅ Security score should be 70-100 for online devices</p>
            <p>✅ Overall health score should be a weighted average of individual scores</p>
          </div>
        </div>

        <div className="mt-8">
          <a 
            href="/dashboard" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
