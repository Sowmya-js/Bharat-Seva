import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Map, 
  Award, 
  UserCheck, 
  CheckCircle, 
  ListChecks, 
  AlertTriangle, 
  Settings, 
  Sparkles, 
  TrendingUp, 
  Info,
  Lock,
  Mail,
  ChevronRight,
  MapPin,
  Clock,
  User,
  ExternalLink,
  BookOpen,
  Database,
  Users,
  Wrench,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { AdminUser, IssueReport, Technician, AdminLevel, Citizen } from '../types';
import { getAdminsList, saveAdminUser, getTechniciansList, updateIssueInDatabase, getCitizensList } from '../lib/firebase';
import { INDIAN_REGIONS, getProperCommunity } from './MockAssets';

interface AdminPortalProps {
  onLoginSuccess: (user: AdminUser) => void;
  loggedInAdmin: AdminUser | null;
  allIssues: IssueReport[];
  onRefreshIssues: () => Promise<void>;
}

export default function AdminPortal({ 
  onLoginSuccess, 
  loggedInAdmin, 
  allIssues, 
  onRefreshIssues 
}: AdminPortalProps) {
  // Login / Register States
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('@gov.in');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [name, setName] = useState('');
  const [adminLevel, setAdminLevel] = useState<AdminLevel>('community');
  const [selectedState, setSelectedState] = useState('Karnataka');
  const [selectedDistrict, setSelectedDistrict] = useState('Bengaluru Urban');
  const [selectedCommunity, setSelectedCommunity] = useState('Indiranagar Ward 80');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Assignment states
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [assigningIssueId, setAssigningIssueId] = useState<string | null>(null);
  const [selectedTechId, setSelectedTechId] = useState('');

  // DB tables visualizer states
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [adminsList, setAdminsList] = useState<AdminUser[]>([]);

  // Human Override close states
  const [overridingIssueId, setOverridingIssueId] = useState<string | null>(null);
  const [overrideComment, setOverrideComment] = useState('');

  // AI Analytics advisory states
  const [aiReport, setAiReport] = useState<{
    majorProblems: string[];
    recommendedSolutions: string[];
    report: string;
  } | null>(null);
  const [isGeneratingAnalytics, setIsGeneratingAnalytics] = useState(false);

  // Fetch all db entities on mount and refresh
  useEffect(() => {
    getTechniciansList().then(list => setTechnicians(list));
    getCitizensList().then(list => setCitizens(list));
    getAdminsList().then(list => setAdminsList(list));
  }, [allIssues]);

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pin) {
      setAuthError('Please fill in both Email and security PIN.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const list = await getAdminsList();
      const match = list.find(a => a.email.toLowerCase() === email.toLowerCase() && a.pin === pin);
      if (match) {
        onLoginSuccess(match);
        confetti({ particleCount: 50, spread: 40, colors: ['#138808', '#FF9933'] });
        setAiReport(null); // clear old advisory reports on new login
      } else {
        setAuthError('Administrator credentials not recognized.');
      }
    } catch (e) {
      setAuthError('Database connection error.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Register Admin
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !pin || !confirmPin) {
      setAuthError('Please fill in Name, Email, and security PIN.');
      return;
    }
    if (pin.length !== 4 || isNaN(Number(pin))) {
      setAuthError('PIN must be a 4-digit number.');
      return;
    }
    if (pin !== confirmPin) {
      setAuthError('PIN and Confirm PIN do not match.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const newAdmin: AdminUser = {
        id: 'adm_' + Date.now(),
        name,
        role: 'admin',
        adminLevel,
        state: adminLevel === 'country' ? '' : selectedState,
        district: (adminLevel === 'country' || adminLevel === 'state') ? '' : selectedDistrict,
        community: adminLevel === 'community' ? selectedCommunity : '',
        email,
        pin
      };
      await saveAdminUser(newAdmin);
      onLoginSuccess(newAdmin);
      confetti({ particleCount: 80, spread: 60, colors: ['#FF9933', '#138808'] });
    } catch (e) {
      setAuthError('Registration failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Assign Issue to Technician
  const handleAssignSubmit = async (issueId: string) => {
    if (!selectedTechId) {
      alert('Please select a technician.');
      return;
    }
    const tech = technicians.find(t => t.id === selectedTechId);
    if (!tech) return;

    try {
      await updateIssueInDatabase(issueId, {
        status: 'assigned',
        assignedTechnicianId: tech.id,
        assignedTechnicianName: tech.name
      });
      setAssigningIssueId(null);
      setSelectedTechId('');
      await onRefreshIssues();
      confetti({ particleCount: 15, spread: 20 });
    } catch (e) {
      alert('Assignment failed.');
    }
  };

  const handleResolveEscalation = async (issueId: string) => {
    try {
      await updateIssueInDatabase(issueId, {
        status: 'closed',
        aiValidation: 'Escalation resolved and closed by Community Head.'
      });
      await onRefreshIssues();
      alert('Escalated issue has been manually closed.');
    } catch (e) {
      alert('Error resolving escalation.');
    }
  };

  // Human Override close
  const handleOverrideClose = async (issueId: string) => {
    if (!overrideComment.trim()) {
      alert('Please provide a reason or comment for manual override.');
      return;
    }
    try {
      await updateIssueInDatabase(issueId, {
        status: 'closed',
        rejectionReason: overrideComment,
        resolvedAt: new Date().toISOString()
      });
      setOverridingIssueId(null);
      setOverrideComment('');
      await onRefreshIssues();
      confetti({ particleCount: 40, spread: 40, colors: ['#138808', '#000080'] });
    } catch (e) {
      alert('Failed to update status.');
    }
  };

  // Generate AI Regional Analytics using server-side Gemini
  const handleGenerateAnalytics = async () => {
    if (!loggedInAdmin) return;
    setIsGeneratingAnalytics(true);
    setAiReport(null);

    // Filter relevant issues to send to Gemini
    const filteredIssues = getFilteredIssuesForAdmin();
    const issuesPayload = filteredIssues.map(i => ({
      category: i.category,
      description: i.description,
      status: i.status
    }));

    const territoryName = getAdminTerritoryName();

    try {
      const response = await fetch('/api/ai/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: loggedInAdmin.adminLevel,
          locationName: territoryName,
          issues: issuesPayload
        })
      });

      if (!response.ok) {
        throw new Error('Analytics generation failed');
      }

      const data = await response.json();
      setAiReport(data);
      confetti({ particleCount: 100, spread: 60, colors: ['#FF9933', '#000080', '#138808'] });
    } catch (e) {
      console.error(e);
      alert('Analytics server error. Showing local simulated AI governance recommendations!');
      
      // Fallback local simulation in case of connection limits
      setAiReport({
        majorProblems: [
          'High density of monsoon pavement decay in main transit corridors',
          'Drinking water pressure loss and leaking primary gate valves',
          'Aged solid waste collection schedule and processing delays'
        ],
        recommendedSolutions: [
          'Initiate cold-mix asphalt rapid patching on arterial roads',
          'Enact sub-surface valve diagnostics and pressure logging',
          'Optimize waste collection routes via automated telemetry'
        ],
        report: `### Simulated Administrative report for ${territoryName}\n\nOur simulated model indicates strong citizen involvement. Priority should be directed to repairing core public structures, which will boost Swachhta indicators by 12% in the coming quarter.`
      });
    } finally {
      setIsGeneratingAnalytics(false);
    }
  };

  // Get administrative territory name for label
  const getAdminTerritoryName = (): string => {
    if (!loggedInAdmin) return 'India';
    if (loggedInAdmin.adminLevel === 'country') return 'India (National Headquarters)';
    if (loggedInAdmin.adminLevel === 'state') return `${loggedInAdmin.state} State`;
    if (loggedInAdmin.adminLevel === 'district') return `${loggedInAdmin.district} District`;
    return `${loggedInAdmin.community} Ward`;
  };

  // Filter issues depending on current logged-in admin's scope
  const getFilteredIssuesForAdmin = (): IssueReport[] => {
    if (!loggedInAdmin) return [];
    if (loggedInAdmin.adminLevel === 'country') return allIssues;
    if (loggedInAdmin.adminLevel === 'state') return allIssues.filter(i => loggedInAdmin.state && (i.state === loggedInAdmin.state || (i.locationName || '').includes(loggedInAdmin.state)));
    if (loggedInAdmin.adminLevel === 'district') return allIssues.filter(i => loggedInAdmin.district && (i.district === loggedInAdmin.district || (i.locationName || '').includes(loggedInAdmin.district)));
    return allIssues.filter(i => loggedInAdmin.community && (i.community === loggedInAdmin.community || (i.locationName || '').includes(loggedInAdmin.community)));
  };

  const filteredIssues = getFilteredIssuesForAdmin();

  // Stats
  const pendingCount = filteredIssues.filter(i => i.status === 'pending').length;
  const assignedCount = filteredIssues.filter(i => i.status === 'assigned' || i.status === 'in-progress').length;
  const resolvedCount = filteredIssues.filter(i => i.status === 'completed' || i.status === 'closed').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {!loggedInAdmin ? (
        /* ADMIN AUTH PORTAL */
        <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden glow-green grid grid-cols-1 md:grid-cols-12">
          {/* Left Visual Column */}
          <div className="md:col-span-5 bg-gray-900 p-8 text-white flex flex-col justify-between relative overflow-hidden min-h-[400px]">
            <div className="absolute inset-0 bg-gradient-to-br from-india-green-900/50 via-gray-900 to-black opacity-80"></div>
            
            <div className="relative z-10 space-y-4">
              <span className="bg-saffron-500 text-[10px] uppercase tracking-wider font-mono font-bold px-2.5 py-1 rounded-full text-white inline-block">
                Administrative Hub
              </span>
              <h2 className="text-2xl font-bold font-display tracking-tight leading-snug">
                Smart Governance Console
              </h2>
              <p className="text-xs text-india-green-100 leading-relaxed">
                Authorized government and district management panel. Monitor real-time ward telemetry, approve municipal actions, and review citizen engagement stats.
              </p>
            </div>

            {/* Role Image Card */}
            <div className="relative z-10 my-6 h-36 rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-gray-900/40">
              <img 
                src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80" 
                alt="Government Admin Dashboard" 
                className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-500" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"></div>
              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px]">
                <span className="font-mono text-saffron-400 font-bold">📊 Analytics Grid</span>
                <span className="text-india-green-400 font-bold">★ Govt Administrator</span>
              </div>
            </div>

            <div className="relative z-10 space-y-2 text-[11px] text-india-green-100 border-t border-white/10 pt-4">
              <div className="flex items-center space-x-2">
                <span className="text-saffron-400">✓</span>
                <span>Oversee multi-district grievance metrics</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-saffron-400">✓</span>
                <span>Track budget, dispatch, & civic trends</span>
              </div>
            </div>
          </div>

          {/* Right Input Column */}
          <div className="md:col-span-7 p-8 flex flex-col justify-center">
            {authError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 font-medium flex items-center space-x-2">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {isLoginView ? (
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-gray-900">Sign In to Government Console</h3>
                  <p className="text-xs text-gray-400">Restricted to authorized administrative staff</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-india-green-600" />
                    <span>Government Email ID</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. amit.verma@gov.in"
                    className="w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-india-green-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5 text-india-green-600" />
                    <span>4-Digit Security PIN</span>
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-2xl text-center font-mono text-lg tracking-widest focus:ring-2 focus:ring-india-green-500 focus:outline-hidden"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 bg-india-green-500 text-white font-bold rounded-2xl text-xs hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 shadow-md"
                >
                  <span>Authenticate Securely</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginView(false);
                      setAuthError('');
                      setEmail('@gov.in');
                      setPin('');
                      setConfirmPin('');
                    }}
                    className="text-xs text-saffron-600 hover:text-saffron-700 font-bold"
                  >
                    Register a New Admin Level / Community →
                  </button>
                </div>


              </form>
            ) : (
              /* REGISTRATION */
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-saffron-500" />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Patil"
                    className="w-full px-4 py-2.5 text-xs text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                      <Mail className="w-3.5 h-3.5 text-saffron-500" />
                      <span>Email ID</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rajesh.patil@gov.in"
                      className="w-full px-4 py-2.5 text-xs text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:outline-hidden"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Governance Level</label>
                    <select
                      value={adminLevel}
                      onChange={(e) => setAdminLevel(e.target.value as AdminLevel)}
                      className="w-full p-2.5 text-gray-900 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden"
                    >
                      <option value="community">Community / Ward Head</option>
                      <option value="district">District Head (IAS/Collector)</option>
                      <option value="state">State Head (Chief Secretary)</option>
                      <option value="country">Country Head (National Admin)</option>
                    </select>
                  </div>
                </div>

                {adminLevel !== 'country' && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-600">State</label>
                      <select
                        value={selectedState}
                        onChange={(e) => {
                          setSelectedState(e.target.value);
                          const stateObj = INDIAN_REGIONS.find(r => r.state === e.target.value);
                          if (stateObj) {
                            setSelectedDistrict(stateObj.districts[0]);
                            setSelectedCommunity(stateObj.communities[0]);
                          }
                        }}
                        className="w-full p-2 text-gray-900 bg-gray-50 border border-gray-200 rounded-xl text-[11px] focus:outline-hidden"
                      >
                        {INDIAN_REGIONS.map(r => (
                          <option key={r.state} value={r.state}>{r.state}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-600">District</label>
                      <select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        disabled={adminLevel === 'state'}
                        className="w-full p-2 text-gray-900 bg-gray-50 border border-gray-200 rounded-xl text-[11px] focus:outline-hidden disabled:opacity-50"
                      >
                        {INDIAN_REGIONS.find(r => r.state === selectedState)?.districts.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-600">Ward</label>
                      <select
                        value={selectedCommunity}
                        onChange={(e) => setSelectedCommunity(e.target.value)}
                        disabled={adminLevel !== 'community'}
                        className="w-full p-2 text-gray-900 bg-gray-50 border border-gray-200 rounded-xl text-[11px] focus:outline-hidden disabled:opacity-50"
                      >
                        {INDIAN_REGIONS.find(r => r.state === selectedState)?.communities.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                      <Lock className="w-3.5 h-3.5 text-saffron-500" />
                      <span>Set Security PIN</span>
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="••••"
                      className="w-full px-4 py-2 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl text-center font-mono text-lg tracking-widest focus:ring-2 focus:ring-saffron-500 focus:outline-hidden"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                      <Lock className="w-3.5 h-3.5 text-saffron-500" />
                      <span>Confirm PIN</span>
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="••••"
                      className="w-full px-4 py-2 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl text-center font-mono text-lg tracking-widest focus:ring-2 focus:ring-saffron-500 focus:outline-hidden"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-india-green-500 text-white font-bold rounded-xl text-xs hover:scale-105 transition-all shadow-md"
                >
                  Create Official Credentials
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginView(true);
                      setAuthError('');
                      setEmail('');
                      setPin('');
                      setConfirmPin('');
                    }}
                    className="text-xs text-ashoka-600 hover:text-ashoka-700 font-bold"
                  >
                    Already registered? Sign In Instead
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* GOV ADMIN WORKSPACE */
        <div className="space-y-8">
          
          {/* Header Banner */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] text-india-green-600 font-bold uppercase tracking-wider font-mono">
                🇮🇳 Official Public Works Console
              </p>
              <h2 className="text-xl font-bold font-display text-gray-900 mt-1">
                {getAdminTerritoryName()}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Administrator: <strong className="text-gray-700">{loggedInAdmin.name}</strong> • Role Level: <span className="font-bold uppercase text-ashoka-600">{loggedInAdmin.adminLevel}</span>
              </p>
            </div>

            {/* Quick overview telemetry */}
            <div className="flex space-x-3 text-center shrink-0">
              <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-2xl">
                <p className="text-lg font-bold font-display text-red-600">{pendingCount}</p>
                <p className="text-[9px] text-gray-500 font-bold uppercase">Pending</p>
              </div>
              <div className="bg-saffron-50 border border-saffron-100 px-4 py-2 rounded-2xl">
                <p className="text-lg font-bold font-display text-saffron-600">{assignedCount}</p>
                <p className="text-[9px] text-gray-500 font-bold uppercase">Work Ongoing</p>
              </div>
              <div className="bg-india-green-50 border border-india-green-100 px-4 py-2 rounded-2xl">
                <p className="text-lg font-bold font-display text-india-green-600">{resolvedCount}</p>
                <p className="text-[9px] text-gray-500 font-bold uppercase">Resolved</p>
              </div>
            </div>
          </div>

          {/* District Issues Visualizations & Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Visual Charts */}
            <div className="lg:col-span-2 bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-teal-50/80 p-8 rounded-3xl border border-indigo-100 shadow-lg relative overflow-hidden backdrop-blur-md">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/60 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-200/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
              <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-teal-100/30 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 pointer-events-none" />

              <h3 className="text-lg font-black text-indigo-900 uppercase tracking-widest mb-2 flex items-center relative z-10">
                <TrendingUp className="w-6 h-6 mr-3 text-indigo-500 drop-shadow-sm" />
                Regional Public Works Analytics
              </h3>
              <p className="text-indigo-600/70 text-xs font-semibold mb-6 relative z-10">Real-time infrastructure health and resolution tracking across categories.</p>
              
              <div className="flex flex-wrap items-center gap-4 mb-6 relative z-10">
                {(() => {
                  const pending = filteredIssues.filter(i => i.status === 'pending').length;
                  const ongoing = filteredIssues.filter(i => i.status === 'assigned' || i.status === 'in-progress' || i.status === 'decision-pending').length;
                  const resolved = filteredIssues.filter(i => i.status === 'completed' || i.status === 'closed').length;
                  return (
                    <>
                      <div className="bg-white/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-rose-100 flex items-center shadow-sm">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-400 mr-3 shadow-[0_0_8px_rgba(251,113,133,0.6)]"></div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Pending</span>
                          <span className="text-xl font-black text-rose-500 font-mono leading-none">{pending}</span>
                        </div>
                      </div>
                      <div className="bg-white/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-amber-100 flex items-center shadow-sm">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 mr-3 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Ongoing</span>
                          <span className="text-xl font-black text-amber-500 font-mono leading-none">{ongoing}</span>
                        </div>
                      </div>
                      <div className="bg-white/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-teal-100 flex items-center shadow-sm">
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-400 mr-3 shadow-[0_0_8px_rgba(45,212,191,0.6)]"></div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Resolved</span>
                          <span className="text-xl font-black text-teal-500 font-mono leading-none">{resolved}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              
              <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-white shadow-sm relative z-10">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={(() => {
                      const categories = ['Potholes', 'Water Leakages', 'Damaged Streetlights', 'Waste Management', 'Public Infrastructure'];
                      return categories.map(cat => {
                        const catIssues = filteredIssues.filter(i => i.category === cat);
                        return {
                          name: cat,
                          pending: catIssues.filter(i => i.status === 'pending').length,
                          ongoing: catIssues.filter(i => i.status === 'assigned' || i.status === 'in-progress' || i.status === 'decision-pending').length,
                          resolved: catIssues.filter(i => i.status === 'completed' || i.status === 'closed').length,
                        };
                      }).filter(d => d.pending + d.ongoing + d.resolved > 0);
                    })()}
                    margin={{ top: 20, right: 20, left: -20, bottom: 20 }}
                    barSize={36}
                  >
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#CBD5E1" opacity={0.5} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} 
                      axisLine={false} 
                      tickLine={false} 
                      dy={10} 
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} 
                      axisLine={false} 
                      tickLine={false} 
                      allowDecimals={false} 
                    />
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(255, 255, 255, 0.4)' }} 
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '16px', border: '1px solid #E2E8F0', color: '#1E293B', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', backdropFilter: 'blur(8px)' }}
                      itemStyle={{ color: '#334155', fontSize: '13px', fontWeight: 500 }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '13px', color: '#475569', fontWeight: 600 }} />
                    <Bar dataKey="pending" name="Pending" stackId="a" fill="#FB7185" radius={[0, 0, 6, 6]} />
                    <Bar dataKey="ongoing" name="Ongoing" stackId="a" fill="#FBBF24" />
                    <Bar dataKey="resolved" name="Resolved" stackId="a" fill="#2DD4BF" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ward Leaderboard */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-3xl border border-amber-200/60 shadow-lg flex flex-col relative overflow-hidden backdrop-blur-sm">
              <div className="absolute -top-12 -right-12 p-4 opacity-[0.07] rotate-12 pointer-events-none">
                <Award className="w-56 h-56 text-orange-600" />
              </div>
              <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-orange-100/50 to-transparent pointer-events-none" />

              <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-1 flex items-center relative z-10">
                <Award className="w-5 h-5 mr-2 text-amber-500 drop-shadow-sm" />
                Ward Leaderboard
              </h3>
              <p className="text-[10px] text-amber-700/80 font-bold uppercase tracking-wider mb-6 relative z-10">Top Performing Communities</p>
              
              <div className="space-y-3 relative z-10 overflow-y-auto pr-2 max-h-80 custom-scrollbar">
                {(() => {
                  const wardStats = filteredIssues.reduce((acc, issue) => {
                    // Consider completed/closed as positive performance, or just total engagement.
                    // Let's rank by resolved issues.
                    const ward = getProperCommunity(issue);
                    if (!acc[ward]) {
                      acc[ward] = { name: ward, resolvedCount: 0, ongoingCount: 0, pendingCount: 0, totalCount: 0 };
                    }
                    acc[ward].totalCount++;
                    if (issue.status === 'completed' || issue.status === 'closed') {
                      acc[ward].resolvedCount++;
                    } else if (issue.status === 'pending') {
                      acc[ward].pendingCount++;
                    } else {
                      acc[ward].ongoingCount++;
                    }
                    return acc;
                  }, {} as Record<string, { name: string, resolvedCount: number, ongoingCount: number, pendingCount: number, totalCount: number }>);
                  
                  const sortedWards = Object.values(wardStats)
                    .sort((a, b) => b.resolvedCount - a.resolvedCount || b.totalCount - a.totalCount)
                    .slice(0, 5);

                  if (sortedWards.length === 0) {
                    return <p className="text-xs text-amber-600/50 italic text-center py-8">No data available.</p>;
                  }

                  const medals = ['🏆', '🥈', '🥉'];

                  return sortedWards.map((ward, idx) => (
                    <div key={idx} className="group flex items-center justify-between p-3.5 bg-white rounded-2xl border border-amber-100 shadow-xs hover:shadow-md hover:border-amber-300 transition-all duration-300 transform hover:-translate-y-0.5 relative overflow-hidden">
                      {idx === 0 && <div className="absolute inset-0 bg-gradient-to-r from-amber-100/50 to-transparent opacity-50"></div>}
                      <div className="flex items-center space-x-3 relative z-10 w-1/2">
                        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner ${idx === 0 ? 'bg-gradient-to-br from-yellow-200 to-amber-400 border border-amber-300 text-white' : idx === 1 ? 'bg-gradient-to-br from-gray-200 to-gray-400 border border-gray-300' : idx === 2 ? 'bg-gradient-to-br from-orange-200 to-orange-400 border border-orange-300' : 'bg-gray-50 border border-gray-200'}`}>
                          {idx < 3 ? medals[idx] : <span className="text-xs font-bold text-gray-500">{idx + 1}</span>}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-extrabold text-gray-800 truncate">{ward.name}</p>
                          <p className="text-[10px] text-gray-500 font-medium truncate">Resolution Rate: {Math.round((ward.resolvedCount / ward.totalCount) * 100)}%</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end space-x-2 lg:space-x-4 relative z-10">
                        <div className="text-center">
                          <p className="text-sm font-black text-rose-500 font-mono leading-none">{ward.pendingCount}</p>
                          <p className="text-[8px] text-rose-400 uppercase font-bold tracking-wider mt-1">Pending</p>
                        </div>
                        <div className="text-center border-l border-r border-gray-100 px-2 lg:px-4">
                          <p className="text-sm font-black text-amber-500 font-mono leading-none">{ward.ongoingCount}</p>
                          <p className="text-[8px] text-amber-400 uppercase font-bold tracking-wider mt-1">Ongoing</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-emerald-500 font-mono leading-none">{ward.resolvedCount}</p>
                          <p className="text-[8px] text-emerald-400 uppercase font-bold tracking-wider mt-1">Resolved</p>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

          </div>

            <>
              {/* AI DECISION ENGINE AND 3-MONTH PLAN */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-50 pb-4 gap-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-saffron-500" />
                      <span>Bharat AI Governance Advisory System</span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Instant synthesis of citizen-reported datasets to formulate 3-month action directives.
                    </p>
                  </div>

                  <button
                    onClick={handleGenerateAnalytics}
                    disabled={isGeneratingAnalytics}
                    className="px-4 py-2.5 bg-ashoka-500 hover:bg-ashoka-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 self-start md:self-auto shrink-0"
                  >
                    {isGeneratingAnalytics ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>AI Analyzing Territory...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Run AI Regional Analysis</span>
                      </>
                    )}
                  </button>
                </div>

                {aiReport ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-scale-up">
                    
                    {/* 3-Month Plan Action list */}
                    <div className="lg:col-span-7 space-y-5">
                      <div className="p-4 bg-saffron-50/50 border border-saffron-100 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-saffron-800 uppercase tracking-wider flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1 text-saffron-600" />
                          <span>Next 3 Months Action Plan for the Government</span>
                        </h4>
                        <div className="space-y-3">
                          {aiReport.recommendedSolutions.map((sol, index) => (
                            <div key={index} className="flex items-start space-x-3 bg-white p-3 rounded-xl border border-saffron-100">
                              <span className="w-6 h-6 rounded-full bg-saffron-100 text-saffron-700 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                                {index + 1}
                              </span>
                              <p className="text-xs font-semibold text-gray-700 leading-snug">{sol}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 bg-red-50/40 border border-red-100 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-1 text-red-500" />
                          <span>Top 3 Identified Territory Bottlenecks</span>
                        </h4>
                        <div className="space-y-2">
                          {aiReport.majorProblems.map((prob, idx) => (
                            <div key={idx} className="flex items-center space-x-2 text-xs text-gray-700 font-medium">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0"></span>
                              <span>{prob}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Markdown text report card */}
                    <div className="lg:col-span-5 bg-ashoka-50/30 border border-ashoka-100 rounded-2xl p-5 space-y-4">
                      <h4 className="text-xs font-bold text-ashoka-800 uppercase tracking-wider flex items-center">
                        <BookOpen className="w-4 h-4 mr-1 text-ashoka-600" />
                        <span>Executive AI Governance Brief</span>
                      </h4>
                      <div className="text-xs text-gray-600 leading-relaxed font-sans space-y-3 prose max-w-none">
                        <p className="whitespace-pre-line">{aiReport.report}</p>
                      </div>
                      <div className="pt-3 border-t border-ashoka-100 flex justify-between items-center text-[10px] text-gray-400 font-mono">
                        <span>Generated: Live Seva Core</span>
                        <span>Status: Actionable</span>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Info className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-bounce-short" />
                    <p className="text-xs text-gray-500 font-medium">Please click the button above to generate AI public works analytics and 3-month action plan for this territory!</p>
                  </div>
                )}
              </div>

              {/* MAIN ADMINISTRATIVE COMPLAINTS LIST */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <h3 className="text-base font-bold text-gray-900">Active Civic Grievances ({filteredIssues.length})</h3>

                {filteredIssues.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-8">No grievances filed in this administrative circle.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-500">
                      <thead className="bg-gray-50 text-gray-700 uppercase text-[10px] font-bold tracking-wider">
                        <tr>
                          <th className="px-4 py-3 rounded-l-lg">Reporter / Category</th>
                          <th className="px-4 py-3">Location Details</th>
                          <th className="px-4 py-3">Priority</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Technician Assigned</th>
                          <th className="px-4 py-3 rounded-r-lg text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredIssues.map(issue => (
                          <tr key={issue.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-4">
                              <p className="font-bold text-gray-900">{issue.category}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">By {issue.citizenName}</p>
                            </td>
                            <td className="px-4 py-4 max-w-xs">
                              <p className="truncate font-semibold text-gray-700">{issue.locationName}</p>
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5">Lat: {issue.latitude.toFixed(4)}</p>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                                issue.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-saffron-100 text-saffron-800'
                              }`}>
                                {issue.priority}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                issue.status === 'completed' || issue.status === 'closed'
                                  ? 'bg-india-green-50 text-india-green-700'
                                  : issue.status === 'decision-pending'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-saffron-50 text-saffron-700'
                              }`}>
                                {issue.status === 'decision-pending' ? 'Escalated' : issue.status}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-medium text-gray-800">
                                {issue.assignedTechnicianName || 'No technician assigned'}
                              </p>
                            </td>
                            <td className="px-4 py-4 text-right space-y-1.5">
                              
                              {/* Assign Technician Trigger */}
                              {loggedInAdmin.adminLevel === 'community' && (issue.status === 'pending' || !issue.assignedTechnicianId) && (
                                <div>
                                  {assigningIssueId === issue.id ? (
                                    <div className="flex items-center space-x-1.5 justify-end">
                                      <select
                                        value={selectedTechId}
                                        onChange={(e) => setSelectedTechId(e.target.value)}
                                        className="p-1.5 bg-white border rounded-lg text-xs"
                                      >
                                        <option value="">Select Technician</option>
                                        {technicians
                                          .filter(t => t.specialty === issue.category && t.community === loggedInAdmin.community)
                                          .map(t => (
                                            <option key={t.id} value={t.id}>{t.name} (★{t.rating})</option>
                                          ))}
                                        {/* Fallback to show any technician in case ward lacks specific specialty */}
                                        <option value="" disabled>-- Or other departments --</option>
                                        {technicians
                                          .filter(t => t.community === loggedInAdmin.community)
                                          .map(t => (
                                            <option key={t.id} value={t.id}>{t.name} ({t.specialty})</option>
                                          ))}
                                      </select>
                                      <button
                                        onClick={() => handleAssignSubmit(issue.id)}
                                        className="px-2.5 py-1.5 bg-ashoka-500 text-white font-bold text-[10px] rounded-lg"
                                      >
                                        Set
                                      </button>
                                      <button
                                        onClick={() => setAssigningIssueId(null)}
                                        className="text-xs text-gray-400 hover:text-gray-800"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setAssigningIssueId(issue.id);
                                        setSelectedTechId('');
                                      }}
                                      className="px-3 py-1.5 bg-saffron-500 hover:bg-saffron-600 text-white font-bold text-[10px] rounded-xl shadow-xs"
                                    >
                                      Assign Tech
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Resolve Escalation */}
                              {loggedInAdmin.adminLevel === 'community' && issue.status === 'decision-pending' && (
                                <button
                                  onClick={() => handleResolveEscalation(issue.id)}
                                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] rounded-xl shadow-xs"
                                >
                                  Resolve Escalation
                                </button>
                              )}

                              {/* Human Close Override */}
                              {loggedInAdmin.adminLevel === 'community' && (issue.status !== 'closed' && issue.status !== 'pending' && issue.status !== 'decision-pending') && (
                                <div>
                                  {overridingIssueId === issue.id ? (
                                    <div className="space-y-1 text-right">
                                      <input
                                        type="text"
                                        placeholder="Reason for manual close"
                                        value={overrideComment}
                                        onChange={(e) => setOverrideComment(e.target.value)}
                                        className="p-1.5 bg-white border rounded-lg text-xs w-full max-w-[200px]"
                                      />
                                      <div className="flex justify-end space-x-1.5">
                                        <button
                                          onClick={() => handleOverrideClose(issue.id)}
                                          className="px-2 py-1 bg-india-green-500 text-white font-bold text-[10px] rounded-lg"
                                        >
                                          Confirm Close
                                        </button>
                                        <button
                                          onClick={() => setOverridingIssueId(null)}
                                          className="text-[10px] text-gray-400"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setOverridingIssueId(issue.id);
                                        setOverrideComment('');
                                      }}
                                      className="px-3 py-1.5 bg-india-green-500 hover:bg-india-green-600 text-white font-bold text-[10px] rounded-xl shadow-xs"
                                    >
                                      Human Close Override
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Simple details link */}
                              <div className="text-[10px] text-gray-400 font-mono">
                                ID: {issue.id}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>

        </div>
      )}
    </div>
  );
}
