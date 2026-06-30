import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CitizenPortal from './components/CitizenPortal';
import TechnicianPortal from './components/TechnicianPortal';
import AdminPortal from './components/AdminPortal';
import StateHeadPortal from './components/StateHeadPortal';
import CountryHeadPortal from './components/CountryHeadPortal';
import { Citizen, Technician, AdminUser, IssueReport } from './types';
import { getIssuesList, seedFirebaseDatabase, subscribeToIssues } from './lib/firebase';
import { HelpCircle, Sparkles, Compass, Award, Shield, CheckCircle, Wrench, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  const [currentPortal, setCurrentPortal] = useState<'citizen' | 'technician' | 'admin'>('citizen');
  const [loggedInCitizen, setLoggedInCitizen] = useState<Citizen | null>(null);
  const [loggedInTechnician, setLoggedInTechnician] = useState<Technician | null>(null);
  const [loggedInAdmin, setLoggedInAdmin] = useState<AdminUser | null>(null);
  const [allIssues, setAllIssues] = useState<IssueReport[]>([]);
  const [isIssuesLoading, setIsIssuesLoading] = useState(true);

  // Load issues and run seeding on mount
  const loadIssues = async () => {
    setIsIssuesLoading(true);
    try {
      const list = await getIssuesList();
      setAllIssues(list);
    } catch (e) {
      console.warn('Adaptive loading notice (issues retrieved):', e);
    } finally {
      setIsIssuesLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    // Seed and load initial issues
    seedFirebaseDatabase().then(() => {
      loadIssues();
      unsubscribe = subscribeToIssues((list) => {
        setAllIssues(list);
        setIsIssuesLoading(false);
      });
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleLogout = () => {
    setLoggedInCitizen(null);
    setLoggedInTechnician(null);
    setLoggedInAdmin(null);
    confetti({ particleCount: 20, spread: 20 });
  };

  const handleUpdateUser = (updatedUser: any) => {
    if (updatedUser.role === 'citizen') {
      setLoggedInCitizen(updatedUser);
    } else if (updatedUser.role === 'technician') {
      setLoggedInTechnician(updatedUser);
    } else if (updatedUser.role === 'admin') {
      setLoggedInAdmin(updatedUser);
    }
    loadIssues();
  };

  const getLoggedInUser = () => {
    if (currentPortal === 'citizen') return loggedInCitizen;
    if (currentPortal === 'technician') return loggedInTechnician;
    return loggedInAdmin;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-between font-sans">
      
      {/* Top Navigation Panel */}
      <Navbar
        currentPortal={currentPortal}
        setCurrentPortal={setCurrentPortal}
        loggedInUser={getLoggedInUser()}
        onLogout={handleLogout}
        onUpdateUser={handleUpdateUser}
      />

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative" style={{ backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(255,153,51,0.03), transparent 60%)' }}>
        
        {/* Portal Information / Welcome Banner */}
        {!getLoggedInUser() && (
          <div className="flex flex-col mb-10 animate-fade-in relative z-10">
            {/* Banner Content */}
            <div className="p-8 bg-white border border-gray-100 rounded-t-3xl shadow-xs flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-radial-gradient from-gray-50/50 to-transparent"></div>
              <div className="relative space-y-3 text-center md:text-left">
                <span className="text-[10px] bg-saffron-100 text-saffron-800 font-bold px-3 py-1 rounded-full uppercase tracking-wider font-mono shadow-2xs">
                  Transforming Public Infrastructure
                </span>
                <h2 className="text-2xl font-bold font-display text-gray-900 tracking-tight">
                  Digital Citizen Engagement & Smart Governance for India
                </h2>
                <p className="text-sm text-gray-500 max-w-2xl leading-relaxed">
                  Bharat Seva is a localized grievance and infrastructure management utility. Report community problems like potholes or leakages, trigger AI diagnostics, and help municipal technicians resolve issues seamlessly.
                </p>
              </div>
              
              <div className="relative grid grid-cols-3 gap-4 w-full md:w-auto text-center font-mono shrink-0">
                <div className="p-4 bg-saffron-50 rounded-2xl border border-saffron-100/50 hover:scale-105 transition-transform duration-300">
                  <p className="text-sm font-bold text-saffron-700">1. Citizen</p>
                  <p className="text-[11px] text-gray-400 mt-1">Reports Issues</p>
                </div>
                <div className="p-4 bg-ashoka-50 rounded-2xl border border-ashoka-100/50 hover:scale-105 transition-transform duration-300">
                  <p className="text-sm font-bold text-ashoka-700">2. Technician</p>
                  <p className="text-[11px] text-gray-400 mt-1">Fixes Faults</p>
                </div>
                <div className="p-4 bg-india-green-50 rounded-2xl border border-india-green-100/50 hover:scale-105 transition-transform duration-300">
                  <p className="text-sm font-bold text-india-green-700">3. Admin</p>
                  <p className="text-[11px] text-gray-400 mt-1">Governance</p>
                </div>
              </div>
            </div>

            {/* Portal Switcher Tabs */}
            <div className="bg-gray-50 border border-gray-100 border-t-0 rounded-b-3xl p-3 flex justify-center shadow-xs">
              <div className="inline-flex items-center p-1 bg-white border border-gray-200 rounded-2xl shadow-2xs w-full max-w-2xl">
                <button
                  id="portal-citizen-btn"
                  onClick={() => setCurrentPortal('citizen')}
                  className={`flex-1 flex flex-col items-center justify-center space-y-1 py-3 px-2 rounded-xl text-sm transition-all duration-300 ${
                    currentPortal === 'citizen'
                      ? 'bg-gradient-to-br from-saffron-50 to-white text-saffron-700 shadow-xs border border-saffron-200 font-bold scale-105 transform z-10'
                      : 'text-gray-500 font-medium hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Award className={`w-5 h-5 ${currentPortal === 'citizen' ? 'text-saffron-600' : 'text-gray-400'}`} />
                  <span>Citizen Portal</span>
                </button>

                <div className="w-px h-10 bg-gray-100 mx-1"></div>

                <button
                  id="portal-technician-btn"
                  onClick={() => setCurrentPortal('technician')}
                  className={`flex-1 flex flex-col items-center justify-center space-y-1 py-3 px-2 rounded-xl text-sm transition-all duration-300 ${
                    currentPortal === 'technician'
                      ? 'bg-gradient-to-br from-ashoka-50 to-white text-ashoka-700 shadow-xs border border-ashoka-200 font-bold scale-105 transform z-10'
                      : 'text-gray-500 font-medium hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Wrench className={`w-5 h-5 ${currentPortal === 'technician' ? 'text-ashoka-600' : 'text-gray-400'}`} />
                  <span>Technician Portal</span>
                </button>

                <div className="w-px h-10 bg-gray-100 mx-1"></div>

                <button
                  id="portal-admin-btn"
                  onClick={() => setCurrentPortal('admin')}
                  className={`flex-1 flex flex-col items-center justify-center space-y-1 py-3 px-2 rounded-xl text-sm transition-all duration-300 ${
                    currentPortal === 'admin'
                      ? 'bg-gradient-to-br from-india-green-50 to-white text-india-green-700 shadow-xs border border-india-green-200 font-bold scale-105 transform z-10'
                      : 'text-gray-500 font-medium hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <ShieldAlert className={`w-5 h-5 ${currentPortal === 'admin' ? 'text-india-green-600' : 'text-gray-400'}`} />
                  <span>Admin Portal</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Portal Renders */}
        {currentPortal === 'citizen' && (
          <CitizenPortal
            onLoginSuccess={(user) => setLoggedInCitizen(user)}
            loggedInCitizen={loggedInCitizen}
            allIssues={allIssues}
            onRefreshIssues={loadIssues}
          />
        )}

        {currentPortal === 'technician' && (
          <TechnicianPortal
            onLoginSuccess={(user) => setLoggedInTechnician(user)}
            loggedInTechnician={loggedInTechnician}
            allIssues={allIssues}
            onRefreshIssues={loadIssues}
          />
        )}

        {currentPortal === 'admin' && (
          loggedInAdmin?.adminLevel === 'country' ? (
            <CountryHeadPortal
              onLogout={() => setLoggedInAdmin(null)}
              loggedInAdmin={loggedInAdmin}
              allIssues={allIssues}
              onRefreshIssues={loadIssues}
            />
          ) : loggedInAdmin?.adminLevel === 'state' ? (
            <StateHeadPortal
              onLogout={() => setLoggedInAdmin(null)}
              loggedInAdmin={loggedInAdmin}
              allIssues={allIssues}
              onRefreshIssues={loadIssues}
            />
          ) : (
            <AdminPortal
              onLoginSuccess={(user) => setLoggedInAdmin(user)}
              loggedInAdmin={loggedInAdmin}
              allIssues={allIssues}
              onRefreshIssues={loadIssues}
            />
          )
        )}

      </main>

      {/* Flag-Themed Footer */}
      <footer className="bg-white border-t border-gray-100 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="flex items-center justify-center space-x-2 text-xs font-mono font-bold text-gray-500">
            <span className="text-saffron-500">Satyameva Jayate</span>
            <span>•</span>
            <span className="text-ashoka-500">Digital Swachh Bharat Grid</span>
            <span>•</span>
            <span className="text-india-green-500">Make India Great</span>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed max-w-md mx-auto">
            A secured, high-performance public utility portal engineered using Google Cloud Firestore and Gemini 2.5 generative models. Optimized for localized administrative diagnostics.
          </p>
        </div>
      </footer>
    </div>
  );
}
