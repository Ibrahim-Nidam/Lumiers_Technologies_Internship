import React, { useState } from 'react';
import { Plus, X, Check } from 'lucide-react'; // Added Check for the save icon
import colors from '../../colors'; // Assuming you have a colors.js file for consistent color usage


const ResponsiveRolesTable = () => {
  // --- Original State (Used by Desktop and for Data) ---
  const [roles, setRoles] = useState(['Manager', 'Developer', 'Designer']);
  const [editingRoleIndex, setEditingRoleIndex] = useState(null);

  const [missionRates, setMissionRates] = useState([
    { id: 1, name: 'Standard' },
    { id: 2, name: 'Premium' }
  ]);
  const [editingMissionRate, setEditingMissionRate] = useState(null);
  const [showMissionInput, setShowMissionInput] = useState(false);
  const [newMissionRateName, setNewMissionRateName] = useState('');

  const [kilometerRates, setKilometerRates] = useState([
    { id: 1, name: 'Urban' },
    { id: 2, name: 'Highway' }
  ]);
  const [editingKilometerRate, setEditingKilometerRate] = useState(null);
  const [showKilometerInput, setShowKilometerInput] = useState(false);
  const [newKilometerRateName, setNewKilometerRateName] = useState('');
  
  // --- NEW STATE: Exclusively for Mobile Editing UI ---
  const [mobileEditing, setMobileEditing] = useState({ type: null, id: null });
  const [mobileEditingValue, setMobileEditingValue] = useState('');


  const [formData, setFormData] = useState(() => {
    const initial = {};
    roles.forEach(role => {
      initial[role] = {
        missionRates: Object.fromEntries(missionRates.map(r => [r.id, ''])),
        kilometerRates: Object.fromEntries(kilometerRates.map(r => [r.id, '']))
      };
    });
    return initial;
  });

  // --- NEW HANDLERS: Exclusively for Mobile Editing UI ---

  const startMobileEditing = (type, id, currentValue) => {
    setMobileEditing({ type, id });
    setMobileEditingValue(currentValue);
  };

  const cancelMobileEditing = () => {
    setMobileEditing({ type: null, id: null });
    setMobileEditingValue('');
  };

  const handleUpdateMobileRoleName = () => {
    const newName = mobileEditingValue.trim();
    const index = mobileEditing.id;
    if (!newName) { cancelMobileEditing(); return; }

    const oldName = roles[index];
    if (oldName !== newName) {
      // This logic is critical to prevent the app from breaking when a role is renamed on mobile
      setRoles(prev => {
        const newRoles = [...prev];
        newRoles[index] = newName;
        return newRoles;
      });
      setFormData(prev => {
        const updatedData = { ...prev };
        updatedData[newName] = updatedData[oldName];
        delete updatedData[oldName];
        return updatedData;
      });
    }
    cancelMobileEditing();
  };

  const handleUpdateMobileRateName = (rateType) => {
    const newName = mobileEditingValue.trim();
    if (!newName) { cancelMobileEditing(); return; }

    const setter = rateType === 'mission' ? setMissionRates : setKilometerRates;
    setter(prev => prev.map(r => (r.id === mobileEditing.id ? { ...r, name: newName } : r)));
    cancelMobileEditing();
  };


  // --- Original Functions (Unchanged) ---
  const updateFormData = (role, field, rateId, value) => {
    setFormData(prev => ({ ...prev, [role]: { ...prev[role], [field]: { ...prev[role][field], [rateId]: value }}}));
  };
  const addRole = () => {
    const newRole = `New Role ${roles.length + 1}`;
    setRoles(prev => [...prev, newRole]);
    setFormData(prev => ({...prev, [newRole]: {
        missionRates: Object.fromEntries(missionRates.map(r => [r.id, ''])),
        kilometerRates: Object.fromEntries(kilometerRates.map(r => [r.id, '']))
    }}));
  };
  const deleteRole = idx => {
    const roleToDelete = roles[idx];
    setRoles(prev => prev.filter((_, i) => i !== idx));
    setFormData(prev => {
      const updated = { ...prev };
      delete updated[roleToDelete];
      return updated;
    });
  };
  const addMissionRate = () => {
    if (!newMissionRateName.trim()) return;
    const newId = Math.max(0, ...missionRates.map(r => r.id)) + 1;
    const rate = { id: newId, name: newMissionRateName.trim() };
    setMissionRates(prev => [...prev, rate]);
    setNewMissionRateName('');
    setFormData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(role => { updated[role].missionRates[newId] = ''; });
      return updated;
    });
  };
  const addKilometerRate = () => {
    if (!newKilometerRateName.trim()) return;
    const newId = Math.max(0, ...kilometerRates.map(r => r.id)) + 1;
    const rate = { id: newId, name: newKilometerRateName.trim() };
    setKilometerRates(prev => [...prev, rate]);
    setNewKilometerRateName('');
    setFormData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(role => { updated[role].kilometerRates[newId] = ''; });
      return updated;
    });
  };
  const deleteRate = (rateId, type) => {
    if (type === 'mission') {
      setMissionRates(prev => prev.filter(r => r.id !== rateId));
      setFormData(prev => {
        const updated = { ...prev };
        Object.values(updated).forEach(r => delete r.missionRates[rateId]);
        return updated;
      });
    } else {
      setKilometerRates(prev => prev.filter(r => r.id !== rateId));
      setFormData(prev => {
        const updated = { ...prev };
        Object.values(updated).forEach(r => delete r.kilometerRates[rateId]);
        return updated;
      });
    }
  };

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: colors.white }}>
      <div className="max-w-full mx-auto">
        {/* Desktop View (Unchanged) */}
        <div className="hidden md:block">
            {/* All original desktop JSX is preserved here */}
            <div className="mb-4"><button onClick={addRole} className="px-4 py-2 text-white rounded" style={{ backgroundColor: colors.primary }}><Plus className="w-4 h-4 inline mr-2" />Add Role</button></div>
            <div className="bg-white rounded-lg shadow-lg overflow-x-auto"><table className="w-full border border-gray-200"><thead><tr style={{ backgroundColor: colors.primary }}><th className="text-white font-bold p-4 text-left border-r-2 border-white min-w-[200px]">Roles</th><th className="text-white font-bold p-4 text-center border-r-2 border-white" colSpan={missionRates.length}><div className="flex items-center justify-center gap-2">Type de Déplacement<button onClick={() => setShowMissionInput(true)} className="text-white hover:opacity-75"><Plus className="w-4 h-4" /></button></div>{showMissionInput && (<div className="mt-2 flex justify-center"><input type="text" value={newMissionRateName} onChange={e => setNewMissionRateName(e.target.value)} onBlur={() => {addMissionRate(); setShowMissionInput(false);}} onKeyDown={e => {if (e.key === 'Enter') {addMissionRate(); setShowMissionInput(false);}}} placeholder="Nom du type" className="px-2 py-1 text-sm rounded border border-white text-black" autoFocus /></div>)}</th><th className="text-white font-bold p-4 text-center" colSpan={kilometerRates.length}><div className="flex items-center justify-center gap-2">Taux Kilométrique<button onClick={() => setShowKilometerInput(true)} className="text-white hover:opacity-75"><Plus className="w-4 h-4" /></button></div>{showKilometerInput && (<div className="mt-2 flex justify-center"><input type="text" value={newKilometerRateName} onChange={e => setNewKilometerRateName(e.target.value)} onBlur={() => {addKilometerRate(); setShowKilometerInput(false);}} onKeyDown={e => {if (e.key === 'Enter') {addKilometerRate(); setShowKilometerInput(false);}}} placeholder="Nom du taux" className="px-2 py-1 text-sm rounded border border-white text-black" autoFocus /></div>)}</th></tr><tr style={{ backgroundColor: colors.secondary }}><th className="p-2 border-r-2 border-white"></th>{missionRates.map(rate => (<th key={rate.id} className="p-2 text-sm font-medium border-r border-gray-300 relative group">{editingMissionRate === rate.id ? (<input autoFocus type="text" className="w-full p-1 text-sm border border-gray-300 rounded" value={rate.name} onChange={e => setMissionRates(prev => prev.map(r => (r.id === rate.id ? { ...r, name: e.target.value } : r)))} onBlur={() => setEditingMissionRate(null)} />) : (<div onClick={() => setEditingMissionRate(rate.id)} className="cursor-pointer truncate hover:underline" style={{ color: colors.logo_text }}>{rate.name}</div>)}<X onClick={() => deleteRate(rate.id, 'mission')} className="absolute top-1 right-1 w-3 h-3 text-red-500 cursor-pointer hidden group-hover:block" /></th>))}{kilometerRates.map(rate => (<th key={rate.id} className="p-2 text-sm font-medium relative group">{editingKilometerRate === rate.id ? (<input autoFocus type="text" className="w-full p-1 text-sm border border-gray-300 rounded" value={rate.name} onChange={e => setKilometerRates(prev => prev.map(r => (r.id === rate.id ? { ...r, name: e.target.value } : r)))} onBlur={() => setEditingKilometerRate(null)} />) : (<div onClick={() => setEditingKilometerRate(rate.id)} className="cursor-pointer truncate hover:underline" style={{ color: colors.logo_text }}>{rate.name}</div>)}<X onClick={() => deleteRate(rate.id, 'kilometer')} className="absolute top-1 right-1 w-3 h-3 text-red-500 cursor-pointer hidden group-hover:block" /></th>))}</tr></thead><tbody>{roles.map((role, idx) => (<tr key={idx} className="border-b border-gray-200"><td className="p-4 border-r-2 border-gray-200 flex items-center justify-between group">{editingRoleIndex === idx ? (<input autoFocus className="w-full p-1 text-sm border border-gray-300 rounded" value={roles[idx]} onChange={e => setRoles(prev => { const copy = [...prev]; copy[idx] = e.target.value; return copy; })} onBlur={() => setEditingRoleIndex(null)} />) : (<div onClick={() => setEditingRoleIndex(idx)} className="cursor-pointer font-medium truncate hover:underline" style={{ color: colors.logo_text }}>{role}</div>)}<X onClick={() => deleteRole(idx)} className="ml-2 w-4 h-4 text-red-500 cursor-pointer hover:opacity-75 hidden group-hover:block" /></td>{missionRates.map(rate => (<td key={rate.id} className="p-2 border-r border-gray-200"><input type="text" value={formData[role]?.missionRates[rate.id] || ''} onChange={e => updateFormData(role, 'missionRates', rate.id, e.target.value)} className="w-full p-1 border border-gray-300 rounded" /></td>))}{kilometerRates.map(rate => (<td key={rate.id} className="p-2"><input type="text" value={formData[role]?.kilometerRates[rate.id] || ''} onChange={e => updateFormData(role, 'kilometerRates', rate.id, e.target.value)} className="w-full p-1 border border-gray-300 rounded" /></td>))}</tr>))}</tbody></table></div>
        </div>

        {/* Mobile View (FIXED) */}
        <div className="md:hidden">
          {/* ... Mobile buttons for adding roles/rates (Unchanged) ... */}
          <div className="mb-6 space-y-3"><button onClick={addRole} className="w-full px-4 py-3 text-white rounded-lg text-center" style={{ backgroundColor: colors.primary }}><Plus className="w-4 h-4 inline mr-2" /> Add Role</button><div className="flex gap-2"><button onClick={() => setShowMissionInput(true)} className="flex-1 px-4 py-2 text-white rounded text-sm" style={{ backgroundColor: colors.primary }}><Plus className="w-4 h-4 inline mr-1" /> Mission Rate</button><button onClick={() => setShowKilometerInput(true)} className="flex-1 px-4 py-2 text-white rounded text-sm" style={{ backgroundColor: colors.primary }}><Plus className="w-4 h-4 inline mr-1" /> Kilometer Rate</button></div>{showMissionInput && ( <div className="mt-2"><input type="text" value={newMissionRateName} onChange={e => setNewMissionRateName(e.target.value)} onBlur={() => { addMissionRate(); setShowMissionInput(false); }} onKeyDown={e => { if (e.key === 'Enter') { addMissionRate(); setShowMissionInput(false); }}} placeholder="Nom du type" className="w-full p-2 border border-gray-300 rounded" autoFocus /></div>)}{showKilometerInput && ( <div className="mt-2"><input type="text" value={newKilometerRateName} onChange={e => setNewKilometerRateName(e.target.value)} onBlur={() => { addKilometerRate(); setShowKilometerInput(false); }} onKeyDown={e => { if (e.key === 'Enter') { addKilometerRate(); setShowKilometerInput(false); }}} placeholder="Nom du taux" className="w-full p-2 border border-gray-300 rounded" autoFocus /></div>)}</div>

          <div className="space-y-4">
            {roles.map((role, roleIndex) => (
              <div key={roleIndex} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-4" style={{ backgroundColor: colors.primary }}>
                  <div className="flex items-center justify-between">
                    {/* FIXED: Role Name Editing */}
                    {mobileEditing.type === 'role' && mobileEditing.id === roleIndex ? (
                        <div className="flex items-center gap-2 w-full text-lg font-bold"><input autoFocus type="text" value={mobileEditingValue} onChange={e => setMobileEditingValue(e.target.value)} onKeyDown={e => { if(e.key==='Enter') handleUpdateMobileRoleName(); if(e.key==='Escape') cancelMobileEditing(); }} className="w-full p-1 text-sm border border-gray-300 rounded text-black" /><button onClick={handleUpdateMobileRoleName} className="text-white p-0"><Check size={22}/></button><button onClick={cancelMobileEditing} className="text-white p-0"><X size={22}/></button></div>
                    ) : (
                        <h3 onClick={() => startMobileEditing('role', roleIndex, role)} className="text-white font-bold text-lg cursor-pointer">{role}</h3>
                    )}
                    <X onClick={() => deleteRole(roleIndex)} className="w-5 h-5 text-white cursor-pointer ml-2 flex-shrink-0" />
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2" style={{ color: colors.logo_text }}>Type de Déplacement</h4>
                    <div className="space-y-2">
                      {missionRates.map(rate => (
                        <div key={rate.id} className="flex items-center gap-2">
                          <div className="flex-1">
                            {/* FIXED: Mission Rate Name Editing */}
                            {mobileEditing.type === 'mission' && mobileEditing.id === rate.id ? (
                                <div className="flex items-center gap-2 w-full"><input autoFocus type="text" value={mobileEditingValue} onChange={e => setMobileEditingValue(e.target.value)} onKeyDown={e => { if(e.key==='Enter') handleUpdateMobileRateName('mission'); if(e.key==='Escape') cancelMobileEditing(); }} className="w-full p-1 text-sm border border-gray-300 rounded" /><button onClick={() => handleUpdateMobileRateName('mission')} className="text-green-600 p-0"><Check size={20}/></button><button onClick={cancelMobileEditing} className="text-red-500 p-0"><X size={20}/></button></div>
                            ) : (
                                <span onClick={() => startMobileEditing('mission', rate.id, rate.name)} className="cursor-pointer hover:underline" style={{ color: colors.logo_text }}>{rate.name}</span>
                            )}
                          </div>
                          <input type="text" value={formData[role]?.missionRates[rate.id] || ''} onChange={e => updateFormData(role, 'missionRates', rate.id, e.target.value)} className="w-24 p-1 border border-gray-300 rounded" />
                          <X onClick={() => deleteRate(rate.id, 'mission')} className="w-4 h-4 text-red-500 cursor-pointer" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2" style={{ color: colors.logo_text }}>Taux Kilométrique</h4>
                    <div className="space-y-2">
                      {kilometerRates.map(rate => (
                        <div key={rate.id} className="flex items-center gap-2">
                          <div className="flex-1">
                            {/* FIXED: Kilometer Rate Name Editing */}
                            {mobileEditing.type === 'kilometer' && mobileEditing.id === rate.id ? (
                                <div className="flex items-center gap-2 w-full"><input autoFocus type="text" value={mobileEditingValue} onChange={e => setMobileEditingValue(e.target.value)} onKeyDown={e => { if(e.key==='Enter') handleUpdateMobileRateName('kilometer'); if(e.key==='Escape') cancelMobileEditing(); }} className="w-full p-1 text-sm border border-gray-300 rounded" /><button onClick={() => handleUpdateMobileRateName('kilometer')} className="text-green-600 p-0"><Check size={20}/></button><button onClick={cancelMobileEditing} className="text-red-500 p-0"><X size={20}/></button></div>
                            ) : (
                                <span onClick={() => startMobileEditing('kilometer', rate.id, rate.name)} className="cursor-pointer hover:underline" style={{ color: colors.logo_text }}>{rate.name}</span>
                            )}
                          </div>
                          <input type="text" value={formData[role]?.kilometerRates[rate.id] || ''} onChange={e => updateFormData(role, 'kilometerRates', rate.id, e.target.value)} className="w-24 p-1 border border-gray-300 rounded" />
                          <X onClick={() => deleteRate(rate.id, 'kilometer')} className="w-4 h-4 text-red-500 cursor-pointer" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResponsiveRolesTable;