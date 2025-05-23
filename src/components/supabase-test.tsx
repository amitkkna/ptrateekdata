'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing')
  const [error, setError] = useState<string>('')
  const [tableExists, setTableExists] = useState<boolean>(false)
  const [sampleData, setSampleData] = useState<any[]>([])

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      console.log('Testing Supabase connection...')
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Supabase Key (first 20 chars):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...')

      // Test 1: Basic connection
      const { data: healthCheck, error: healthError } = await supabase
        .from('campaign_invoices')
        .select('count')
        .limit(1)

      if (healthError) {
        console.error('Health check error:', healthError)
        if (healthError.message.includes('relation "campaign_invoices" does not exist')) {
          setError('Table "campaign_invoices" does not exist. Please run the database schema.')
          setTableExists(false)
        } else {
          setError(`Connection error: ${healthError.message}`)
        }
        setConnectionStatus('error')
        return
      }

      console.log('Health check passed')
      setTableExists(true)

      // Test 2: Fetch sample data
      const { data, error: fetchError } = await supabase
        .from('campaign_invoices')
        .select('*')
        .limit(5)

      if (fetchError) {
        console.error('Fetch error:', fetchError)
        setError(`Data fetch error: ${fetchError.message}`)
        setConnectionStatus('error')
        return
      }

      console.log('Sample data:', data)
      setSampleData(data || [])
      setConnectionStatus('connected')

    } catch (err) {
      console.error('Unexpected error:', err)
      setError(`Unexpected error: ${err}`)
      setConnectionStatus('error')
    }
  }

  const createSampleData = async () => {
    try {
      const sampleInvoice = {
        company: 'Test Company',
        campaign_name: 'Test Campaign',
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        customer_invoice_number: 'TEST-001',
        customer_amount_without_tax: 10000,
        customer_amount_with_tax: 11800,
        customer_received_amount_without_tax: 10000,
        customer_received_amount_with_tax: 11800,
        customer_payment_status: 'Paid',
        vendor_name: 'Test Vendor',
        vendor_paid_amount_without_tax: 7000,
        vendor_paid_amount_with_tax: 8260,
        vendor_payment_status: 'Paid'
      }

      const { data, error } = await supabase
        .from('campaign_invoices')
        .insert([sampleInvoice])
        .select()

      if (error) {
        console.error('Insert error:', error)
        setError(`Insert error: ${error.message}`)
        return
      }

      console.log('Sample data created:', data)
      testConnection() // Refresh the test
    } catch (err) {
      console.error('Create sample error:', err)
      setError(`Create sample error: ${err}`)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔧 Supabase Connection Test</h1>
      
      <div className="space-y-4">
        {/* Connection Status */}
        <div className={`p-4 rounded-lg ${
          connectionStatus === 'testing' ? 'bg-yellow-100 border-yellow-300' :
          connectionStatus === 'connected' ? 'bg-green-100 border-green-300' :
          'bg-red-100 border-red-300'
        } border`}>
          <h2 className="font-semibold mb-2">Connection Status</h2>
          {connectionStatus === 'testing' && <p>🔄 Testing connection...</p>}
          {connectionStatus === 'connected' && <p>✅ Connected successfully!</p>}
          {connectionStatus === 'error' && (
            <div>
              <p>❌ Connection failed</p>
              <p className="text-red-600 mt-2">{error}</p>
            </div>
          )}
        </div>

        {/* Environment Variables */}
        <div className="p-4 bg-gray-100 rounded-lg">
          <h2 className="font-semibold mb-2">Environment Variables</h2>
          <p><strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}</p>
          <p><strong>Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...' : 
            'Not set'
          }</p>
        </div>

        {/* Table Status */}
        <div className="p-4 bg-blue-100 rounded-lg">
          <h2 className="font-semibold mb-2">Database Table</h2>
          <p>Table "campaign_invoices" exists: {tableExists ? '✅ Yes' : '❌ No'}</p>
          {!tableExists && (
            <div className="mt-2 p-3 bg-yellow-50 rounded border">
              <p className="font-medium">⚠️ Database schema not found</p>
              <p className="text-sm mt-1">Please run the SQL from database-schema.sql in your Supabase SQL Editor</p>
            </div>
          )}
        </div>

        {/* Sample Data */}
        {connectionStatus === 'connected' && (
          <div className="p-4 bg-green-50 rounded-lg">
            <h2 className="font-semibold mb-2">Sample Data ({sampleData.length} records)</h2>
            {sampleData.length === 0 ? (
              <div>
                <p>No data found in the table.</p>
                <button 
                  onClick={createSampleData}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create Sample Data
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Company</th>
                      <th className="text-left p-2">Campaign</th>
                      <th className="text-left p-2">Customer Amount</th>
                      <th className="text-left p-2">Vendor Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleData.map((row, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{row.company}</td>
                        <td className="p-2">{row.campaign_name}</td>
                        <td className="p-2">₹{row.customer_amount_without_tax?.toLocaleString()}</td>
                        <td className="p-2">₹{row.vendor_paid_amount_without_tax?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button 
            onClick={testConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Test Again
          </button>
          
          {connectionStatus === 'connected' && (
            <a 
              href="/"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              ✅ Go to Dashboard
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
