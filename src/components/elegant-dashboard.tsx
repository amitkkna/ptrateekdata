'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Check, X, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { CampaignInvoice, CampaignInvoiceInsert } from '@/lib/database.types'
import { formatCurrency, formatDate } from '@/lib/utils'

export function ElegantDashboard() {
  const [invoices, setInvoices] = useState<CampaignInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<CampaignInvoice>>({})
  const [isAddingNew, setIsAddingNew] = useState(false)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_invoices')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = (existingCampaign?: { company: string; campaign_name: string; date_from: string; date_to: string }) => {
    const newInvoice: Partial<CampaignInvoice> = {
      id: 'temp-new',
      company: existingCampaign?.company || '',
      campaign_name: existingCampaign?.campaign_name || '',
      date_from: existingCampaign?.date_from || '',
      date_to: existingCampaign?.date_to || '',
      customer_invoice_number: '',
      customer_amount_without_tax: 0,
      customer_amount_with_tax: 0,
      customer_received_amount_without_tax: 0,
      customer_received_amount_with_tax: 0,
      customer_payment_status: 'Pending',
      customer_remarks: '',
      vendor_name: '',
      vendor_invoice_number: '',
      vendor_amount_without_tax: 0,
      vendor_amount_with_tax: 0,
      vendor_paid_amount_without_tax: 0,
      vendor_paid_amount_with_tax: 0,
      vendor_payment_status: 'Pending',
      vendor_remarks: '',
      profit: 0,
      margin: 0,
    }

    setInvoices([newInvoice as CampaignInvoice, ...invoices])
    setEditingId('temp-new')
    setEditingData(newInvoice)
    setIsAddingNew(true)
  }

  const handleEdit = (invoice: CampaignInvoice) => {
    setEditingId(invoice.id)
    setEditingData(invoice)
  }

  const handleSave = async () => {
    if (!editingId || !editingData) return

    // Basic validation
    if (!editingData.company || !editingData.campaign_name || !editingData.customer_invoice_number) {
      alert('Please fill in Company, Campaign Name, and Customer Invoice Number')
      return
    }

    try {
      const TAX_RATE = 0.18

      // Profit and margin are auto-calculated by database
      // const customerReceived = editingData.customer_received_amount_without_tax || 0
      // const vendorPaid = editingData.vendor_paid_amount_without_tax || 0
      // const profit = customerReceived - vendorPaid

      const updatedData = {
        ...editingData,
        customer_amount_with_tax: editingData.customer_amount_without_tax ?
          Math.round(editingData.customer_amount_without_tax * (1 + TAX_RATE) * 100) / 100 : 0,
        customer_received_amount_with_tax: editingData.customer_received_amount_without_tax ?
          Math.round(editingData.customer_received_amount_without_tax * (1 + TAX_RATE) * 100) / 100 : 0,
        vendor_amount_with_tax: editingData.vendor_amount_without_tax ?
          Math.round(editingData.vendor_amount_without_tax * (1 + TAX_RATE) * 100) / 100 : 0,
        vendor_paid_amount_with_tax: editingData.vendor_paid_amount_without_tax ?
          Math.round(editingData.vendor_paid_amount_without_tax * (1 + TAX_RATE) * 100) / 100 : 0,
        updated_at: new Date().toISOString(),
      }

      // Remove computed fields (profit and margin are auto-calculated by database)
      delete updatedData.profit
      delete updatedData.margin

      // Remove the temporary ID for new records
      if (isAddingNew) {
        delete updatedData.id
        console.log('Attempting to insert data:', updatedData)

        const insertData: CampaignInvoiceInsert = updatedData as CampaignInvoiceInsert

        const { data, error } = await supabase
          .from('campaign_invoices')
          .insert([insertData])
          .select()

        if (error) {
          console.error('Insert error details:', error)
          console.error('Error message:', error.message)
          console.error('Error details:', error.details)
          console.error('Error hint:', error.hint)
          console.error('Error code:', error.code)
          throw error
        }
        console.log('Successfully inserted:', data)
      } else {
        console.log('Attempting to update data:', updatedData)

        const { data, error } = await supabase
          .from('campaign_invoices')
          .update(updatedData)
          .eq('id', editingId)
          .select()

        if (error) {
          console.error('Update error details:', error)
          console.error('Error message:', error.message)
          console.error('Error details:', error.details)
          console.error('Error hint:', error.hint)
          console.error('Error code:', error.code)
          throw error
        }
        console.log('Successfully updated:', data)
      }

      setEditingId(null)
      setEditingData({})
      setIsAddingNew(false)
      await fetchInvoices()
    } catch (error) {
      console.error('Error saving invoice:', error)
      alert('Error saving invoice. Please check the console for details.')
    }
  }

  const handleCancel = () => {
    if (isAddingNew) {
      // Remove the temporary row
      setInvoices(invoices.filter(inv => inv.id !== 'temp-new'))
    }
    setEditingId(null)
    setEditingData({})
    setIsAddingNew(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return

    try {
      const { error } = await supabase
        .from('campaign_invoices')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchInvoices()
    } catch (error) {
      console.error('Error deleting invoice:', error)
    }
  }

  const handleFieldChange = (field: keyof CampaignInvoice, value: string | number) => {
    setEditingData(prev => ({ ...prev, [field]: value }))
  }

  // Group invoices by campaign
  const groupedCampaigns = invoices.reduce((acc, invoice) => {
    const key = `${invoice.company}-${invoice.campaign_name}`
    if (!acc[key]) {
      acc[key] = {
        company: invoice.company,
        campaign_name: invoice.campaign_name,
        date_from: invoice.date_from,
        date_to: invoice.date_to,
        invoices: [],
        totalCustomerRevenue: 0,
        totalVendorExpense: 0,
        totalProfit: 0,
        totalMargin: 0,
      }
    }
    acc[key].invoices.push(invoice)
    acc[key].totalCustomerRevenue += invoice.customer_received_amount_without_tax || 0
    acc[key].totalVendorExpense += invoice.vendor_paid_amount_without_tax || 0
    acc[key].totalProfit = acc[key].totalCustomerRevenue - acc[key].totalVendorExpense
    acc[key].totalMargin = acc[key].totalCustomerRevenue > 0 ?
      (acc[key].totalProfit / acc[key].totalCustomerRevenue) * 100 : 0
    return acc
  }, {} as Record<string, {
    company: string;
    campaign_name: string;
    date_from: string;
    date_to: string;
    invoices: CampaignInvoice[];
    totalCustomerRevenue: number;
    totalVendorExpense: number;
    totalProfit: number;
    totalMargin: number;
  }>)

  const campaigns = Object.values(groupedCampaigns)

  // Calculate consolidated totals
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.customer_received_amount_without_tax || 0), 0)
  const totalExpenses = invoices.reduce((sum, inv) => sum + (inv.vendor_paid_amount_without_tax || 0), 0)
  const totalProfit = totalRevenue - totalExpenses
  const totalMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  // Track expanded campaigns
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())

  const toggleCampaign = (campaignKey: string) => {
    const newExpanded = new Set(expandedCampaigns)
    if (newExpanded.has(campaignKey)) {
      newExpanded.delete(campaignKey)
    } else {
      newExpanded.add(campaignKey)
    }
    setExpandedCampaigns(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Campaign Profitability Tracker</h1>
          <div className="flex gap-3">
            <Button
              onClick={() => handleAddNew()}
              disabled={editingId !== null}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Campaign Invoice
            </Button>
            {editingId && (
              <>
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                  Save
                </Button>
                <Button onClick={handleCancel} variant="outline">
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Consolidated Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-sm text-gray-600">Total Revenue</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-sm text-gray-600">Total Expenses</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-sm text-gray-600">Total Profit</div>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalProfit)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-sm text-gray-600">Overall Margin</div>
            <div className={`text-2xl font-bold ${totalMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalMargin.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date<br/>(From - To)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-green-700 uppercase bg-green-50">💰 Customer Invoice<br/><span className="normal-case">(Money In)</span></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-green-700 uppercase bg-green-50">Customer Amount<br/><span className="normal-case">(W/T & With Tax)</span></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-green-700 uppercase bg-green-50">Customer Payment<br/><span className="normal-case">(Received & Status)</span></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase bg-red-50">🏢 Vendor Expense<br/><span className="normal-case">(Money Out)</span></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-red-700 uppercase bg-red-50">Vendor Payment<br/><span className="normal-case">(Status)</span></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-700 uppercase bg-blue-50">📊 Profit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-700 uppercase bg-blue-50">📈 Margin</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaigns.map((campaign) => {
                  const campaignKey = `${campaign.company}-${campaign.campaign_name}`
                  const isExpanded = expandedCampaigns.has(campaignKey)

                  return (
                    <React.Fragment key={campaignKey}>
                      {/* Campaign Summary Row */}
                      <tr className="bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => toggleCampaign(campaignKey)}>
                        <td className="px-4 py-3 text-sm font-medium">
                          <div className="flex items-center">
                            {isExpanded ? <ChevronDown className="w-4 h-4 mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
                            {campaign.company}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{campaign.campaign_name}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="text-xs">
                            {formatDate(campaign.date_from)}<br/>
                            {formatDate(campaign.date_to)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm bg-green-50 font-medium">
                          {campaign.invoices.length} Invoice{campaign.invoices.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-4 py-3 text-sm bg-green-50 font-medium">
                          {formatCurrency(campaign.totalCustomerRevenue)}
                        </td>
                        <td className="px-4 py-3 text-sm bg-green-50"></td>
                        <td className="px-4 py-3 text-sm bg-red-50 font-medium">
                          {formatCurrency(campaign.totalVendorExpense)}
                        </td>
                        <td className="px-4 py-3 text-sm bg-red-50"></td>
                        <td className="px-4 py-3 text-sm"></td>
                        <td className="px-4 py-3 text-sm bg-blue-50 font-medium">
                          <span className={campaign.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(campaign.totalProfit)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm bg-blue-50 font-medium">
                          <span className={campaign.totalMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {campaign.totalMargin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddNew(campaign)
                            }}
                            className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700"
                            title="Add invoice to this campaign"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>

                      {/* Individual Invoice Rows (when expanded) */}
                      {isExpanded && campaign.invoices.map((invoice, invoiceIndex) => {
                        const isEditing = editingId === invoice.id
                        const currentData = isEditing ? editingData : invoice

                  return (
                    <tr key={`${campaignKey}-invoice-${invoice.id}-${invoiceIndex}`} className={`${isEditing ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                      {/* Company */}
                      <td className="px-4 py-3 text-sm">
                        {isEditing ? (
                          <Input
                            value={currentData.company || ''}
                            onChange={(e) => handleFieldChange('company', e.target.value)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <span className="font-medium">{invoice.company}</span>
                        )}
                      </td>

                      {/* Campaign Name */}
                      <td className="px-4 py-3 text-sm">
                        {isEditing ? (
                          <Input
                            value={currentData.campaign_name || ''}
                            onChange={(e) => handleFieldChange('campaign_name', e.target.value)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <span>{invoice.campaign_name}</span>
                        )}
                      </td>

                      {/* Date Range */}
                      <td className="px-4 py-3 text-sm">
                        {isEditing ? (
                          <div className="space-y-1">
                            <Input
                              type="date"
                              value={currentData.date_from || ''}
                              onChange={(e) => handleFieldChange('date_from', e.target.value)}
                              className="h-8 text-xs"
                            />
                            <Input
                              type="date"
                              value={currentData.date_to || ''}
                              onChange={(e) => handleFieldChange('date_to', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        ) : (
                          <div className="text-xs">
                            {formatDate(invoice.date_from)}<br/>
                            {formatDate(invoice.date_to)}
                          </div>
                        )}
                      </td>

                      {/* Customer Invoice */}
                      <td className="px-4 py-3 text-sm bg-green-50">
                        {isEditing ? (
                          <Input
                            value={currentData.customer_invoice_number || ''}
                            onChange={(e) => handleFieldChange('customer_invoice_number', e.target.value)}
                            className="h-8 text-sm"
                            placeholder="Invoice #"
                          />
                        ) : (
                          <span className="font-medium">#{invoice.customer_invoice_number}</span>
                        )}
                      </td>

                      {/* Customer Amount */}
                      <td className="px-4 py-3 text-sm bg-green-50">
                        {isEditing ? (
                          <div className="space-y-1">
                            <div className="text-xs text-gray-600">W/T:</div>
                            <Input
                              type="number"
                              value={currentData.customer_amount_without_tax || ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0
                                handleFieldChange('customer_amount_without_tax', value)
                                handleFieldChange('customer_amount_with_tax', Math.round(value * 1.18 * 100) / 100)
                              }}
                              className="h-8 text-xs"
                              step="0.01"
                            />
                            <div className="text-xs text-gray-600">Tax: {formatCurrency(currentData.customer_amount_with_tax || 0)}</div>
                          </div>
                        ) : (
                          <div className="text-xs">
                            <div>W/T: {formatCurrency(invoice.customer_amount_without_tax)}</div>
                            <div>Tax: {formatCurrency(invoice.customer_amount_with_tax)}</div>
                          </div>
                        )}
                      </td>

                      {/* Customer Payment */}
                      <td className="px-4 py-3 text-sm bg-green-50">
                        {isEditing ? (
                          <div className="space-y-1">
                            <div className="text-xs text-gray-600">Received:</div>
                            <Input
                              type="number"
                              value={currentData.customer_received_amount_without_tax || ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0
                                handleFieldChange('customer_received_amount_without_tax', value)
                                handleFieldChange('customer_received_amount_with_tax', Math.round(value * 1.18 * 100) / 100)
                              }}
                              className="h-8 text-xs"
                              step="0.01"
                            />
                            <select
                              value={currentData.customer_payment_status || 'Pending'}
                              onChange={(e) => handleFieldChange('customer_payment_status', e.target.value)}
                              className="w-full h-8 text-xs border rounded px-2"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Partial">Partial</option>
                              <option value="Clear">Clear</option>
                            </select>
                          </div>
                        ) : (
                          <div className="text-xs">
                            <div>Received: {formatCurrency(invoice.customer_received_amount_without_tax)}</div>
                            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              invoice.customer_payment_status === 'Clear' ? 'bg-green-100 text-green-800' :
                              invoice.customer_payment_status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {invoice.customer_payment_status}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Vendor Expense */}
                      <td className="px-4 py-3 text-sm bg-red-50">
                        {isEditing ? (
                          <div className="space-y-1">
                            <Input
                              value={currentData.vendor_name || ''}
                              onChange={(e) => handleFieldChange('vendor_name', e.target.value)}
                              className="h-8 text-xs"
                              placeholder="Vendor name"
                            />
                            <Input
                              value={currentData.vendor_invoice_number || ''}
                              onChange={(e) => handleFieldChange('vendor_invoice_number', e.target.value)}
                              className="h-8 text-xs"
                              placeholder="Invoice #"
                            />
                            <div className="text-xs text-gray-600">Paid:</div>
                            <Input
                              type="number"
                              value={currentData.vendor_paid_amount_without_tax || ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0
                                handleFieldChange('vendor_paid_amount_without_tax', value)
                                handleFieldChange('vendor_paid_amount_with_tax', Math.round(value * 1.18 * 100) / 100)
                              }}
                              className="h-8 text-xs"
                              step="0.01"
                            />
                          </div>
                        ) : (
                          <div className="text-xs">
                            <div className="font-medium">{invoice.vendor_name || 'N/A'}</div>
                            <div>#{invoice.vendor_invoice_number || 'N/A'}</div>
                            <div>Paid: {formatCurrency(invoice.vendor_paid_amount_without_tax)}</div>
                          </div>
                        )}
                      </td>

                      {/* Vendor Payment Status */}
                      <td className="px-4 py-3 text-sm bg-red-50">
                        {isEditing ? (
                          <select
                            value={currentData.vendor_payment_status || 'Pending'}
                            onChange={(e) => handleFieldChange('vendor_payment_status', e.target.value)}
                            className="w-full h-8 text-xs border rounded px-2"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Partial">Partial</option>
                            <option value="Clear">Clear</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            invoice.vendor_payment_status === 'Clear' ? 'bg-green-100 text-green-800' :
                            invoice.vendor_payment_status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {invoice.vendor_payment_status}
                          </span>
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="px-4 py-3 text-sm">
                        {isEditing ? (
                          <div className="space-y-1">
                            <Input
                              value={currentData.customer_remarks || ''}
                              onChange={(e) => handleFieldChange('customer_remarks', e.target.value)}
                              className="h-8 text-xs"
                              placeholder="Customer remarks"
                            />
                            <Input
                              value={currentData.vendor_remarks || ''}
                              onChange={(e) => handleFieldChange('vendor_remarks', e.target.value)}
                              className="h-8 text-xs"
                              placeholder="Vendor remarks"
                            />
                          </div>
                        ) : (
                          <div className="text-xs">
                            <div>{invoice.customer_remarks}</div>
                            <div className="text-gray-400">{invoice.vendor_remarks}</div>
                          </div>
                        )}
                      </td>

                      {/* Profit */}
                      <td className="px-4 py-3 text-sm bg-blue-50">
                        <span className={`font-medium ${invoice.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(invoice.profit)}
                        </span>
                      </td>

                      {/* Margin */}
                      <td className="px-4 py-3 text-sm bg-blue-50">
                        <span className={`font-medium ${invoice.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {invoice.margin.toFixed(1)}%
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-sm">
                        {isEditing ? (
                          <div className="flex space-x-1">
                            <Button size="sm" onClick={handleSave} className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700">
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" onClick={handleCancel} variant="outline" className="h-8 w-8 p-0">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              onClick={() => handleEdit(invoice)}
                              variant="outline"
                              className="h-8 w-8 p-0"
                              disabled={editingId !== null}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDelete(invoice.id)}
                              variant="destructive"
                              className="h-8 w-8 p-0"
                              disabled={editingId !== null}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {invoices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No campaigns found. Add your first campaign to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
