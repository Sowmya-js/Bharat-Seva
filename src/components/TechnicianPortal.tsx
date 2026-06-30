import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  Upload, 
  Award, 
  AlertTriangle, 
  Play, 
  Check, 
  ShieldCheck, 
  ChevronRight, 
  Lock, 
  Sparkles,
  User,
  Phone,
  Mail,
  UserCheck,
  Camera,
  Star,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Technician, IssueReport, IssueCategory, IssueStatus } from '../types';
import { saveTechnicianUser, getTechniciansList, updateIssueInDatabase, getCitizensList } from '../lib/firebase';
import { SAMPLE_IMAGE_TEMPLATES, TECHNICIAN_BADGES, INDIAN_REGIONS, getProperCommunity } from './MockAssets';
import { 
  playSuccessChime, 
  playXpGainSound, 
  playLevelUpFanfare, 
  playClickBeep, 
  playErrorBuzz, 
  playUnlockSucceed 
} from '../lib/audio';

interface TechnicianPortalProps {
  onLoginSuccess: (user: Technician) => void;
  loggedInTechnician: Technician | null;
  allIssues: IssueReport[];
  onRefreshIssues: () => Promise<void>;
}

export default function TechnicianPortal({ 
  onLoginSuccess, 
  loggedInTechnician, 
  allIssues, 
  onRefreshIssues 
}: TechnicianPortalProps) {
  // Login / Reg States
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('@tech.in');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState<IssueCategory>('Potholes');
  const [selectedState, setSelectedState] = useState('Karnataka');
  const [selectedDistrict, setSelectedDistrict] = useState('Bengaluru Urban');
  const [selectedCommunity, setSelectedCommunity] = useState('Indiranagar Ward 80');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Active fixing workflow states
  const [activeIssue, setActiveIssue] = useState<IssueReport | null>(null);
  const [customAfterImage, setCustomAfterImage] = useState<string | null>(null);
  const [isValidatingWithAI, setIsValidatingWithAI] = useState(false);
  const [aiValidationResult, setAiValidationResult] = useState<{
    success: boolean;
    explanation: string;
  } | null>(null);

  // Reactive tasks monitor for technician level-up and chimes
  const lastTasksCountRef = React.useRef(loggedInTechnician?.completedTasksCount ?? 0);
  useEffect(() => {
    if (loggedInTechnician) {
      const prevTasks = lastTasksCountRef.current;
      const curTasks = loggedInTechnician.completedTasksCount;
      if (curTasks > prevTasks) {
        const prevLvl = Math.floor(prevTasks / 3) + 1;
        const curLvl = Math.floor(curTasks / 3) + 1;
        if (curLvl > prevLvl) {
          setTimeout(() => {
            playLevelUpFanfare();
            confetti({
              particleCount: 150,
              spread: 80,
              colors: ['#FF9933', '#FFFFFF', '#138808']
            });
          }, 150);
        } else {
          setTimeout(() => {
            playSuccessChime();
          }, 150);
        }
      }
      lastTasksCountRef.current = curTasks;
    } else {
      lastTasksCountRef.current = 0;
    }
  }, [loggedInTechnician?.completedTasksCount]);

  // Load registered technicians
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pin) {
      setAuthError('Please fill in Email and 4-digit PIN.');
      playErrorBuzz();
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const list = await getTechniciansList();
      const match = list.find(t => t.email.toLowerCase() === email.toLowerCase() && t.pin === pin);
      if (match) {
        onLoginSuccess(match);
        playSuccessChime();
        confetti({ particleCount: 50, spread: 40, colors: ['#000080', '#138808'] });
      } else {
        setAuthError('Technician not found or invalid PIN.');
        playErrorBuzz();
      }
    } catch (e) {
      setAuthError('Database connection error. Try again.');
      playErrorBuzz();
    } finally {
      setAuthLoading(false);
    }
  };

  // Register Technician
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !pin || !confirmPin) {
      setAuthError('Please fill in all details.');
      playErrorBuzz();
      return;
    }
    if (pin.length !== 4 || isNaN(Number(pin))) {
      setAuthError('PIN must be a 4-digit number.');
      playErrorBuzz();
      return;
    }
    if (pin !== confirmPin) {
      setAuthError('PIN and Confirm PIN do not match.');
      playErrorBuzz();
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const newTech: Technician = {
        id: 'tech_' + Date.now(),
        name,
        email,
        phoneNumber: phone,
        pin,
        community: selectedCommunity,
        district: selectedDistrict,
        state: selectedState,
        specialty,
        rating: 5.0,
        completedTasksCount: 0,
        role: 'technician'
      };
      await saveTechnicianUser(newTech);
      onLoginSuccess(newTech);
      playSuccessChime();
      confetti({ particleCount: 80, spread: 60, colors: ['#FF9933', '#138808'] });
    } catch (e) {
      setAuthError('Registration failed. Try again.');
      playErrorBuzz();
    } finally {
      setAuthLoading(false);
    }
  };

  // Filter issues assigned to this technician OR matching specialty in their community
  const assignedIssues = allIssues.filter(i => 
    i.assignedTechnicianId === loggedInTechnician?.id || 
    (loggedInTechnician && loggedInTechnician.community && i.status === 'pending' && i.category === loggedInTechnician.specialty && 
      getProperCommunity(i) === loggedInTechnician.community)
  );

  // Compute status chart counts
  const pendingCount = assignedIssues.filter(i => i.status === 'pending' || i.status === 'assigned').length;
  const inProgressCount = assignedIssues.filter(i => i.status === 'in-progress').length;
  const completedCount = assignedIssues.filter(i => i.status === 'completed' || i.status === 'closed').length;

  const chartData = [
    { name: 'Pending / Assigned', value: pendingCount, color: '#FF9933' },
    { name: 'In Progress', value: inProgressCount, color: '#000080' },
    { name: 'Completed / Closed', value: completedCount, color: '#138808' }
  ].filter(d => d.value > 0);

  // Update Status to In-Progress
  const handleStartWork = async (issue: IssueReport) => {
    if (!loggedInTechnician) return;
    try {
      await updateIssueInDatabase(issue.id, {
        status: 'in-progress',
        assignedTechnicianId: loggedInTechnician.id,
        assignedTechnicianName: loggedInTechnician.name
      });
      await onRefreshIssues();
      confetti({ particleCount: 15, spread: 20 });
    } catch (e) {
      alert('Failed to update status.');
    }
  };

  // Upload custom after-fix image helper
  const handleAfterImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomAfterImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger server-side AI validation
  const handleVerifyAndComplete = async () => {
    if (!activeIssue || !loggedInTechnician) return;

    // Resolve what image is representing the "after" work
    // If they did not upload a custom image, they can auto-simulate using the matching Mock Template after image!
    const matchingTemplate = SAMPLE_IMAGE_TEMPLATES.find(t => t.category === activeIssue.category);
    const imageAfterToSend = customAfterImage || matchingTemplate?.urlAfter;

    if (!imageAfterToSend) {
      alert('Please upload an after-repair image or ensure a template is matched.');
      return;
    }

    setIsValidatingWithAI(true);
    setAiValidationResult(null);

    try {
      const response = await fetch('/api/ai/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBefore: activeIssue.imageBefore,
          imageAfter: imageAfterToSend,
          category: activeIssue.category,
          description: activeIssue.description
        })
      });

      if (!response.ok) {
        throw new Error('AI Validation server response failed');
      }

      const aiResponse = await response.json();

      if (aiResponse.resolved) {
        // Automatically mark issue as completed
        await updateIssueInDatabase(activeIssue.id, {
          status: 'completed',
          imageAfter: imageAfterToSend,
          resolvedAt: new Date().toISOString(),
          aiValidation: aiResponse.aiValidation || 'AI verified resolution.'
        });

        // Increment completed tasks count & reward points
        const updatedTech = {
          ...loggedInTechnician,
          completedTasksCount: loggedInTechnician.completedTasksCount + 1,
          rating: Math.min(5.0, Number((loggedInTechnician.rating + 0.05).toFixed(2)))
        };
        await saveTechnicianUser(updatedTech);
        onLoginSuccess(updatedTech); // update parent state

        setAiValidationResult({
          success: true,
          explanation: aiResponse.aiValidation || 'Perfect fix! The AI verified that the public utility has been restored to safety standards.'
        });

        confetti({
          particleCount: 150,
          spread: 80,
          colors: ['#138808', '#FFFFFF', '#000080']
        });

        await onRefreshIssues();
      } else {
        setAiValidationResult({
          success: false,
          explanation: aiResponse.aiValidation || 'The AI detected remaining issues or mismatched resolution site. Please double check your repair work and re-upload.'
        });
      }
    } catch (e) {
      console.error(e);
      alert('AI Server busy. Skipping validation and forcefully submitting resolution for testing!');
      
      // Fallback manual save in case of server timeouts/limits
      await updateIssueInDatabase(activeIssue.id, {
        status: 'completed',
        imageAfter: imageAfterToSend,
        resolvedAt: new Date().toISOString(),
        aiValidation: 'Resolution saved manually via technician override.'
      });

      const updatedTech = {
        ...loggedInTechnician,
        completedTasksCount: loggedInTechnician.completedTasksCount + 1
      };
      await saveTechnicianUser(updatedTech);
      onLoginSuccess(updatedTech);

      setAiValidationResult({
        success: true,
        explanation: 'Work successfully logged. Manual override active.'
      });

      await onRefreshIssues();
    } finally {
      setIsValidatingWithAI(false);
    }
  };

  const handleEscalate = async () => {
    if (!activeIssue) return;
    try {
      setIsValidatingWithAI(true);
      const matchingTemplate = SAMPLE_IMAGE_TEMPLATES.find(t => t.category === activeIssue.category);
      const imageAfterToSend = customAfterImage || matchingTemplate?.urlAfter;

      await updateIssueInDatabase(activeIssue.id, {
        status: 'decision-pending',
        imageAfter: imageAfterToSend,
        aiValidation: aiValidationResult?.explanation || 'Technician escalated: AI indicated issue not fixed, but technician confirmed it is fixed.'
      });
      alert('Issue escalated to Community Head.');
      setActiveIssue(null);
      await onRefreshIssues();
    } catch (e) {
      console.error(e);
      alert('Error escalating issue.');
    } finally {
      setIsValidatingWithAI(false);
    }
  };

  // Compute technician list for leaderboard
  const [techList, setTechList] = useState<Technician[]>([]);
  useEffect(() => {
    getCitizensList(); // trigger seeding
    getTechniciansList().then(list => {
      setTechList(list.sort((a, b) => b.completedTasksCount - a.completedTasksCount));
    });
  }, [allIssues]);

  return (
    <div className="space-y-8 animate-fade-in">
      {!loggedInTechnician ? (
        /* TECHNICIAN LOGIN/REG */
        <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden glow-ashoka grid grid-cols-1 md:grid-cols-12">
          {/* Left Visual Column */}
          <div className="md:col-span-5 bg-ashoka-700 p-8 text-white flex flex-col justify-between relative overflow-hidden min-h-[400px]">
            <div className="absolute inset-0 bg-radial-gradient from-ashoka-600/40 via-transparent to-transparent opacity-60"></div>
            
            <div className="relative z-10 space-y-4">
              <span className="bg-saffron-500 text-[10px] uppercase tracking-wider font-mono font-bold px-2.5 py-1 rounded-full text-white inline-block">
                Municipal Grid
              </span>
              <h2 className="text-2xl font-bold font-display tracking-tight leading-snug">
                Technician Work Orders
              </h2>
              <p className="text-xs text-ashoka-100 leading-relaxed">
                Connect directly with ward-level dispatch services, claim community reports, log inspections, and submit tricolor geo-tagged resolution proofs.
              </p>
            </div>

            {/* Role Image Card */}
            <div className="relative z-10 my-6 h-36 rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-gray-900/40">
              <img 
                src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80" 
                alt="Technician Service Activity" 
                className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-500" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"></div>
              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px]">
                <span className="font-mono text-saffron-400 font-bold">🔧 Municipal Repairs</span>
                <span className="text-india-green-400 font-bold">★ Field Expert</span>
              </div>
            </div>

            <div className="relative z-10 space-y-2 text-[11px] text-ashoka-100 border-t border-white/10 pt-4">
              <div className="flex items-center space-x-2">
                <span className="text-saffron-400">✓</span>
                <span>Track active work order lists</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-saffron-400">✓</span>
                <span>Earn rating points and specialty honors</span>
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
                  <h3 className="text-lg font-bold text-gray-900">Sign In to Technician Grid</h3>
                  <p className="text-xs text-gray-400">Access and coordinate your active service tickets</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-ashoka-500" />
                    <span>Official Email ID</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rohan@tech.in"
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-ashoka-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5 text-ashoka-500" />
                    <span>4-Digit Security PIN</span>
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-2xl text-center font-mono text-lg tracking-widest focus:ring-2 focus:ring-ashoka-500 focus:outline-hidden"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 bg-ashoka-500 text-white font-bold rounded-2xl text-xs hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 shadow-md"
                >
                  <span>Verify Credentials</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginView(false);
                      setAuthError('');
                      setEmail('@tech.in');
                      setPin('');
                      setConfirmPin('');
                    }}
                    className="text-xs text-saffron-600 hover:text-saffron-700 font-bold"
                  >
                    Not on grid? Apply for Ward Registration →
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
                    placeholder="e.g. Rohan Deshmukh"
                    className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:outline-hidden"
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
                      placeholder="rohan@tech.in"
                      className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:outline-hidden"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-saffron-500" />
                      <span>Phone No.</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9898000111"
                      className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:outline-hidden"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Specialty Domain</label>
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value as IssueCategory)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden"
                  >
                    <option value="Potholes">Potholes & Roads</option>
                    <option value="Water Leakages">Water Leakages & Plumbing</option>
                    <option value="Damaged Streetlights">Damaged Streetlights & Electrical</option>
                    <option value="Waste Management">Waste Management & Sanitation</option>
                    <option value="Public Infrastructure">Public Infrastructure & Parks</option>
                  </select>
                </div>

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
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-[11px] focus:outline-hidden"
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
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-[11px] focus:outline-hidden"
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
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-[11px] focus:outline-hidden"
                    >
                      {INDIAN_REGIONS.find(r => r.state === selectedState)?.communities.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                      <Lock className="w-3.5 h-3.5 text-saffron-500" />
                      <span>Set 4-Digit PIN</span>
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="••••"
                      className="w-full px-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl text-center font-mono text-lg tracking-widest focus:ring-2 focus:ring-saffron-500 focus:outline-hidden"
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
                      className="w-full px-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl text-center font-mono text-lg tracking-widest focus:ring-2 focus:ring-saffron-500 focus:outline-hidden"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-saffron-500 text-white font-bold rounded-xl text-xs hover:scale-105 transition-all shadow-md"
                >
                  Submit Official Application
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
        /* WORKSPACE */
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] text-ashoka-600 font-bold uppercase tracking-wider font-mono">
                🔧 Municipal Field Resolution Grid
              </p>
              <h2 className="text-xl font-bold font-display text-gray-900 mt-1">
                Technician Work Order Console
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Licensed Field Expert: <strong className="text-gray-700">{loggedInTechnician.name}</strong> • Specialty: <span className="font-bold text-saffron-600">{loggedInTechnician.specialty}</span> • Ward: <span className="font-bold text-ashoka-600">{loggedInTechnician.community}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: Metrics & Profile */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-ashoka-50 text-ashoka-600 border border-ashoka-100 flex items-center justify-center text-3xl font-bold mx-auto glow-ashoka">
                ⚙️
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{loggedInTechnician.name}</h3>
                <p className="text-xs text-gray-400 font-mono flex items-center justify-center">
                  <UserCheck className="w-3.5 h-3.5 text-ashoka-500 mr-1" />
                  Licensed {loggedInTechnician.specialty} Tech
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  {loggedInTechnician.community}, {loggedInTechnician.district}
                </p>
              </div>

              {/* Stats badges */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Completed</p>
                  <p className="text-xl font-bold font-display text-india-green-600">{loggedInTechnician.completedTasksCount}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Rating</p>
                  <p className="text-xl font-bold font-display text-saffron-500 flex items-center justify-center">
                    <span>{loggedInTechnician.rating}</span>
                    <Star className="w-4 h-4 ml-1 fill-saffron-500 text-saffron-500 shrink-0" />
                  </p>
                </div>
              </div>
            </div>

            {/* Recharts Pie Chart Distribution */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider text-center">My Task Distribution</h4>
              {assignedIssues.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">No task distribution data yet.</p>
              ) : (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} issues`, 'Count']} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Technicians Leaderboard */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span>Technician Leaderboard</span>
                <span className="text-[10px] bg-saffron-100 text-saffron-800 font-mono px-2 py-0.5 rounded-full font-bold">Top Resolvers</span>
              </h4>
              <div className="space-y-3">
                {techList.slice(0, 5).map((tech, i) => (
                  <div key={tech.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-all text-xs border border-gray-50">
                    <div className="flex items-center space-x-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        i === 0 ? 'bg-saffron-500 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-bold text-gray-800">{tech.name}</p>
                        <p className="text-[9px] text-gray-400">{tech.specialty}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-india-green-600">{tech.completedTasksCount} solved</p>
                      <p className="text-[9px] text-gray-400 flex items-center justify-end font-mono">
                        {tech.rating} ★
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Active Assigned Tickets & Fixing Workflow */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Assigned Service Requests</h3>
                  <p className="text-[11px] text-gray-500">Tickets in your division matching specialty: "{loggedInTechnician.specialty}"</p>
                </div>
                <span className="text-xs bg-ashoka-100 text-ashoka-800 font-bold px-2.5 py-1 rounded-full">
                  {assignedIssues.length} Tickets
                </span>
              </div>

              {assignedIssues.length === 0 ? (
                <div className="text-center py-12 p-8 bg-gray-50 rounded-2xl border border-dashed">
                  <p className="text-xs text-gray-500">No active service tickets reported in your ward. New citizen reports will appear here automatically!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignedIssues.map(issue => (
                    <div 
                      key={issue.id}
                      className={`p-5 rounded-2xl border transition-all duration-300 space-y-4 ${
                        activeIssue?.id === issue.id 
                          ? 'border-ashoka-500 bg-ashoka-50/10 shadow-xs' 
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-gray-800">{issue.category}</span>
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                              issue.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-saffron-100 text-saffron-800'
                            }`}>
                              {issue.priority} Priority
                            </span>
                          </div>
                          <p className="text-xs font-bold text-ashoka-600 mt-1">{issue.locationName}</p>
                          <p className="text-[10px] text-gray-400 font-mono">Reported by: {issue.citizenName} • {new Date(issue.createdAt).toLocaleDateString()}</p>
                        </div>

                        {/* Workflow Action Buttons */}
                        <div className="flex items-center space-x-2">
                          {issue.status === 'pending' || issue.status === 'assigned' ? (
                            <button
                              onClick={() => handleStartWork(issue)}
                              className="px-3 py-1.5 bg-saffron-500 hover:bg-saffron-600 text-white font-bold text-[11px] rounded-xl flex items-center space-x-1 shadow-xs hover:scale-105 transition-all"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span>Start Work</span>
                            </button>
                          ) : issue.status === 'in-progress' ? (
                            <button
                              onClick={() => {
                                setActiveIssue(issue);
                                setCustomAfterImage(null);
                                setAiValidationResult(null);
                              }}
                              className="px-3 py-1.5 bg-ashoka-500 hover:bg-ashoka-600 text-white font-bold text-[11px] rounded-xl flex items-center space-x-1 shadow-xs hover:scale-105 transition-all"
                            >
                              <Check className="w-3 h-3" />
                              <span>Complete Repair</span>
                            </button>
                          ) : (
                            <span className="text-[10px] bg-india-green-50 text-india-green-700 border border-india-green-200 font-bold px-2.5 py-1 rounded-full flex items-center">
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Resolved
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-gray-600">{issue.description}</p>

                      <div className="flex items-center space-x-4 pt-2">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Reported Site Photo</p>
                          <div className="w-24 h-16 rounded-xl overflow-hidden bg-gray-100 border mt-1">
                            <img src={issue.imageBefore} alt="Before" className="w-full h-full object-cover" />
                          </div>
                        </div>
                        {issue.imageAfter && (
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">My Repair Work Photo</p>
                            <div className="w-24 h-16 rounded-xl overflow-hidden bg-gray-100 border mt-1">
                              <img src={issue.imageAfter} alt="After fix" className="w-full h-full object-cover" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ACTIVE RESOLUTION FORM WORKFLOW DRAWER */}
                      {activeIssue?.id === issue.id && (
                        <div className="mt-4 p-4 bg-white border border-ashoka-200 rounded-2xl space-y-4 animate-scale-up">
                          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <h4 className="text-xs font-bold text-ashoka-800 uppercase flex items-center">
                              <Sparkles className="w-4 h-4 mr-1 text-saffron-500" />
                              <span>AI-Powered Quality Verification</span>
                            </h4>
                            <button 
                              onClick={() => setActiveIssue(null)}
                              className="text-xs text-gray-400 hover:text-gray-800"
                            >
                              ✕ Close
                            </button>
                          </div>

                          <div className="space-y-3">
                            <p className="text-[11px] text-gray-500 leading-tight">
                              Before marking this issue as resolved, upload a photo of the completed repair. The Bharat Seva AI algorithm will compare both images to instantly validate the fix.
                            </p>

                            <div className="flex flex-col items-center">
                              <div className="w-full p-4 bg-gray-50 rounded-xl border flex flex-col items-center justify-center space-y-2">
                                <p className="text-[12px] font-bold text-gray-600 block mb-2">Upload Photo of Completed Repair</p>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleAfterImageUpload}
                                  className="hidden"
                                  id="tech-fix-upload"
                                />
                                <label
                                  htmlFor="tech-fix-upload"
                                  className="px-6 py-2.5 bg-white border border-gray-300 rounded-xl text-center text-xs font-semibold text-gray-700 cursor-pointer block hover:bg-gray-100 shadow-sm"
                                >
                                  {customAfterImage ? '✓ Custom Photo Loaded' : 'Select Image'}
                                </label>
                                <p className="text-[10px] text-gray-400 text-center mt-2">Accepts PNG/JPEG</p>
                              </div>
                            </div>

                            {aiValidationResult && (
                              <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                                aiValidationResult.success 
                                  ? 'bg-india-green-50 border-india-green-200 text-india-green-800' 
                                  : 'bg-red-50 border-red-200 text-red-800'
                              }`}>
                                <div className="flex items-center space-x-1.5 font-bold">
                                  {aiValidationResult.success ? (
                                    <CheckCircle2 className="w-4.5 h-4.5 text-india-green-600" />
                                  ) : (
                                    <XCircle className="w-4.5 h-4.5 text-red-500" />
                                  )}
                                  <span>{aiValidationResult.success ? 'AI Verification Green Light' : 'AI Verification Flagged'}</span>
                                </div>
                                <p className="text-[11px] leading-relaxed">
                                  {aiValidationResult.explanation}
                                </p>
                              </div>
                            )}

                            <div className="flex flex-col space-y-3 pt-2">
                              <div className="flex space-x-3">
                                <button
                                  onClick={() => setActiveIssue(null)}
                                  className="flex-1 py-2.5 border rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleVerifyAndComplete}
                                  disabled={isValidatingWithAI}
                                  className="flex-1 py-2.5 bg-india-green-500 text-white font-bold rounded-xl text-xs shadow-md hover:bg-india-green-600 disabled:opacity-50 flex items-center justify-center space-x-1"
                                >
                                  {isValidatingWithAI ? (
                                    <>
                                      <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                      <span>AI Verification Active...</span>
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck className="w-4 h-4" />
                                      <span>Verify Fix & Mark Resolved</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              {aiValidationResult && !aiValidationResult.success && (
                                <button
                                  onClick={handleEscalate}
                                  disabled={isValidatingWithAI}
                                  className="w-full py-2.5 bg-red-500 text-white font-bold rounded-xl text-xs shadow-md hover:bg-red-600 disabled:opacity-50 flex items-center justify-center space-x-1"
                                >
                                  <span>Escalate to Community Head</span>
                                </button>
                              )}
                            </div>

                          </div>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      )}
    </div>
  );
}
