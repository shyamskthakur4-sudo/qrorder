import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  AlertTriangle,
  Search,
  Truck,
  ArrowUpDown,
  CheckCircle2,
  DollarSign,
  Layers,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { InventoryItem } from '../types';
import { formatCurrency, generateUUID } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';

export const InventoryPage: React.FC = () => {
  const { activeBusiness, activeBranch, inventory, updateInventoryStock } = useBusiness();
  const { success, error, info } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'ADD' | 'WASTAGE'>('ADD');

  // New ingredient form modal
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState<InventoryItem['unit']>('kg');
  const [currentStock, setCurrentStock] = useState('10');
  const [minimumStock, setMinimumStock] = useState('3');
  const [unitCost, setUnitCost] = useState('150');
  const [supplierName, setSupplierName] = useState('');

  const filteredInventory = inventory.filter((item) => {
    return (
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.supplier_name && item.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const lowStockCount = inventory.filter((i) => i.current_stock <= i.minimum_stock).length;

  const handleStockAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !adjustQty) return;
    const qtyNum = parseFloat(adjustQty);
    const delta = adjustType === 'ADD' ? qtyNum : -qtyNum;

    updateInventoryStock(selectedItem.id, delta);
    success(
      'Inventory Updated',
      `${selectedItem.name} adjusted by ${delta > 0 ? '+' : ''}${delta} ${selectedItem.unit}.`
    );
    setIsStockModalOpen(false);
    setAdjustQty('');
  };

  const handleCreateIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem: InventoryItem = {
      id: generateUUID(),
      business_id: activeBusiness.id,
      branch_id: activeBranch.id,
      name: name.trim(),
      sku: sku.trim() || undefined,
      unit,
      current_stock: parseFloat(currentStock) || 0,
      minimum_stock: parseFloat(minimumStock) || 0,
      unit_cost: parseFloat(unitCost) || 0,
      supplier_name: supplierName.trim() || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    inventory.push(newItem);
    success('Ingredient Added', `"${newItem.name}" added to stock ledger.`);
    setName('');
    setSku('');
    setIsNewItemModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 font-['Outfit']">
            Raw Inventory & Bill of Materials
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Ingredient stock tracking, automatic recipe deduction, minimum threshold alerts, and supplier procurement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lowStockCount > 0 && (
            <div className="px-3.5 py-1.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>{lowStockCount} Low Stock Alerts</span>
            </div>
          )}

          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsNewItemModalOpen(true)}
          >
            Add Ingredient / Stock
          </Button>
        </div>
      </div>

      {/* Search & Overview */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ingredient name, SKU, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="text-xs text-slate-400">
          Showing <strong className="text-slate-200">{filteredInventory.length}</strong> items in{' '}
          <strong className="text-amber-400">{activeBranch.name}</strong>
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 bg-slate-900/60">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Ingredient / Item</th>
                <th className="py-3.5 px-4 font-semibold">SKU</th>
                <th className="py-3.5 px-4 font-semibold">Current Stock</th>
                <th className="py-3.5 px-4 font-semibold">Min Threshold</th>
                <th className="py-3.5 px-4 font-semibold">Unit Cost</th>
                <th className="py-3.5 px-4 font-semibold">Supplier</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInventory.map((item) => {
                const isLow = item.current_stock <= item.minimum_stock;
                return (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-100">{item.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{item.sku || '—'}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-sm">
                      <span className={isLow ? 'text-rose-400' : 'text-slate-100'}>
                        {item.current_stock}
                      </span>{' '}
                      <span className="text-[10px] text-slate-400 font-normal">{item.unit}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {item.minimum_stock} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-200">
                      {formatCurrency(item.unit_cost, 'INR', '₹')}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{item.supplier_name || 'General'}</td>
                    <td className="py-3.5 px-4">
                      {isLow ? (
                        <Badge variant="danger" dot>
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="success" dot>
                          Adequate
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedItem(item);
                          setIsStockModalOpen(true);
                        }}
                        className="text-xs py-1"
                      >
                        Adjust Stock
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title={`Adjust Stock: ${selectedItem?.name}`}
        description={`Current balance: ${selectedItem?.current_stock} ${selectedItem?.unit}`}
        maxWidth="sm"
      >
        <form onSubmit={handleStockAdjust} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAdjustType('ADD')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                adjustType === 'ADD'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              + Stock Delivery (Purchase)
            </button>
            <button
              type="button"
              onClick={() => setAdjustType('WASTAGE')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                adjustType === 'WASTAGE'
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              - Wastage / Spoilage
            </button>
          </div>

          <Input
            label={`Quantity to ${adjustType === 'ADD' ? 'Add' : 'Deduct'} (${selectedItem?.unit})`}
            type="number"
            step="0.01"
            placeholder="5.0"
            value={adjustQty}
            onChange={(e) => setAdjustQty(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsStockModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm Ledger Entry
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add New Item Modal */}
      <Modal
        isOpen={isNewItemModalOpen}
        onClose={() => setIsNewItemModalOpen(false)}
        title="Add New Raw Inventory Ingredient"
        description="Register an item for automatic recipe bill-of-materials deduction."
        maxWidth="md"
      >
        <form onSubmit={handleCreateIngredient} className="space-y-4">
          <Input
            label="Ingredient Name"
            placeholder="e.g. Belgian Dark Chocolate Chips 70%"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU / Barcode"
              placeholder="e.g. CHO-BEL-01"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Measurement Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as InventoryItem['unit'])}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="g">Grams (g)</option>
                <option value="l">Liters (l)</option>
                <option value="ml">Milliliters (ml)</option>
                <option value="pcs">Pieces (pcs)</option>
                <option value="boxes">Boxes</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Initial Stock"
              type="number"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
            />
            <Input
              label="Min Alert Level"
              type="number"
              value={minimumStock}
              onChange={(e) => setMinimumStock(e.target.value)}
            />
            <Input
              label="Unit Cost (₹)"
              type="number"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
            />
          </div>

          <Input
            label="Supplier / Vendor Name"
            placeholder="e.g. Callebaut India Distributor"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsNewItemModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Register Ingredient
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
