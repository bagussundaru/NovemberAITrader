'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Settings, Trash2, TestTube, Eye, EyeOff, Shield } from 'lucide-react';

interface ExchangeConfig {
  name: string;
  displayName: string;
  type: string;
  requiresPassphrase: boolean;
  supportsTestnet: boolean;
  supportedFeatures: string[];
  documentation: string;
}

interface UserApiKey {
  id: string;
  exchangeType: string;
  exchangeName: string;
  displayName: string;
  isTestnet: boolean;
  isActive: boolean;
  maxLeverage: number;
  riskPerTrade: number;
  totalTrades: number;
  totalProfit: number;
  lastUsed?: string;
  createdAt: string;
}

interface ExchangeData {
  supportedExchanges: ExchangeConfig[];
  userApiKeys: UserApiKey[];
}

export default function ExchangeManager() {
  const [exchangeData, setExchangeData] = useState<ExchangeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<ExchangeConfig | null>(null);
  const [formData, setFormData] = useState({
    exchangeType: '',
    apiKey: '',
    apiSecret: '',
    passphrase: '',
    displayName: '',
    isTestnet: true,
    maxLeverage: 10,
    riskPerTrade: 2.0
  });
  const [showSecrets, setShowSecrets] = useState<{[key: string]: boolean}>({});
  const [testingConnection, setTestingConnection] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    fetchExchangeData();
  }, []);

  const fetchExchangeData = async () => {
    try {
      const response = await fetch('/api/exchanges');
      const result = await response.json();
      
      if (result.success) {
        setExchangeData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch exchange data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/exchanges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      if (result.success) {
        setShowAddForm(false);
        setFormData({
          exchangeType: '',
          apiKey: '',
          apiSecret: '',
          passphrase: '',
          displayName: '',
          isTestnet: true,
          maxLeverage: 10,
          riskPerTrade: 2.0
        });
        fetchExchangeData();
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Failed to add API key:', error);
      alert('Failed to add API key');
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;
    
    try {
      const response = await fetch(`/api/exchanges/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        fetchExchangeData();
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
      alert('Failed to delete API key');
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingConnection(prev => ({ ...prev, [id]: true }));
    
    try {
      const response = await fetch(`/api/exchanges/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'test' }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Connection test successful!');
      } else {
        alert(`Connection test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
      alert('Failed to test connection');
    } finally {
      setTestingConnection(prev => ({ ...prev, [id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Exchange Management</h2>
          <p className="text-gray-400">Manage your exchange API keys securely</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Exchange
        </button>
      </div>

      {/* Placeholder content for now */}
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-gray-400">Exchange management functionality will be implemented here.</p>
        <p className="text-gray-500 text-sm mt-2">
          This section will allow you to add, configure, and manage your exchange API keys securely.
        </p>
      </div>
    </div>
  );
}