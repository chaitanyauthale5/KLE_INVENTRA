import React, { useEffect, useMemo, useState } from "react";
import PropTypes from 'prop-types';
import { Rooms, Equipments, User } from '@/services';
import { Building, Wrench, Plus, Trash2, Save, ListChecks, Layers, Package, Info } from 'lucide-react';

export default function ClinicInventory({ currentUser }) {
  const [self, setSelf] = useState(currentUser);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [activeTab, setActiveTab] = useState('rooms');

  const [roomForm, setRoomForm] = useState({ name: '', capacity: 1, therapy_types: [], status: 'active', notes: '' });
  const [equipForm, setEquipForm] = useState({ name: '', quantity: 1, status: 'available', notes: '' });
  const [saving, setSaving] = useState(false);
  const stats = useMemo(() => {
    const totalCapacity = rooms.reduce((sum, r) => sum + (Number(r.capacity)||0), 0);
    const activeRooms = rooms.filter(r => (r.status||'').toLowerCase()==='active').length;
    const totalEquipQty = equipment.reduce((sum, e) => sum + (Number(e.quantity)||0), 0);
    return { totalRooms: rooms.length, totalCapacity, activeRooms, totalEquip: equipment.length, totalEquipQty };
  }, [rooms, equipment]);

  const canManage = useMemo(() => (self?.role === 'clinic_admin' || self?.role === 'super_admin'), [self]);

  useEffect(() => {
    (async () => {
      const me = currentUser || await User.me().catch(() => null);
      setSelf(me);
      await refresh();
    })();
  }, [currentUser]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [r, e] = await Promise.all([Rooms.list(), Equipments.list()]);
      setRooms(r);
      setEquipment(e);
    } catch {
      setRooms([]); setEquipment([]);
    }
    setLoading(false);
  };

  const therapyOptions = ['Nasya','Raktmokshana','Vaman','Virechana','Basti'];

  const toggleTherapyType = (val) => {
    setRoomForm(f => {
      const exists = f.therapy_types.includes(val);
      const next = exists ? f.therapy_types.filter(t => t !== val) : [...f.therapy_types, val];
      return { ...f, therapy_types: next };
    });
  };

  const handleCreateRoom = async () => {
    if (!canManage) return;
    if (!roomForm.name) return window.showNotification?.({ type: 'error', title: 'Room name required' });
    try {
      setSaving(true);
      await Rooms.create(roomForm);
      setRoomForm({ name: '', capacity: 1, therapy_types: [], status: 'active', notes: '' });
      await refresh();
      window.showNotification?.({ type: 'success', title: 'Room added' });
    } catch (e) {
      window.showNotification?.({ type: 'error', title: 'Failed', message: e.message });
    } finally { setSaving(false); }
  };

  const handleUpdateRoom = async (r) => {
    if (!canManage) return;
    try {
      setSaving(true);
      await Rooms.update(r.id, { name: r.name, capacity: Number(r.capacity)||0, therapy_types: r.therapy_types, status: r.status, notes: r.notes });
      await refresh();
      window.showNotification?.({ type: 'success', title: 'Room updated' });
    } catch (e) {
      window.showNotification?.({ type: 'error', title: 'Failed', message: e.message });
    } finally { setSaving(false); }
  };

  const handleDeleteRoom = async (id) => {
    if (!canManage) return;
    try {
      setSaving(true);
      await Rooms.delete(id);
      await refresh();
      window.showNotification?.({ type: 'success', title: 'Room removed' });
    } catch (e) {
      window.showNotification?.({ type: 'error', title: 'Failed', message: e.message });
    } finally { setSaving(false); }
  };

  const handleCreateEquip = async () => {
    if (!canManage) return;
    if (!equipForm.name) return window.showNotification?.({ type: 'error', title: 'Equipment name required' });
    try {
      setSaving(true);
      await Equipments.create(equipForm);
      setEquipForm({ name: '', quantity: 1, status: 'available', notes: '' });
      await refresh();
      window.showNotification?.({ type: 'success', title: 'Equipment added' });
    } catch (e) {
      window.showNotification?.({ type: 'error', title: 'Failed', message: e.message });
    } finally { setSaving(false); }
  };

  const handleUpdateEquip = async (eq) => {
    if (!canManage) return;
    try {
      setSaving(true);
      await Equipments.update(eq.id, { name: eq.name, quantity: Number(eq.quantity)||0, status: eq.status, notes: eq.notes });
      await refresh();
      window.showNotification?.({ type: 'success', title: 'Equipment updated' });
    } catch (e) {
      window.showNotification?.({ type: 'error', title: 'Failed', message: e.message });
    } finally { setSaving(false); }
  };

  const handleDeleteEquip = async (id) => {
    if (!canManage) return;
    try {
      setSaving(true);
      await Equipments.delete(id);
      await refresh();
      window.showNotification?.({ type: 'success', title: 'Equipment removed' });
    } catch (e) {
      window.showNotification?.({ type: 'error', title: 'Failed', message: e.message });
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="mt-4 h-32 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-8 space-y-6 bg-gradient-to-br from-gray-50 to-blue-50/20 min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Building className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-gray-900">Clinic Inventory</h1>
            <p className="text-gray-500 text-xs md:text-sm">Manage rooms and equipment for smooth therapy scheduling</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs"><Layers className="w-4 h-4"/> Rooms</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{stats.totalRooms}</div>
          <div className="text-xs text-gray-500">Active {stats.activeRooms} • Capacity {stats.totalCapacity}</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs"><Package className="w-4 h-4"/> Equipment Types</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{stats.totalEquip}</div>
          <div className="text-xs text-gray-500">Total Qty {stats.totalEquipQty}</div>
        </div>
      </div>

      <div className="inline-flex p-1 bg-white rounded-2xl shadow border">
        <button onClick={()=>setActiveTab('rooms')} className={`px-4 py-2 rounded-xl transition ${activeTab==='rooms'?'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow':''}`}>Rooms</button>
        <button onClick={()=>setActiveTab('equipment')} className={`px-4 py-2 rounded-xl transition ${activeTab==='equipment'?'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow':''}`}>Equipment</button>
      </div>

      {activeTab === 'rooms' && (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-4 shadow-xl border">
          {canManage && (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
              <input className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/30" placeholder="Room name" value={roomForm.name} onChange={(e)=>setRoomForm(f=>({...f, name: e.target.value}))} />
              <input className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/30" type="number" min="0" placeholder="Capacity" value={roomForm.capacity} onChange={(e)=>setRoomForm(f=>({...f, capacity: e.target.value}))} />
              <div className="md:col-span-2 flex items-center gap-2 flex-wrap">
                {therapyOptions.map(t => (
                  <button key={t} type="button" onClick={()=>toggleTherapyType(t)} className={`text-xs px-2 py-1 rounded-full border ${roomForm.therapy_types.includes(t)?'bg-blue-600 text-white border-blue-600':'bg-white hover:bg-gray-50'}`}>{t}</button>
                ))}
              </div>
              <select className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/30" value={roomForm.status} onChange={(e)=>setRoomForm(f=>({...f, status: e.target.value}))}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
              <div className="md:col-span-5">
                <input className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/30" placeholder="Notes" value={roomForm.notes} onChange={(e)=>setRoomForm(f=>({...f, notes: e.target.value}))} />
              </div>
              <div className="md:col-span-1 flex justify-end">
                <button onClick={handleCreateRoom} disabled={saving} className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white disabled:opacity-50 flex items-center gap-2"><Plus className="w-4 h-4"/>Add Room</button>
              </div>
            </div>
          )}

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Capacity</th>
                  <th className="px-3 py-2 text-left">Therapies</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Notes</th>
                  {canManage && <th className="px-3 py-2"></th>}
                </tr>
              </thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r.id} className="border-t hover:bg-gray-50/60">
                    <td className="px-3 py-2">
                      {canManage ? (
                        <input className="px-2 py-1 border rounded" value={r.name} onChange={(e)=>setRooms(rs=>rs.map(x=>x.id===r.id?{...x, name:e.target.value}:x))} />
                      ) : r.name}
                    </td>
                    <td className="px-3 py-2">
                      {canManage ? (
                        <input type="number" min="0" className="px-2 py-1 border rounded w-24" value={r.capacity||0} onChange={(e)=>setRooms(rs=>rs.map(x=>x.id===r.id?{...x, capacity:e.target.value}:x))} />
                      ) : (r.capacity||0)}
                    </td>
                    <td className="px-3 py-2">
                      {canManage ? (
                        <input className="px-2 py-1 border rounded w-56" value={(r.therapy_types||[]).join(', ')} onChange={(e)=>setRooms(rs=>rs.map(x=>x.id===r.id?{...x, therapy_types:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}:x))} />
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(r.therapy_types||[]).map((t,i)=> (
                            <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">{t}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {canManage ? (
                        <select className="px-2 py-1 border rounded" value={r.status||'active'} onChange={(e)=>setRooms(rs=>rs.map(x=>x.id===r.id?{...x, status:e.target.value}:x))}>
                          <option value="active">active</option>
                          <option value="inactive">inactive</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${String(r.status).toLowerCase()==='active'?'bg-emerald-50 text-emerald-700 border-emerald-100':'bg-gray-100 text-gray-600 border-gray-200'}`}>{r.status}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {canManage ? (
                        <input className="px-2 py-1 border rounded w-full" value={r.notes||''} onChange={(e)=>setRooms(rs=>rs.map(x=>x.id===r.id?{...x, notes:e.target.value}:x))} />
                      ) : (r.notes || '')}
                    </td>
                    {canManage && (
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button onClick={()=>handleUpdateRoom(r)} disabled={saving} className="px-2 py-1 border rounded mr-2 inline-flex items-center gap-1"><Save className="w-4 h-4"/>Save</button>
                        <button onClick={()=>handleDeleteRoom(r.id)} disabled={saving} className="px-2 py-1 border rounded text-red-600 inline-flex items-center gap-1"><Trash2 className="w-4 h-4"/>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
                {rooms.length === 0 && (
                  <tr>
                    <td colSpan={canManage?6:5} className="px-3 py-8">
                      <div className="h-full w-full flex flex-col items-center justify-center text-gray-500">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2"><Info className="w-5 h-5"/></div>
                        <div className="text-sm">No rooms found</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'equipment' && (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-4 shadow-xl border">
          {canManage && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
              <input className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/30" placeholder="Equipment name" value={equipForm.name} onChange={(e)=>setEquipForm(f=>({...f, name: e.target.value}))} />
              <input className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/30" type="number" min="0" placeholder="Quantity" value={equipForm.quantity} onChange={(e)=>setEquipForm(f=>({...f, quantity: e.target.value}))} />
              <select className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/30" value={equipForm.status} onChange={(e)=>setEquipForm(f=>({...f, status: e.target.value}))}>
                <option value="available">available</option>
                <option value="unavailable">unavailable</option>
                <option value="maintenance">maintenance</option>
              </select>
              <input className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/30" placeholder="Notes" value={equipForm.notes} onChange={(e)=>setEquipForm(f=>({...f, notes: e.target.value}))} />
              <div className="flex justify-end">
                <button onClick={handleCreateEquip} disabled={saving} className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white disabled:opacity-50 flex items-center gap-2"><Plus className="w-4 h-4"/>Add</button>
              </div>
            </div>
          )}

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Qty</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Notes</th>
                  {canManage && <th className="px-3 py-2"></th>}
                </tr>
              </thead>
              <tbody>
                {equipment.map(eq => (
                  <tr key={eq.id} className="border-t hover:bg-gray-50/60">
                    <td className="px-3 py-2">{canManage ? <input className="px-2 py-1 border rounded" value={eq.name} onChange={(e)=>setEquipment(es=>es.map(x=>x.id===eq.id?{...x, name:e.target.value}:x))} /> : eq.name}</td>
                    <td className="px-3 py-2">{canManage ? <input type="number" min="0" className="px-2 py-1 border rounded w-24" value={eq.quantity||0} onChange={(e)=>setEquipment(es=>es.map(x=>x.id===eq.id?{...x, quantity:e.target.value}:x))} /> : (eq.quantity||0)}</td>
                    <td className="px-3 py-2">{canManage ? (
                      <select className="px-2 py-1 border rounded" value={eq.status||'available'} onChange={(e)=>setEquipment(es=>es.map(x=>x.id===eq.id?{...x, status:e.target.value}:x))}>
                        <option value="available">available</option>
                        <option value="unavailable">unavailable</option>
                        <option value="maintenance">maintenance</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${String(eq.status).toLowerCase()==='available'?'bg-emerald-50 text-emerald-700 border-emerald-100':String(eq.status).toLowerCase()==='maintenance'?'bg-amber-50 text-amber-700 border-amber-100':'bg-gray-100 text-gray-600 border-gray-200'}`}>{eq.status}</span>
                    )}</td>
                    <td className="px-3 py-2">{canManage ? <input className="px-2 py-1 border rounded w-full" value={eq.notes||''} onChange={(e)=>setEquipment(es=>es.map(x=>x.id===eq.id?{...x, notes:e.target.value}:x))} /> : (eq.notes||'')}</td>
                    {canManage && (
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button onClick={()=>handleUpdateEquip(eq)} disabled={saving} className="px-2 py-1 border rounded mr-2 inline-flex items-center gap-1"><Save className="w-4 h-4"/>Save</button>
                        <button onClick={()=>handleDeleteEquip(eq.id)} disabled={saving} className="px-2 py-1 border rounded text-red-600 inline-flex items-center gap-1"><Trash2 className="w-4 h-4"/>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
                {equipment.length === 0 && (
                  <tr>
                    <td colSpan={canManage?5:4} className="px-3 py-8">
                      <div className="h-full w-full flex flex-col items-center justify-center text-gray-500">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2"><Info className="w-5 h-5"/></div>
                        <div className="text-sm">No equipment found</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 flex items-center gap-2"><ListChecks className="w-4 h-4"/> Room capacities and supported therapies are stored and used during scheduling.</div>
    </div>
  );
}

ClinicInventory.propTypes = {
  currentUser: PropTypes.object
};
