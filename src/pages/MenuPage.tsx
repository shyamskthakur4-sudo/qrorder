import React, { useState } from 'react';
import {
  Plus,
  Search,
  Flame,
  Sparkles,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Check,
  X,
  PlusCircle,
  Percent,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { MenuItem, MenuCategory, MenuVariant, MenuAddon } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { formatCurrency, generateUUID } from '../lib/utils';

export const MenuPage: React.FC = () => {
  const {
    activeBusiness,
    categories,
    menuItems,
    createCategory,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
  } = useBusiness();
  const { success, error, info } = useToast();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // New Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Item Form state
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    category_id: string;
    price: string;
    gst_percent: string;
    is_veg: boolean;
    is_available: boolean;
    is_bestseller: boolean;
    is_new: boolean;
    is_spicy: boolean;
    prep_time_minutes: string;
    calories: string;
    image_url: string;
    variants: MenuVariant[];
    addons: MenuAddon[];
  }>({
    name: '',
    description: '',
    category_id: '',
    price: '',
    gst_percent: '5',
    is_veg: true,
    is_available: true,
    is_bestseller: false,
    is_new: false,
    is_spicy: false,
    prep_time_minutes: '15',
    calories: '',
    image_url: '',
    variants: [],
    addons: [],
  });

  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState('');
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState('');

  // Filtered Items
  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategoryId === 'ALL' || item.category_id === selectedCategoryId;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesVeg = !vegOnly || item.is_veg;
    return matchesCategory && matchesSearch && matchesVeg;
  });

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      category_id: categories[0]?.id || '',
      price: '',
      gst_percent: '5',
      is_veg: true,
      is_available: true,
      is_bestseller: false,
      is_new: true,
      is_spicy: false,
      prep_time_minutes: '12',
      calories: '250',
      image_url:
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80',
      variants: [],
      addons: [],
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      category_id: item.category_id,
      price: item.price.toString(),
      gst_percent: item.gst_percent.toString(),
      is_veg: item.is_veg,
      is_available: item.is_available,
      is_bestseller: item.is_bestseller,
      is_new: item.is_new,
      is_spicy: item.is_spicy,
      prep_time_minutes: item.prep_time_minutes.toString(),
      calories: item.calories ? item.calories.toString() : '',
      image_url: item.image_url || '',
      variants: item.variants || [],
      addons: item.addons || [],
    });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) {
      error('Missing details', 'Item name and base price are required.');
      return;
    }

    const payload: Partial<MenuItem> = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      category_id: formData.category_id || categories[0]?.id || '',
      price: parseFloat(formData.price) || 0,
      gst_percent: parseFloat(formData.gst_percent) || 5,
      is_veg: formData.is_veg,
      is_available: formData.is_available,
      is_bestseller: formData.is_bestseller,
      is_new: formData.is_new,
      is_spicy: formData.is_spicy,
      prep_time_minutes: parseInt(formData.prep_time_minutes) || 15,
      calories: formData.calories ? parseInt(formData.calories) : undefined,
      image_url: formData.image_url.trim(),
      variants: formData.variants,
      addons: formData.addons,
    };

    if (editingItem) {
      updateMenuItem(editingItem.id, payload);
      success('Item Updated', `"${formData.name}" has been updated.`);
    } else {
      createMenuItem(payload);
      success('Item Created', `"${formData.name}" added to digital menu.`);
    }

    setIsItemModalOpen(false);
  };

  const handleAddVariant = () => {
    if (!newVariantName.trim() || !newVariantPrice) return;
    const v: MenuVariant = {
      id: generateUUID(),
      menu_item_id: editingItem?.id || '',
      name: newVariantName.trim(),
      price: parseFloat(newVariantPrice) || 0,
      is_available: true,
      created_at: new Date().toISOString(),
    };
    setFormData((prev) => ({ ...prev, variants: [...prev.variants, v] }));
    setNewVariantName('');
    setNewVariantPrice('');
  };

  const handleRemoveVariant = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const handleAddAddon = () => {
    if (!newAddonName.trim() || !newAddonPrice) return;
    const a: MenuAddon = {
      id: generateUUID(),
      menu_item_id: editingItem?.id || '',
      name: newAddonName.trim(),
      price: parseFloat(newAddonPrice) || 0,
      is_available: true,
      max_selection: 1,
      created_at: new Date().toISOString(),
    };
    setFormData((prev) => ({ ...prev, addons: [...prev.addons, a] }));
    setNewAddonName('');
    setNewAddonPrice('');
  };

  const handleRemoveAddon = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      addons: prev.addons.filter((_, i) => i !== index),
    }));
  };

  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    createCategory(newCatName.trim(), newCatDesc.trim());
    success('Category Added', `Category "${newCatName}" is ready.`);
    setNewCatName('');
    setNewCatDesc('');
    setIsCategoryModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 font-['Outfit']">
            Digital Menu & Customization
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage live categories, food items, pricing, GST rates, variants, and customer add-ons.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsCategoryModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Category
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAddModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Food Item
          </Button>
        </div>
      </div>

      {/* Category Pills & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedCategoryId('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategoryId === 'ALL'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Items ({menuItems.length})
          </button>
          {categories.map((cat) => {
            const count = menuItems.filter((m) => m.category_id === cat.id).length;
            const isSel = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSel
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`text-[10px] ${isSel ? 'text-slate-950' : 'text-slate-500'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Veg toggle */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search dishes or drinks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={() => setVegOnly(!vegOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              vegOnly
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Veg Only
          </button>
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.map((item) => {
          const categoryObj = categories.find((c) => c.id === item.category_id);
          return (
            <Card
              key={item.id}
              className="flex flex-col justify-between overflow-hidden group hover:border-slate-700 transition-all p-0"
            >
              {/* Product Image & Badges */}
              <div className="relative h-44 w-full bg-slate-950 overflow-hidden">
                <img
                  src={
                    item.image_url ||
                    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80'
                  }
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/30" />

                {/* Badges on image */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      item.is_veg
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.is_veg ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                    {item.is_veg ? 'Pure Veg' : 'Non-Veg'}
                  </span>

                  {item.is_bestseller && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 shadow-md">
                      <Flame className="w-3 h-3" /> Bestseller
                    </span>
                  )}
                  {item.is_new && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/80 text-white">
                      <Sparkles className="w-3 h-3" /> New
                    </span>
                  )}
                  {item.is_spicy && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      🌶️ Spicy
                    </span>
                  )}
                </div>

                {/* Availability status badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.is_available
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {item.is_available ? 'In Stock' : 'Sold Out'}
                  </span>
                </div>

                {/* Price pill on bottom right */}
                <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-700/80 font-['Outfit'] font-black text-amber-400 text-sm shadow-lg">
                  {formatCurrency(
                    item.price,
                    activeBusiness.currency,
                    activeBusiness.currency_symbol
                  )}
                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                    +{item.gst_percent}% GST
                  </span>
                </div>
              </div>

              {/* Item Info Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 mb-0.5">
                    {categoryObj?.name || 'General'}
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {item.description || 'No description provided.'}
                  </p>

                  {/* Variants & Addons count chips */}
                  <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-400">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                      {item.variants?.length || 0} Variants
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                      {item.addons?.length || 0} Add-ons
                    </span>
                    <span className="ml-auto text-slate-500">⏱️ {item.prep_time_minutes}m</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-800/80">
                  <button
                    onClick={() =>
                      updateMenuItem(item.id, { is_available: !item.is_available })
                    }
                    className={`text-xs font-medium cursor-pointer ${
                      item.is_available
                        ? 'text-slate-400 hover:text-rose-400'
                        : 'text-emerald-400 hover:underline'
                    }`}
                  >
                    {item.is_available ? 'Mark Sold Out' : 'Mark Available'}
                  </button>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEditModal(item)}
                      className="text-xs py-1"
                      leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                    >
                      Edit
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete "${item.name}" from menu?`)) {
                          deleteMenuItem(item.id);
                          info('Item Deleted', `"${item.name}" was removed.`);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Food Item Modal */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? `Edit Item: ${editingItem.name}` : 'Add New Food Item'}
        description="Configure pricing, GST, variants, dietary tags, and prep times."
        maxWidth="xl"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <Input
            label="Dish / Beverage Name"
            placeholder="e.g. Avocado Toast with Feta"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Base Price (₹)"
              type="number"
              step="0.01"
              placeholder="340.00"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />

            <Input
              label="GST Tax Rate (%)"
              type="number"
              step="0.1"
              placeholder="5.0"
              value={formData.gst_percent}
              onChange={(e) => setFormData({ ...formData, gst_percent: e.target.value })}
              rightIcon={<Percent className="w-3.5 h-3.5" />}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Description & Ingredients
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed ingredients, taste profile, and allergen notice..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <Input
            label="Image URL"
            placeholder="https://images.unsplash.com/..."
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            leftIcon={<ImageIcon className="w-4 h-4" />}
          />

          {/* Toggles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_veg: !formData.is_veg })}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                formData.is_veg
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-500/20 border-rose-500/50 text-rose-300'
              }`}
            >
              {formData.is_veg ? '🥗 Vegetarian' : '🍗 Non-Vegetarian'}
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_bestseller: !formData.is_bestseller })}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                formData.is_bestseller
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              🔥 Bestseller
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_new: !formData.is_new })}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                formData.is_new
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              ✨ New Item
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_spicy: !formData.is_spicy })}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                formData.is_spicy
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              🌶️ Spicy
            </button>
          </div>

          {/* Variants section */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span>Portion Variants (e.g. Regular, Large)</span>
              <span className="text-[10px] text-slate-400">
                {formData.variants.length} defined
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Variant Name (e.g. Large 400ml)"
                value={newVariantName}
                onChange={(e) => setNewVariantName(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              />
              <input
                type="number"
                placeholder="Price (₹)"
                value={newVariantPrice}
                onChange={(e) => setNewVariantPrice(e.target.value)}
                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              />
              <Button type="button" size="sm" variant="secondary" onClick={handleAddVariant}>
                + Add
              </Button>
            </div>

            {formData.variants.map((v, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs"
              >
                <span>{v.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-400">₹{v.price}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(i)}
                    className="text-slate-500 hover:text-rose-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add-ons section */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span>Extra Add-ons (e.g. Extra Cheese, Oat Milk)</span>
              <span className="text-[10px] text-slate-400">
                {formData.addons.length} defined
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add-on Name (e.g. Oat Milk)"
                value={newAddonName}
                onChange={(e) => setNewAddonName(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              />
              <input
                type="number"
                placeholder="Price (₹)"
                value={newAddonPrice}
                onChange={(e) => setNewAddonPrice(e.target.value)}
                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              />
              <Button type="button" size="sm" variant="secondary" onClick={handleAddAddon}>
                + Add
              </Button>
            </div>

            {formData.addons.map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs"
              >
                <span>{a.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-400">+₹{a.price}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAddon(i)}
                    className="text-slate-500 hover:text-rose-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsItemModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingItem ? 'Save Changes' : 'Publish Food Item'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Add Menu Category"
        description="Organize your food and drinks catalog."
        maxWidth="sm"
      >
        <form onSubmit={handleCreateCategorySubmit} className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g. Artisanal Mocktails & Shakes"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            required
          />
          <Input
            label="Description (Optional)"
            placeholder="e.g. Crafted with fresh organic seasonal fruits"
            value={newCatDesc}
            onChange={(e) => setNewCatDesc(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
