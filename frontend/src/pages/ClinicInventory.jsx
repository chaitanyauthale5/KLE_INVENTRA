import React, { useEffect, useMemo, useState } from "react";
import PropTypes from 'prop-types';
import { Rooms, Equipments, User } from '@/services';
import { Building, Wrench, Plus, Trash2, Save, ListChecks } from 'lucide-react';

export default function ClinicInventory({ currentUser }) {
  const [self, setSelf] = useState(currentUser);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [activeTab, setActiveTab] = useState('rooms');

  const [roomForm, setRoomForm] = useState({ name: '', capacity: 1, therapy_types: [], status: 'active', notes: '' });
  const [equipForm, setEquipForm] = useState({ name: '', quantity: 1, status: 'available', notes: '' });
  const [saving, setSaving] = useState(false);

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
    <div className="p-3 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
          <Building className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Clinic Inventory</h1>
          <p className="text-gray-500 text-sm">Manage rooms and equipment</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={()=>setActiveTab('rooms')} className={`px-4 py-2 rounded-xl border ${activeTab==='rooms'?'bg-blue-600 text-white':'bg-white'}`}>Rooms</button>
        <button onClick={()=>setActiveTab('equipment')} className={`px-4 py-2 rounded-xl border ${activeTab==='equipment'?'bg-blue-600 text-white':'bg-white'}`}>Equipment</button>
      </div>

      {activeTab === 'rooms' && (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-4 shadow-xl border">
          {canManage && (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
              <input className="px-3 py-2 border rounded-lg" placeholder="Room name" value={roomForm.name} onChange={(e)=>setRoomForm(f=>({...f, name: e.target.value}))} />
              <input className="px-3 py-2 border rounded-lg" type="number" min="0" placeholder="Capacity" value={roomForm.capacity} onChange={(e)=>setRoomForm(f=>({...f, capacity: e.target.value}))} />
              <div className="md:col-span-2 flex items-center gap-3 flex-wrap">
                {therapyOptions.map(t => (
                  <label key={t} className="text-xs flex items-center gap-1 border rounded px-2 py-1">
                    <input type="checkbox" checked={roomForm.therapy_types.includes(t)} onChange={()=>toggleTherapyType(t)} /> {t}
                  </label>
                ))}
              </div>
              <select className="px-3 py-2 border rounded-lg" value={roomForm.status} onChange={(e)=>setRoomForm(f=>({...f, status: e.target.value}))}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
              <div className="md:col-span-5">
                <input className="w-full px-3 py-2 border rounded-lg" placeholder="Notes" value={roomForm.notes} onChange={(e)=>setRoomForm(f=>({...f, notes: e.target.value}))} />
              </div>
              <div className="md:col-span-1 flex justify-end">
                <button onClick={handleCreateRoom} disabled={saving} className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white disabled:opacity-50 flex items-center gap-2"><Plus className="w-4 h-4"/>Add Room</button>
              </div>
            </div>
          )}

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
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
                  <tr key={r.id} className="border-t">
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
                      ) : (r.therapy_types||[]).join(', ')}
                    </td>
                    <td className="px-3 py-2">
                      {canManage ? (
                        <select className="px-2 py-1 border rounded" value={r.status||'active'} onChange={(e)=>setRooms(rs=>rs.map(x=>x.id===r.id?{...x, status:e.target.value}:x))}>
                          <option value="active">active</option>
                          <option value="inactive">inactive</option>
                        </select>
                      ) : (r.status)}
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
                    <td colSpan={canManage?6:5} className="px-3 py-4 text-center text-gray-500">No rooms found</td>
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
              <input className="px-3 py-2 border rounded-lg" placeholder="Equipment name" value={equipForm.name} onChange={(e)=>setEquipForm(f=>({...f, name: e.target.value}))} />
              <input className="px-3 py-2 border rounded-lg" type="number" min="0" placeholder="Quantity" value={equipForm.quantity} onChange={(e)=>setEquipForm(f=>({...f, quantity: e.target.value}))} />
              <select className="px-3 py-2 border rounded-lg" value={equipForm.status} onChange={(e)=>setEquipForm(f=>({...f, status: e.target.value}))}>
                <option value="available">available</option>
                <option value="unavailable">unavailable</option>
                <option value="maintenance">maintenance</option>
              </select>
              <input className="px-3 py-2 border rounded-lg" placeholder="Notes" value={equipForm.notes} onChange={(e)=>setEquipForm(f=>({...f, notes: e.target.value}))} />
              <div className="flex justify-end">
                <button onClick={handleCreateEquip} disabled={saving} className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 text-white disabled:opacity-50 flex items-center gap-2"><Plus className="w-4 h-4"/>Add</button>
              </div>
            </div>
          )}

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
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
                  <tr key={eq.id} className="border-t">
                    <td className="px-3 py-2">{canManage ? <input className="px-2 py-1 border rounded" value={eq.name} onChange={(e)=>setEquipment(es=>es.map(x=>x.id===eq.id?{...x, name:e.target.value}:x))} /> : eq.name}</td>
                    <td className="px-3 py-2">{canManage ? <input type="number" min="0" className="px-2 py-1 border rounded w-24" value={eq.quantity||0} onChange={(e)=>setEquipment(es=>es.map(x=>x.id===eq.id?{...x, quantity:e.target.value}:x))} /> : (eq.quantity||0)}</td>
                    <td className="px-3 py-2">{canManage ? (
                      <select className="px-2 py-1 border rounded" value={eq.status||'available'} onChange={(e)=>setEquipment(es=>es.map(x=>x.id===eq.id?{...x, status:e.target.value}:x))}>
                        <option value="available">available</option>
                        <option value="unavailable">unavailable</option>
                        <option value="maintenance">maintenance</option>
                      </select>
                    ) : eq.status}</td>
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
                    <td colSpan={canManage?5:4} className="px-3 py-4 text-center text-gray-500">No equipment found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 flex items-center gap-2"><ListChecks className="w-4 h-4"/> Room capacities and supported therapies are now stored. We will read these during scheduling later.</div>
    </div>
  );
}

ClinicInventory.propTypes = {
  currentUser: PropTypes.object
};
