import React, { useState } from 'react';
import { 
  Flag, 
  Award, 
  Wrench, 
  ShieldAlert, 
  LogOut, 
  Info, 
  Heart, 
  Volume2, 
  VolumeX, 
  User, 
  Phone, 
  MapPin, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  X,
  Lock,
  Building,
  Mail,
  Leaf
} from 'lucide-react';
import { getSoundEnabled, setSoundEnabled, playClickBeep, playSuccessChime } from '../lib/audio';
import { saveCitizenUser, saveTechnicianUser, saveAdminUser } from '../lib/firebase';
import { INDIAN_REGIONS } from './MockAssets';

interface NavbarProps {
  currentPortal: 'citizen' | 'technician' | 'admin';
  setCurrentPortal: (portal: 'citizen' | 'technician' | 'admin') => void;
  loggedInUser: any;
  onLogout: () => void;
  onUpdateUser?: (updatedUser: any) => void;
}

export default function Navbar({ 
  currentPortal, 
  setCurrentPortal, 
  loggedInUser, 
  onLogout,
  onUpdateUser 
}: NavbarProps) {
  const [soundOn, setSoundOn] = useState(getSoundEnabled());

  // Profile modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileState, setProfileState] = useState('');
  const [profileDistrict, setProfileDistrict] = useState('');
  const [profileCommunity, setProfileCommunity] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  const handleSoundToggle = () => {
    const nextVal = !soundOn;
    setSoundEnabled(nextVal);
    setSoundOn(nextVal);
    if (nextVal) {
      setTimeout(() => playClickBeep(), 50);
    }
  };

  const handleOpenProfile = () => {
    if (!loggedInUser) return;
    setProfileName(loggedInUser.name || '');
    setProfilePhone(loggedInUser.phoneNumber || '');
    setProfileState(loggedInUser.state || 'Karnataka');
    setProfileDistrict(loggedInUser.district || '');
    setProfileCommunity(loggedInUser.community || '');
    setSaveSuccessMessage('');
    setShowProfileModal(true);
    playClickBeep();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInUser) return;
    setIsSavingProfile(true);

    const updatedUser = {
      ...loggedInUser,
      name: profileName,
      phoneNumber: profilePhone,
      state: profileState,
      district: profileDistrict,
      community: profileCommunity,
    };

    try {
      if (loggedInUser.role === 'citizen') {
        await saveCitizenUser(updatedUser);
      } else if (loggedInUser.role === 'technician') {
        await saveTechnicianUser(updatedUser);
      } else if (loggedInUser.role === 'admin') {
        await saveAdminUser(updatedUser);
      }

      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }

      setSaveSuccessMessage('Profile updated successfully!');
      playSuccessChime();

      setTimeout(() => {
        setShowProfileModal(false);
        setSaveSuccessMessage('');
      }, 1500);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Find districts and communities based on current selected state
  const selectedRegionData = INDIAN_REGIONS.find(r => r.state === profileState);
  const districtOptions = selectedRegionData?.districts || [];
  const communityOptions = selectedRegionData?.communities || [];

  return (
    <header className="bg-white border-b border-gray-100 shadow-xs sticky top-0 z-50">
      {/* Indian Tricolor Sash */}
      <div className="h-1.5 w-full flex">
        <div className="bg-saffron-500 flex-1"></div>
        <div className="bg-white flex-1"></div>
        <div className="bg-india-green-500 flex-1"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* App Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentPortal('citizen')}>
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-saffron-50 via-white to-india-green-50 border border-gray-200 shadow-sm overflow-hidden group">
              <div className="absolute inset-0 opacity-20 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-10 h-10 text-ashoka-600 animate-spin-slow">
                   <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="3" />
                   {Array.from({ length: 24 }).map((_, i) => (
                     <line key={i} x1="50" y1="50" x2="50" y2="5" stroke="currentColor" strokeWidth="2" transform={`rotate(${i * 15} 50 50)`} />
                   ))}
                </svg>
              </div>
              <ShieldCheck className="w-6 h-6 text-gray-800 relative z-10 group-hover:text-ashoka-600 transition-colors" />
              <Sparkles className="w-3.5 h-3.5 text-saffron-500 absolute top-1.5 right-1.5 z-10" />
              <Leaf className="w-3.5 h-3.5 text-india-green-500 absolute bottom-1.5 left-1.5 z-10" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight flex items-center text-gray-900">
                BHARAT <span className="text-saffron-500 ml-1">SEVA</span>
              </h1>
              <p className="text-[10px] text-india-green-600 font-mono font-bold tracking-widest uppercase">
                Digital Swachh Governance
              </p>
            </div>
          </div>



          {/* User Status or Callout */}
          <div className="flex items-center space-x-3">
            {/* Gamified Volume / Sound Switcher */}
            <button
              onClick={handleSoundToggle}
              title={soundOn ? "Mute Game SFX" : "Unmute Game SFX"}
              className={`p-1.5 rounded-lg transition-all flex items-center justify-center border text-xs gap-1 cursor-pointer font-bold ${
                soundOn
                  ? 'bg-saffron-50 text-saffron-700 border-saffron-200 hover:bg-saffron-100'
                  : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {soundOn ? (
                <>
                  <Volume2 className="w-4 h-4 text-saffron-500" />
                  <span className="hidden sm:inline font-mono text-[9px] uppercase tracking-wider">Audio On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-gray-400" />
                  <span className="hidden sm:inline font-mono text-[9px] uppercase tracking-wider">Muted</span>
                </>
              )}
            </button>

            {loggedInUser ? (
              <div className="flex items-center space-x-3 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                <div 
                  onClick={handleOpenProfile}
                  title="View & Edit Profile"
                  className="text-right cursor-pointer hover:bg-gray-100/50 p-0.5 px-1.5 rounded-lg transition-all flex items-center space-x-2 group shrink-0"
                >
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-800 leading-tight group-hover:text-saffron-600 transition-colors flex items-center gap-1 justify-end">
                      <span>{loggedInUser.name}</span>
                      <span className="text-[9px] text-gray-400 font-normal">✎</span>
                    </p>
                    <p className="text-[10px] text-gray-500 leading-none">
                      {loggedInUser.role === 'citizen' && (
                        <span className="text-saffron-600 font-bold">⭐ {loggedInUser.points} Pts</span>
                      )}
                      {loggedInUser.role === 'technician' && (
                        <span className="text-ashoka-600 font-bold">🔧 {loggedInUser.specialty}</span>
                      )}
                      {loggedInUser.role === 'admin' && (
                        <span className="text-india-green-600 font-bold uppercase tracking-wider">{loggedInUser.adminLevel} Head</span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="h-6 w-[1px] bg-gray-200 shrink-0"></div>

                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-300 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-xs font-semibold text-gray-500">
                <span className="animate-pulse inline-block w-2.5 h-2.5 bg-india-green-500 rounded-full"></span>
                <span>Active Seva Grid</span>
              </div>
            )}
          </div>
        </div>


      </div>

      {/* Edit Profile Modal Dialog Overlay */}
      {showProfileModal && loggedInUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
            
            {/* Header branding */}
            <div className="bg-ashoka-700 p-5 text-white flex justify-between items-center relative">
              <div className="flex items-center space-x-3">
                <div className="bg-white/10 p-2 rounded-full border border-white/20">
                  <User className="w-5 h-5 text-saffron-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display">My Seva Profile</h3>
                  <p className="text-[10px] text-white/70">View & edit your civic account settings</p>
                </div>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {saveSuccessMessage ? (
                <div className="p-4 bg-india-green-50 text-india-green-800 border border-india-green-200 rounded-2xl text-center space-y-2 animate-bounce">
                  <ShieldCheck className="w-8 h-8 text-india-green-600 mx-auto" />
                  <p className="text-xs font-bold">{saveSuccessMessage}</p>
                </div>
              ) : (
                <>
                  {/* Account Metadata (Read-Only) */}
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-gray-400 font-mono">ACCOUNT EMAIL</p>
                      <p className="text-xs font-bold text-gray-700 font-mono flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{loggedInUser.email}</span>
                      </p>
                    </div>
                    <span className="text-[9px] bg-saffron-100 text-saffron-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                      {loggedInUser.role}
                    </span>
                  </div>

                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-600 block">Full Name</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="w-4 h-4 text-gray-400" />
                      </span>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Enter your name..."
                        className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-saffron-500 focus:bg-white transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Phone number field */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-600 block">Phone Number</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="w-4 h-4 text-gray-400" />
                      </span>
                      <input
                        type="tel"
                        required
                        pattern="[0-9]{10}"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit mobile number..."
                        className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-saffron-500 focus:bg-white transition-all duration-200 font-mono"
                      />
                    </div>
                  </div>

                  {/* State Select */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-600 block">State</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="w-4 h-4 text-gray-400" />
                      </span>
                      <select
                        value={profileState}
                        onChange={(e) => {
                          const stateVal = e.target.value;
                          setProfileState(stateVal);
                          // Auto update district and community to the first available in the new state
                          const nextRegion = INDIAN_REGIONS.find(r => r.state === stateVal);
                          if (nextRegion) {
                            setProfileDistrict(nextRegion.districts[0] || '');
                            setProfileCommunity(nextRegion.communities[0] || '');
                          }
                        }}
                        className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-saffron-500 focus:bg-white transition-all duration-200"
                      >
                        {INDIAN_REGIONS.map(r => (
                          <option key={r.state} value={r.state}>{r.state}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* District field */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-600 block">District</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Building className="w-4 h-4 text-gray-400" />
                        </span>
                        {districtOptions.length > 0 ? (
                          <select
                            value={profileDistrict}
                            onChange={(e) => setProfileDistrict(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-saffron-500 focus:bg-white transition-all duration-200"
                          >
                            {districtOptions.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            required
                            value={profileDistrict}
                            onChange={(e) => setProfileDistrict(e.target.value)}
                            placeholder="Enter district..."
                            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-saffron-500 focus:bg-white transition-all duration-200"
                          />
                        )}
                      </div>
                    </div>

                    {/* Community / Ward field */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-600 block">Community / Ward</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="w-4 h-4 text-gray-400" />
                        </span>
                        {communityOptions.length > 0 ? (
                          <select
                            value={profileCommunity}
                            onChange={(e) => setProfileCommunity(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-saffron-500 focus:bg-white transition-all duration-200"
                          >
                            {communityOptions.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            required
                            value={profileCommunity}
                            onChange={(e) => setProfileCommunity(e.target.value)}
                            placeholder="Enter ward..."
                            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-saffron-500 focus:bg-white transition-all duration-200"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="pt-3 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowProfileModal(false)}
                      className="px-4 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-5 py-2 text-xs font-bold bg-saffron-500 hover:bg-saffron-600 disabled:bg-saffron-300 text-white rounded-xl shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSavingProfile ? (
                        <>
                          <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
