'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Users, Building2, TrendingUp, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { CampaignWithInvoices, Campaign, CustomerInvoice, VendorInvoice } from '@/lib/database.types'
import { formatCurrency, formatDate } from '@/lib/utils'

export function CampaignDashboardV2() {
  const [campaigns, setCampaigns] = useState<CampaignWithInvoices[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithInvoices | null>(null)

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      // Fetch campaigns with their invoices
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })

      if (campaignsError) throw campaignsError

      // Fetch customer invoices
      const { data: customerInvoices, error: customerError } = await supabase
        .from('customer_invoices')
        .select('*')

      if (customerError) throw customerError

      // Fetch vendor invoices
      const { data: vendorInvoices, error: vendorError } = await supabase
        .from('vendor_invoices')
        .select('*')

      if (vendorError) throw vendorError

      // Combine data and calculate totals
      const campaignsWithInvoices: CampaignWithInvoices[] = (campaignsData || []).map(campaign => {
        const customerInvs = (customerInvoices || []).filter(inv => inv.campaign_id === campaign.id)
        const vendorInvs = (vendorInvoices || []).filter(inv => inv.campaign_id === campaign.id)
        
        const total_revenue = customerInvs.reduce((sum, inv) => sum + inv.received_amount_without_tax, 0)
        const total_expenses = vendorInvs.reduce((sum, inv) => sum + inv.paid_amount_without_tax, 0)
        const profit = total_revenue - total_expenses
        const margin = total_revenue > 0 ? (profit / total_revenue) * 100 : 0

        return {
          ...campaign,
          customer_invoices: customerInvs,
          vendor_invoices: vendorInvs,
          total_revenue,
          total_expenses,
          profit,
          margin
        }
      })

      setCampaigns(campaignsWithInvoices)
      if (campaignsWithInvoices.length > 0 && !selectedCampaign) {
        setSelectedCampaign(campaignsWithInvoices[0])
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Campaign Profitability Tracker</h1>
        <div className="flex gap-2">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Campaign
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">Campaigns</h2>
            <div className="space-y-2">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCampaign?.id === campaign.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedCampaign(campaign)}
                >
                  <div className="font-medium">{campaign.campaign_name}</div>
                  <div className="text-sm text-gray-600">{campaign.company}</div>
                  <div className="text-sm text-gray-500">
                    {formatDate(campaign.date_from)} - {formatDate(campaign.date_to)}
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className={`text-sm font-medium ${
                      campaign.profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      Profit: {formatCurrency(campaign.profit)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {campaign.margin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Campaign Details */}
        <div className="lg:col-span-2">
          {selectedCampaign ? (
            <div className="space-y-6">
              {/* Campaign Summary */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">{selectedCampaign.campaign_name}</h2>
                    <p className="text-gray-600">{selectedCampaign.company}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(selectedCampaign.date_from)} - {formatDate(selectedCampaign.date_to)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="w-5 h-5 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-green-800">Revenue</span>
                    </div>
                    <div className="text-lg font-bold text-green-900">
                      {formatCurrency(selectedCampaign.total_revenue)}
                    </div>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Building2 className="w-5 h-5 text-red-600 mr-2" />
                      <span className="text-sm font-medium text-red-800">Expenses</span>
                    </div>
                    <div className="text-lg font-bold text-red-900">
                      {formatCurrency(selectedCampaign.total_expenses)}
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-lg ${
                    selectedCampaign.profit >= 0 ? 'bg-blue-50' : 'bg-orange-50'
                  }`}>
                    <div className="flex items-center">
                      <TrendingUp className={`w-5 h-5 mr-2 ${
                        selectedCampaign.profit >= 0 ? 'text-blue-600' : 'text-orange-600'
                      }`} />
                      <span className={`text-sm font-medium ${
                        selectedCampaign.profit >= 0 ? 'text-blue-800' : 'text-orange-800'
                      }`}>Profit</span>
                    </div>
                    <div className={`text-lg font-bold ${
                      selectedCampaign.profit >= 0 ? 'text-blue-900' : 'text-orange-900'
                    }`}>
                      {formatCurrency(selectedCampaign.profit)}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-purple-600 mr-2" />
                      <span className="text-sm font-medium text-purple-800">Margin</span>
                    </div>
                    <div className="text-lg font-bold text-purple-900">
                      {selectedCampaign.margin.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Invoices */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-green-800">
                      💰 Customer Invoices (Revenue)
                    </h3>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Customer Invoice
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-green-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase">Invoice #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase">Received</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedCampaign.customer_invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{invoice.customer_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{invoice.invoice_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{formatDate(invoice.invoice_date)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <div>{formatCurrency(invoice.amount_without_tax)}</div>
                            <div className="text-xs text-gray-400">+Tax: {formatCurrency(invoice.amount_with_tax)}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <div className="font-medium">{formatCurrency(invoice.received_amount_without_tax)}</div>
                            <div className="text-xs text-gray-400">+Tax: {formatCurrency(invoice.received_amount_with_tax)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              invoice.payment_status === 'Clear' 
                                ? 'bg-green-100 text-green-800'
                                : invoice.payment_status === 'Pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {invoice.payment_status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex space-x-1">
                              <Button variant="outline" size="sm">
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Vendor Invoices */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-red-800">
                      🏢 Vendor Invoices (Expenses)
                    </h3>
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Vendor Invoice
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-red-800 uppercase">Vendor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-red-800 uppercase">Invoice #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-red-800 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-red-800 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-red-800 uppercase">Paid</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-red-800 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-red-800 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedCampaign.vendor_invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{invoice.vendor_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{invoice.invoice_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{formatDate(invoice.invoice_date)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <div>{formatCurrency(invoice.amount_without_tax)}</div>
                            <div className="text-xs text-gray-400">+Tax: {formatCurrency(invoice.amount_with_tax)}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <div className="font-medium">{formatCurrency(invoice.paid_amount_without_tax)}</div>
                            <div className="text-xs text-gray-400">+Tax: {formatCurrency(invoice.paid_amount_with_tax)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              invoice.payment_status === 'Clear' 
                                ? 'bg-green-100 text-green-800'
                                : invoice.payment_status === 'Pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {invoice.payment_status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex space-x-1">
                              <Button variant="outline" size="sm">
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Select a campaign to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
