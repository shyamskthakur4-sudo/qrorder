import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Plus,
  Trash2,
  Download,
  Printer,
  Users,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { RestaurantTable, TableStatus } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import { NavigationPage } from '../components/layout/Sidebar';

interface TablesPageProps {
  onNavigate: (page: NavigationPage) => void;
  onSelectTableForOrder?: (tableId: string) => void;
}

export const TablesPage: React.FC<TablesPageProps> = ({ onNavigate }) => {
  const {
    activeBusiness,
    activeBranch,
    tables,
    createTable,
    deleteTable,
    updateTableStatus,
  } = useBusiness();
  const { success, error, info } = useToast();

  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [addTableModalOpen, setAddTableModalOpen] = useState(false);

  // New table form
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [seatingArea, setSeatingArea] = useState('Main Dining');

  // Filter area
  const [selectedArea, setSelectedArea] = useState<string>('ALL');

  const areas = ['ALL', ...Array.from(new Set(tables.map((t) => t.seating_area)))];

  const filteredTables =
    selectedArea === 'ALL' ? tables : tables.filter((t) => t.seating_area === selectedArea);

  // Generate QR image when modal opens
  useEffect(() => {
    if (selectedTable?.qr_code?.qr_url) {
      QRCode.toDataURL(selectedTable.qr_code.qr_url, {
        width: 380,
        margin: 2,
        color: {
          dark: '#0b0f19',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch(() => setQrDataUrl(''));
    }
  }, [selectedTable]);

  const handleOpenQR = (table: RestaurantTable) => {
    setSelectedTable(table);
    setQrModalOpen(true);
  };

  const handleCreateTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) {
      error('Missing Number', 'Please enter a table number (e.g. T-05)');
      return;
    }

    const existing = tables.find(
      (t) => t.table_number.toLowerCase() === tableNumber.trim().toLowerCase()
    );
    if (existing) {
      error('Duplicate Table', `Table ${tableNumber} already exists in this branch.`);
      return;
    }

    createTable(tableNumber.trim(), parseInt(capacity) || 4, seatingArea);
    success('Table Added', `Table ${tableNumber} created with permanent unique QR identifier.`);
    setTableNumber('');
    setAddTableModalOpen(false);
  };

  const handleDelete = (tableId: string, number: string) => {
    if (confirm(`Are you sure you want to remove Table ${number}?`)) {
      deleteTable(tableId);
      info('Table Removed', `Table ${number} has been deleted.`);
    }
  };

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !selectedTable) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Table Stand — Table ${selectedTable.table_number}</title>
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; background: #fff; color: #111; }
            .card { border: 2px solid #e2e8f0; border-radius: 24px; padding: 32px; max-width: 360px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
            .logo { font-size: 22px; font-weight: 800; color: #d97706; margin-bottom: 4px; }
            .branch { font-size: 13px; color: #64748b; margin-bottom: 20px; }
            .table-badge { display: inline-block; font-size: 26px; font-weight: 900; background: #0f172a; color: #fff; padding: 6px 20px; border-radius: 9999px; margin-bottom: 20px; }
            img { width: 240px; height: 240px; border-radius: 12px; margin-bottom: 16px; }
            .instruction { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 4px; }
            .sub { font-size: 11px; color: #94a3b8; }
            .token { font-family: monospace; font-size: 10px; color: #94a3b8; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">${activeBusiness.name}</div>
            <div class="branch">${activeBranch.name}</div>
            <div class="table-badge">TABLE ${selectedTable.table_number}</div>
            <div><img src="${qrDataUrl}" alt="QR Code" /></div>
            <div class="instruction">Scan with phone camera to view menu & order</div>
            <div class="sub">No app download required &bull; Live kitchen transmission</div>
            <div class="token">${selectedTable.qr_code?.code_identifier || ''}</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge variant="success" dot>Available</Badge>;
      case 'OCCUPIED':
        return <Badge variant="warning" dot>Occupied</Badge>;
      case 'RESERVED':
        return <Badge variant="purple" dot>Reserved</Badge>;
      case 'CLEANING':
        return <Badge variant="info" dot>Cleaning</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 font-['Outfit']">
            Dining Tables & Smart QR Codes
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Every table is generated with an immutable unique QR token for contactless customer ordering.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setAddTableModalOpen(true)}
          >
            Add New Table
          </Button>
        </div>
      </div>

      {/* Filter Tabs by Seating Area */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Seating Area:
          </span>
          {areas.map((area) => (
            <button
              key={area}
              onClick={() => setSelectedArea(area)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedArea === area
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {area}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-400 whitespace-nowrap">
          Total Tables: <strong className="text-slate-200">{filteredTables.length}</strong>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTables.map((table) => {
          return (
            <Card
              key={table.id}
              className="flex flex-col justify-between group hover:border-slate-700 hover:shadow-xl transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center font-bold font-mono text-base text-amber-400 shadow-inner">
                      {table.table_number}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">
                        Table {table.table_number}
                      </h4>
                      <p className="text-[11px] text-slate-400">{table.seating_area}</p>
                    </div>
                  </div>
                  <div>{getStatusBadge(table.status)}</div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{table.capacity} Guests</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {table.qr_code?.scan_count || 0} scans
                  </span>
                </div>

                {/* Status Toggle Buttons */}
                <div className="mt-3 flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-[10px] font-semibold">
                  {(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'] as TableStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => updateTableStatus(table.id, st)}
                      className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer text-center ${
                        table.status === st
                          ? 'bg-slate-800 text-amber-300 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="amber"
                  leftIcon={<QrCode className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenQR(table)}
                  className="flex-1 text-xs"
                >
                  View QR Stand
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(table.id, table.table_number)}
                  title="Delete table"
                  className="text-slate-400 hover:text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* QR Code Presentation & Download Modal */}
      <Modal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-400" />
            <span>Table {selectedTable?.table_number} QR Code Stand</span>
          </div>
        }
        description="Scan with any smartphone camera to launch the digital ordering menu immediately."
        maxWidth="md"
      >
        {selectedTable && (
          <div className="space-y-4 text-center">
            {/* Table Stand Preview Graphic */}
            <div className="p-6 rounded-3xl bg-white text-slate-950 shadow-2xl max-w-xs mx-auto border-4 border-amber-500/20">
              <p className="text-xs font-black uppercase tracking-wider text-amber-600">
                {activeBusiness.name}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">{activeBranch.name}</p>

              <div className="my-3 py-1.5 px-4 rounded-full bg-slate-900 text-white inline-block font-extrabold text-sm tracking-wide shadow-md">
                TABLE {selectedTable.table_number}
              </div>

              <div className="my-2 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for Table ${selectedTable.table_number}`}
                    className="w-56 h-56 mx-auto object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                    Generating QR...
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800 mt-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Scan with Camera to Order</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                No app installation required &bull; Live Kitchen KDS
              </p>
              <p className="font-mono text-[9px] text-slate-400 mt-2 break-all">
                ID: {selectedTable.qr_code?.code_identifier}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={handlePrintQR}
              >
                Print Table Stand Card
              </Button>

              <a
                href={qrDataUrl}
                download={`QR_Table_${selectedTable.table_number}.png`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PNG</span>
              </a>

              <Button
                variant="outline"
                size="sm"
                leftIcon={<ExternalLink className="w-3.5 h-3.5 text-amber-400" />}
                onClick={() => {
                  setQrModalOpen(false);
                  onNavigate('customer-ordering');
                }}
              >
                Test Menu
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add New Table Modal */}
      <Modal
        isOpen={addTableModalOpen}
        onClose={() => setAddTableModalOpen(false)}
        title="Add New Dining Table"
        description="Create a table and auto-generate an isolated permanent QR token."
        maxWidth="md"
      >
        <form onSubmit={handleCreateTable} className="space-y-4">
          <Input
            label="Table Number / Code"
            placeholder="e.g. T-05 or Rooftop-01"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Seating Capacity"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              options={[
                { value: '2', label: '2 Guests' },
                { value: '4', label: '4 Guests' },
                { value: '6', label: '6 Guests' },
                { value: '8', label: '8 Guests' },
                { value: '12', label: '12+ Large Group' },
              ]}
            />

            <Select
              label="Seating Area"
              value={seatingArea}
              onChange={(e) => setSeatingArea(e.target.value)}
              options={[
                { value: 'Main Dining', label: 'Main Dining' },
                { value: 'Window Bay', label: 'Window Bay' },
                { value: 'Outdoor Terrace', label: 'Outdoor Terrace' },
                { value: 'Bar Counter', label: 'Bar Counter' },
                { value: 'Private Lounge', label: 'Private Lounge' },
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setAddTableModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Table & QR
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
