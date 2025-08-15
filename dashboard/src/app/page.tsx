'use client';

import { useState } from 'react';
import { 
  ChartBarIcon, 
  ComputerDesktopIcon, 
  BuildingOfficeIcon,
  PlusIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const [organizations] = useState([
    { id: 1, name: 'Acme Corp', devices: 156, status: 'active', lastActivity: '2 hours ago' },
    { id: 2, name: 'TechStart Inc', devices: 89, status: 'active', lastActivity: '1 hour ago' },
    { id: 3, name: 'Global Industries', devices: 234, status: 'active', lastActivity: '30 minutes ago' },
  ]);

  const [recentDevices] = useState([
    { id: 1, name: 'DESKTOP-ABC123', status: 'online', org: 'Acme Corp', lastCheck: '5 min ago' },
    { id: 2, name: 'LAPTOP-XYZ789', status: 'online', org: 'TechStart Inc', lastCheck: '2 min ago' },
    { id: 3, name: 'SERVER-MAIN01', status: 'offline', org: 'Global Industries', lastCheck: '1 hour ago' },
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-primary-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">GridHealth</h1>
            </div>
            <button className="btn-primary flex items-center">
              <PlusIcon className="h-5 w-5 mr-2" />
              New Organization
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Organizations</p>
                <p className="text-2xl font-semibold text-gray-900">{organizations.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ComputerDesktopIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Devices</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {organizations.reduce((sum, org) => sum + org.devices, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Online Devices</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {recentDevices.filter(d => d.status === 'online').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Organizations List */}
        <div className="card mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Organizations</h2>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                className="input-field pl-10 w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Devices
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{org.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{org.devices}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {org.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {org.lastActivity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-primary-600 hover:text-primary-900 mr-4">View</button>
                      <button className="text-gray-600 hover:text-gray-900">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Device Activity */}
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Recent Device Activity</h2>
          <div className="space-y-4">
            {recentDevices.map((device) => (
              <div key={device.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    device.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{device.name}</p>
                    <p className="text-sm text-gray-500">{device.org}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Last check: {device.lastCheck}</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    device.status === 'online' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {device.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
} 