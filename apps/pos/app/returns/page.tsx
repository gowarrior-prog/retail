'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ReturnsHeader from '@/components/returns/ReturnsHeader';
import ReturnsMetricsCards from '@/components/returns/ReturnsMetricsCards';
import ReturnsTableFilters from '@/components/returns/ReturnsTableFilters';
import CustomerReturnsTable, { CustomerReturnRecord } from '@/components/returns/CustomerReturnsTable';
import SupplierReturnsTable, { SupplierReturnRecord } from '@/components/returns/SupplierReturnsTable';
import ReturnWorkflowDrawer from '@/components/returns/ReturnWorkflowDrawer';
import ReturnDetailModal from '@/components/returns/ReturnDetailModal';
import DeleteConfirmModal from '@/components/inventory/DeleteConfirmModal';
import { showCatalogToast } from '@/lib/toast';
import { fetchBillingHistory, deleteCustomerReturn, deleteSupplierReturn } from '@/lib/api';

export default function ReturnsManagementPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'restocked' | 'damaged'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  const [customerRecords, setCustomerRecords] = useState<CustomerReturnRecord[]>([]);
  const [supplierRecords, setSupplierRecords] = useState<SupplierReturnRecord[]>([]);
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<{ record: any; type: 'customer' | 'supplier' } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'customer' | 'supplier'; code: string } | null>(null);

  const loadReturns = React.useCallback(async () => {
    try {
      const { fetchCustomerReturns, fetchSupplierReturns } = await import('@/lib/api');
      const [custRets, suppRets, bills] = await Promise.all([
        fetchCustomerReturns().catch(() => []),
        fetchSupplierReturns().catch(() => []),
        fetchBillingHistory().catch(() => []),
      ]);

      let cList: CustomerReturnRecord[] = [];
      if (Array.isArray(custRets) && custRets.length > 0) {
        cList = custRets.map((r: any) => ({
          id: r.id,
          return_code: r.return_code || 'RET-001',
          date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today',
          customer_name: r.customer_name || 'Customer',
          customer_phone: r.customer_phone || '',
          original_invoice: r.original_invoice || 'N/A',
          returned_items: (() => { try { const items = JSON.parse(r.items_json || '[]'); return items.map((i: any) => `${i.quantity}x ${i.product_name || i.name}`).join(', '); } catch { return 'Returned Items'; } })(),
          total_value: Number(r.total_value || 0),
          refund_type: r.refund_type || 'Cash Refund',
          condition: r.condition || 'Restocked',
          status: r.status || 'Completed',
        }));
      }

      if (cList.length === 0 && Array.isArray(bills)) {
        const returnBills = bills.filter((b: any) => 
          b.invoice_number?.startsWith('RET-') || 
          b.payment_mode?.startsWith('REFUND')
        );
        if (returnBills.length > 0) {
          cList = returnBills.map((b: any) => ({
            id: b.id,
            return_code: b.invoice_number || 'RET-UNKNOWN',
            date: b.billing_date || b.created_at || 'N/A',
            customer_name: b.customer_phone?.replace('REFUND-', '') || 'Customer',
            customer_phone: b.customer_phone || '',
            original_invoice: b.customer_phone?.replace('REFUND-', '') || '',
            returned_items: (() => { try { const items = JSON.parse(b.item_details_json || '[]'); return items.map((i: any) => `${i.quantity}x ${i.product_name}`).join(', '); } catch { return 'Items'; } })(),
            total_value: Math.abs(b.total_amount || 0),
            refund_type: b.payment_mode || 'Refund',
            condition: 'Restocked',
            status: 'Completed',
          }));
        }
      }

      let sList: SupplierReturnRecord[] = [];
      if (Array.isArray(suppRets) && suppRets.length > 0) {
        sList = suppRets.map((r: any) => ({
          id: r.id,
          return_code: r.return_code || 'SRET-001',
          date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today',
          supplier_name: r.supplier_name || 'Wholesaler',
          purchase_bill: r.purchase_bill || 'BILL-INTAKE',
          items_returned: (() => { try { const items = JSON.parse(r.items_json || '[]'); return items.map((i: any) => `${i.product_name || i.name}`).join(', '); } catch { return r.reason || 'Defective Stock Intake'; } })(),
          total_value: Number(r.total_value || 0),
          settlement_status: 'Ledgers Synced',
          reason: r.reason || 'Defective Fabric',
          status: r.status || 'Completed',
        }));
      }

      setCustomerRecords(cList);
      setSupplierRecords(sList);
    } catch (err) {
      console.error('Returns API fetch notice:', err);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    loadReturns();

    const handleLiveUpdate = () => loadReturns();
    window.addEventListener('pos-data-updated', handleLiveUpdate);
    return () => window.removeEventListener('pos-data-updated', handleLiveUpdate);
  }, [loadReturns]);

  const filteredCustomer = useMemo(() => {
    return customerRecords.filter((rec) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!rec.return_code?.toLowerCase().includes(q) &&
            !rec.customer_name?.toLowerCase().includes(q) &&
            !rec.original_invoice?.toLowerCase().includes(q)) return false;
      }
      if (statusFilter === 'completed' && rec.status !== 'Completed') return false;
      if (statusFilter === 'pending' && rec.status !== 'Pending Settlement') return false;
      if (statusFilter === 'restocked' && rec.condition !== 'Restocked') return false;
      if (statusFilter === 'damaged' && rec.condition !== 'Damaged') return false;
      return true;
    });
  }, [customerRecords, searchQuery, statusFilter]);

  const filteredSupplier = useMemo(() => {
    return supplierRecords.filter((rec) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!rec.return_code?.toLowerCase().includes(q) &&
            !rec.supplier_name?.toLowerCase().includes(q) &&
            !rec.purchase_bill?.toLowerCase().includes(q)) return false;
      }
      if (statusFilter === 'completed' && rec.status !== 'Completed') return false;
      if (statusFilter === 'pending' && rec.status !== 'Pending Settlement') return false;
      return true;
    });
  }, [supplierRecords, searchQuery, statusFilter]);

  const metrics = useMemo(() => {
    const totalCustomerVal = customerRecords.reduce((sum, r) => sum + (r.total_value || 0), 0);
    const totalSupplierVal = supplierRecords.reduce((sum, r) => sum + (r.total_value || 0), 0);
    const pendingTotalVal = customerRecords
      .filter(r => r.status === 'Pending Settlement')
      .reduce((sum, r) => sum + r.total_value, 0);
    const damagedCount = customerRecords.filter(r => r.condition === 'Damaged').length;

    const currentTabRecords = activeTab === 'customer' ? customerRecords : supplierRecords;
    return {
      totalCustomerVal,
      totalCustomerCount: customerRecords.length,
      totalSupplierVal,
      totalSupplierCount: supplierRecords.length,
      pendingTotalVal,
      damagedCount,
      countAll: currentTabRecords.length,
      countCompleted: currentTabRecords.filter(r => r.status === 'Completed').length,
      countPending: currentTabRecords.filter(r => r.status === 'Pending Settlement').length,
      countRestocked: activeTab === 'customer' ? customerRecords.filter(r => r.condition === 'Restocked').length : 0,
      countDamaged: activeTab === 'customer' ? customerRecords.filter(r => r.condition === 'Damaged').length : supplierRecords.length,
    };
  }, [customerRecords, supplierRecords, activeTab]);

  const paginatedCustomer = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCustomer.slice(start, start + PAGE_SIZE);
  }, [filteredCustomer, currentPage]);

  const paginatedSupplier = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSupplier.slice(start, start + PAGE_SIZE);
  }, [filteredSupplier, currentPage]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    try {
      if (target.type === 'customer') {
        await deleteCustomerReturn(target.id);
        if (target.code) await deleteCustomerReturn(target.code);
        setCustomerRecords(prev => prev.filter(r => r.id !== target.id));
      } else {
        await deleteSupplierReturn(target.id);
        if (target.code) await deleteSupplierReturn(target.code);
        setSupplierRecords(prev => prev.filter(r => r.id !== target.id));
      }
    } catch (e) {
      console.warn('Error deleting return record from database:', e);
    }

    showCatalogToast(`Record ${target.code} deleted`, 'delete');
    window.dispatchEvent(new Event('pos-data-updated'));
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#f8fafc] text-slate-400 font-sans text-xs min-h-[400px]">
        Loading Returns & Exchanges Management...
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full p-4 pb-10 space-y-4 font-sans bg-[#f8fafc] min-h-full">
      <ReturnsHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        customerCount={customerRecords.length}
        supplierCount={supplierRecords.length}
        onOpenWorkflow={() => setIsWorkflowOpen(true)}
      />

      <ReturnsMetricsCards
        totalCustomerVal={metrics.totalCustomerVal}
        totalCustomerCount={metrics.totalCustomerCount}
        totalSupplierVal={metrics.totalSupplierVal}
        totalSupplierCount={metrics.totalSupplierCount}
        pendingTotalVal={metrics.pendingTotalVal}
        countPending={metrics.countPending}
        damagedCount={metrics.damagedCount}
      />

      <ReturnsTableFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onFilterChange={setStatusFilter}
        countAll={metrics.countAll}
        countCompleted={metrics.countCompleted}
        countPending={metrics.countPending}
        countRestocked={metrics.countRestocked}
        countDamaged={metrics.countDamaged}
      />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
        {activeTab === 'customer' ? (
          <CustomerReturnsTable
            records={paginatedCustomer}
            onSelectDetail={(rec) => setSelectedDetailRecord({ record: rec, type: 'customer' })}
            onDeleteRecord={(id, code) => setDeleteTarget({ id, type: 'customer', code })}
          />
        ) : (
          <SupplierReturnsTable
            records={paginatedSupplier}
            onSelectDetail={(rec) => setSelectedDetailRecord({ record: rec, type: 'supplier' })}
            onDeleteRecord={(id, code) => setDeleteTarget({ id, type: 'supplier', code })}
          />
        )}
      </div>

      <ReturnWorkflowDrawer
        isOpen={isWorkflowOpen}
        onClose={() => setIsWorkflowOpen(false)}
        onAddCustomerReturn={(rec) => setCustomerRecords(prev => [rec, ...prev])}
        onAddSupplierReturn={(rec) => setSupplierRecords(prev => [rec, ...prev])}
      />

      <ReturnDetailModal
        recordData={selectedDetailRecord}
        onClose={() => setSelectedDetailRecord(null)}
      />

      {deleteTarget && (
        <DeleteConfirmModal
          productName={`Return Record ${deleteTarget.code}`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}