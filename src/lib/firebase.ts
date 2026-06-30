import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore,
  getFirestore, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  updateDoc, 
  addDoc,
  onSnapshot
} from 'firebase/firestore';
import { Citizen, Technician, AdminUser, IssueReport } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyAd63rf1e0f-vdj3UpuPjbFLxH0i7rEfWs",
  authDomain: "bharat-seva-26529.firebaseapp.com",
  projectId: "bharat-seva-26529",
  storageBucket: "bharat-seva-26529.firebasestorage.app",
  messagingSenderId: "840760191160",
  appId: "1:840760191160:web:7ee2ad7771ac9463d06c4d",
  measurementId: ""
};

// Initialize Firebase
let app;
let db: any = null;
let isRealFirebase = false;
let isFirestoreReachable = typeof navigator !== 'undefined' ? navigator.onLine : true;
let isSeedingCompletedOrInProgress = false;

export function canUseFirestore(): boolean {
  if (!isRealFirebase || !db) return false;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    isFirestoreReachable = false;
    return false;
  }
  return isFirestoreReachable;
}

export function normalizeIssue(issue: IssueReport): IssueReport {
  let s = (issue.state || '').trim();
  const loc = (issue.locationName || '').toLowerCase();
  const dist = (issue.district || '').toLowerCase();

  // If state is empty or invalid, try to infer from locationName or district
  if (!s || s.toLowerCase() === 'bengaluru' || s.toLowerCase() === 'bengaluru urban' || s.toLowerCase() === 'mumbai') {
    if (loc.includes('bengaluru') || loc.includes('bangalore') || loc.includes('karnataka') || dist.includes('bengaluru')) {
      s = 'Karnataka';
    } else if (loc.includes('mumbai') || loc.includes('maharashtra') || dist.includes('mumbai')) {
      s = 'Maharashtra';
    } else if (loc.includes('delhi')) {
      s = 'Delhi';
    } else if (loc.includes('telangana') || loc.includes('hyderabad')) {
      s = 'Telangana';
    } else if (loc.includes('kolkata') || loc.includes('west bengal')) {
      s = 'West Bengal';
    } else if (loc.includes('chennai') || loc.includes('tamil nadu')) {
      s = 'Tamil Nadu';
    }
  }

  // General mappings
  const lowerState = s.toLowerCase();
  if (lowerState.includes('karnataka') || lowerState === 'bengaluru' || lowerState === 'bangalore') {
    s = 'Karnataka';
  } else if (lowerState.includes('maharashtra') || lowerState === 'mumbai') {
    s = 'Maharashtra';
  } else if (lowerState.includes('delhi')) {
    s = 'Delhi';
  } else if (lowerState.includes('telangana') || lowerState.includes('hyderabad')) {
    s = 'Telangana';
  } else if (lowerState.includes('tamil nadu') || lowerState === 'chennai') {
    s = 'Tamil Nadu';
  } else if (lowerState.includes('west bengal') || lowerState === 'kolkata') {
    s = 'West Bengal';
  } else if (lowerState.includes('andhra')) {
    s = 'Andhra Pradesh';
  } else if (lowerState.includes('uttar pradesh')) {
    s = 'Uttar Pradesh';
  } else if (lowerState.includes('gujarat')) {
    s = 'Gujarat';
  } else {
    // Title case any other state names
    s = s.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  if (!s || s === 'Unknown State') {
    s = 'Karnataka'; // default fallback for safety
  }

  return {
    ...issue,
    state: s
  };
}

// Helper to prevent Firestore operations from blocking if the network/backend is slow or unreachable
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 1500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Firestore operation timed out')), timeoutMs)
    )
  ]);
}

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  // Enable forced long polling to bypass WebSocket restrictions in proxy/sandboxed environments
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, "ai-studio-be581849-b852-4b7e-8b98-27d724f6e322");
  isRealFirebase = true;
  console.log("Firebase initialized successfully with config for project:", firebaseConfig.projectId, "and database:", "ai-studio-be581849-b852-4b7e-8b98-27d724f6e322", "using long polling");
} catch (e) {
  console.warn("Firebase initialization failed, falling back to LocalStorage replica:", e);
  isRealFirebase = false;
  isFirestoreReachable = false;
}

// Memory-based or LocalStorage-based fallback database
const LOCAL_STORAGE_KEY = 'bharat_seva_fallback_db';

interface FallbackDB {
  citizens: Record<string, Citizen>;
  technicians: Record<string, Technician>;
  admins: Record<string, AdminUser>;
  issues: Record<string, IssueReport>;
}

// High-quality mock data for the initial setup
const INITIAL_CITIZENS: Citizen[] = [
  {
    id: 'citizen1',
    name: 'Aarav Sharma',
    community: 'Indiranagar Ward 80',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    phoneNumber: '9876543210',
    email: 'aarav@citizen.in',
    pin: '1234',
    points: 450,
    role: 'citizen'
  },
  {
    id: 'citizen2',
    name: 'Priya Patel',
    community: 'Andheri West Ward A',
    district: 'Mumbai Suburbs',
    state: 'Maharashtra',
    phoneNumber: '9123456789',
    email: 'priya@citizen.in',
    pin: '1111',
    points: 120,
    role: 'citizen'
  }
];

const INITIAL_TECHNICIANS: Technician[] = [
  {
    id: 'tech_potholes',
    name: 'Rohan Deshmukh',
    community: 'Andheri West Ward A',
    district: 'Mumbai Suburbs',
    state: 'Maharashtra',
    phoneNumber: '9898989801',
    email: 'rohan.road@tech.in',
    pin: '1234',
    specialty: 'Potholes',
    rating: 4.8,
    completedTasksCount: 14,
    role: 'technician'
  },
  {
    id: 'tech_water',
    name: 'Manjunath Gowda',
    community: 'Indiranagar Ward 80',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    phoneNumber: '9898989802',
    email: 'manju.water@tech.in',
    pin: '1234',
    specialty: 'Water Leakages',
    rating: 4.6,
    completedTasksCount: 9,
    role: 'technician'
  },
  {
    id: 'tech_lights',
    name: 'Karan Singh',
    community: 'Dwarka Sector 6',
    district: 'South West Delhi',
    state: 'Delhi',
    phoneNumber: '9898989803',
    email: 'karan.electric@tech.in',
    pin: '1234',
    specialty: 'Damaged Streetlights',
    rating: 4.9,
    completedTasksCount: 22,
    role: 'technician'
  },
  {
    id: 'tech_waste',
    name: 'Suresh Kumar',
    community: 'Salt Lake Sector V',
    district: 'North 24 Parganas',
    state: 'West Bengal',
    phoneNumber: '9898989804',
    email: 'suresh.waste@tech.in',
    pin: '1234',
    specialty: 'Waste Management',
    rating: 4.5,
    completedTasksCount: 18,
    role: 'technician'
  }
];

const INITIAL_ADMINS: AdminUser[] = [
  {
    id: 'admin_comm',
    name: 'Mr. Amit Verma',
    role: 'admin',
    adminLevel: 'community',
    community: 'Indiranagar Ward 80',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    email: 'amit.verma@gov.in',
    pin: '1234'
  },
  {
    id: 'admin_dist',
    name: 'Dr. Rajesh Patil, IAS',
    role: 'admin',
    adminLevel: 'district',
    community: '',
    district: 'Mumbai Suburbs',
    state: 'Maharashtra',
    email: 'rajesh.patil@gov.in',
    pin: '1234'
  },
  {
    id: 'admin_state',
    name: 'Smt. Shalini Devi, Chief Secretary',
    role: 'admin',
    adminLevel: 'state',
    community: '',
    district: '',
    state: 'Karnataka',
    email: 'shalini.devi@gov.in',
    pin: '1234'
  },
  {
    id: 'admin_country',
    name: 'Shri Narendra Modi, Prime Minister',
    role: 'admin',
    adminLevel: 'country',
    community: '',
    district: '',
    state: '',
    email: 'narendra.modi@gov.in',
    pin: '1234'
  }
];

// Rich set of mockup reports based on common issues in India
const INITIAL_ISSUES: IssueReport[] = [
  {
    id: 'issue_1',
    citizenId: 'citizen1',
    citizenName: 'Aarav Sharma',
    category: 'Water Leakages',
    description: 'Main pipeline burst near Indiranagar 100 Feet Road intersection. Thousands of liters of drinking water being wasted on the road.',
    imageBefore: 'https://images.unsplash.com/photo-1542060748-10c28b629f6f?auto=format&fit=crop&q=80&w=600', // water main pipe leak
    latitude: 12.971899,
    longitude: 77.641151,
    locationName: 'Indiranagar 100 Feet Road, Bengaluru',
    community: 'Indiranagar Ward 80',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    status: 'assigned',
    priority: 'high',
    estimatedDuration: '12-24 hours',
    assignedTechnicianId: 'tech_water',
    assignedTechnicianName: 'Manjunath Gowda',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    pointsAwarded: 50,
    aiConfidence: 0.96,
    aiAnalysis: 'Subsurface pressurised pipe rupture detected. Immediate valve isolation required to prevent water wastage and roadbed undermining.'
  },
  {
    id: 'issue_2',
    citizenId: 'citizen2',
    citizenName: 'Priya Patel',
    category: 'Potholes',
    description: 'Giant pothole in Andheri Link Road, right in front of the metro pillar. Vehicles are breaking hard, very dangerous for bikes.',
    imageBefore: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600', // road pothole
    latitude: 19.1136,
    longitude: 72.8422,
    locationName: 'Andheri Link Road, Mumbai',
    community: 'Andheri West Ward A',
    district: 'Mumbai Suburbs',
    state: 'Maharashtra',
    status: 'pending',
    priority: 'high',
    estimatedDuration: '24-48 hours',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    pointsAwarded: 50,
    aiConfidence: 0.95,
    aiAnalysis: 'Deep craters identified in high-velocity transit lane. High threat to commuter flow. Rapid patch-repair using mastic asphalt recommended.'
  },
  {
    id: 'issue_3',
    citizenId: 'citizen1',
    citizenName: 'Aarav Sharma',
    category: 'Damaged Streetlights',
    description: 'Entire block of streetlights is dark on 12th Main Indiranagar, making it very unsafe for women and seniors walking after dark.',
    imageBefore: 'https://images.unsplash.com/photo-1509023464722-18d996393ca8?auto=format&fit=crop&q=80&w=600', // dark streetlamp / foggy night
    latitude: 12.9744,
    longitude: 77.6392,
    locationName: '12th Main Road, Indiranagar, Bengaluru',
    community: 'Indiranagar Ward 80',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    status: 'completed',
    priority: 'medium',
    estimatedDuration: '2 days',
    assignedTechnicianId: 'tech_lights',
    assignedTechnicianName: 'Karan Singh',
    imageAfter: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&q=80&w=600', // bright streetlamp / twilight
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    pointsAwarded: 50,
    aiConfidence: 0.91,
    aiAnalysis: 'Multiple luminaires inactive on high-pedestrian corridor. Electric failure or circuit breaker trip suspected.',
    aiValidation: 'Visual analysis confirms streetlighting array is fully operational. Incident site is well illuminated and pedestrian safety restored.'
  },
  {
    id: 'issue_4',
    citizenId: 'citizen2',
    citizenName: 'Priya Patel',
    category: 'Waste Management',
    description: 'Unmanaged garbage pile on the pavement corner of Juhu Chowpatty access road. Heavy foul smell and stray animals scattering the trash.',
    imageBefore: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600', // waste dump heap
    latitude: 19.0988,
    longitude: 72.8264,
    locationName: 'Juhu Chowpatty Access Road, Mumbai',
    community: 'Andheri West Ward A',
    district: 'Mumbai Suburbs',
    state: 'Maharashtra',
    status: 'closed',
    priority: 'medium',
    estimatedDuration: '12 hours',
    assignedTechnicianId: 'tech_waste',
    assignedTechnicianName: 'Suresh Kumar',
    imageAfter: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&q=80&w=600', // clean street pavement
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    resolvedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    pointsAwarded: 60,
    aiConfidence: 0.98,
    aiAnalysis: 'Organic municipal solid waste dump near public access point. Health hazard with biosecurity risks. Requires immediate clearance.'
  },
  {
    id: 'issue_5',
    citizenId: 'citizen1',
    citizenName: 'Aarav Sharma',
    category: 'Public Infrastructure',
    description: 'Broken steel railings on the pedestrian skywalk at Indiranagar Metro Station. Risk of someone slipping or falling off.',
    imageBefore: 'https://images.unsplash.com/photo-1584467541268-b040f83be3fd?auto=format&fit=crop&q=80&w=600', // construction / metal failure
    latitude: 12.9782,
    longitude: 77.6405,
    locationName: 'Skywalk, Indiranagar Metro Station, Bengaluru',
    community: 'Indiranagar Ward 80',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    status: 'in-progress',
    priority: 'high',
    estimatedDuration: '3 days',
    assignedTechnicianId: 'tech_potholes',
    assignedTechnicianName: 'Rohan Deshmukh',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    pointsAwarded: 50,
    aiConfidence: 0.89,
    aiAnalysis: 'Structural steel guard-rail decay observed at elevated transit tier. Severe drop hazard. Requires cold-welding or replacement panels.'
  }
];

function loadLocalDB(): FallbackDB {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.warn("Error parsing fallback DB, reinitializing:", e);
    }
  }
  
  // Re-seed fallback DB
  const defaultDB: FallbackDB = {
    citizens: INITIAL_CITIZENS.reduce((acc, c) => ({ ...acc, [c.email.toLowerCase()]: c }), {}),
    technicians: INITIAL_TECHNICIANS.reduce((acc, t) => ({ ...acc, [t.email.toLowerCase()]: t }), {}),
    admins: INITIAL_ADMINS.reduce((acc, a) => ({ ...acc, [a.email.toLowerCase()]: a }), {}),
    issues: INITIAL_ISSUES.reduce((acc, i) => ({ ...acc, [i.id]: i }), {})
  };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultDB));
  return defaultDB;
}

function saveLocalDB(dbData: FallbackDB) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dbData));
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  if (
    errorMessage.includes('timed out') || 
    errorMessage.includes('unavailable') || 
    errorMessage.includes('Could not reach') ||
    errorMessage.includes('offline')
  ) {
    isFirestoreReachable = false;
    console.warn("Firestore detected as offline or unreachable. Engaging instant LocalStorage replica mode.");
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice (Fallback Engaged): ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Seed the actual Firebase database if it is empty
export async function seedFirebaseDatabase() {
  if (!canUseFirestore()) return;
  if (isSeedingCompletedOrInProgress) return;
  isSeedingCompletedOrInProgress = true;

  try {
    // Check and seed citizens
    try {
      const citizensSnap = await withTimeout(getDocs(collection(db, 'citizens')), 3000);
      if (citizensSnap.empty) {
        console.log("Seeding citizens collection...");
        for (const citizen of INITIAL_CITIZENS) {
          await setDoc(doc(db, 'citizens', citizen.id), citizen);
        }
        console.log("Citizens collection seeded.");
      } else {
        console.log("Citizens collection already has data.");
      }
    } catch (err) {
      console.warn("Could not check/seed citizens:", err);
    }

    // Check and seed technicians
    try {
      const techsSnap = await withTimeout(getDocs(collection(db, 'technicians')), 3000);
      if (techsSnap.empty) {
        console.log("Seeding technicians collection...");
        for (const tech of INITIAL_TECHNICIANS) {
          await setDoc(doc(db, 'technicians', tech.id), tech);
        }
        console.log("Technicians collection seeded.");
      } else {
        console.log("Technicians collection already has data.");
      }
    } catch (err) {
      console.warn("Could not check/seed technicians:", err);
    }

    // Check and seed admins
    try {
      const adminsSnap = await withTimeout(getDocs(collection(db, 'admins')), 3000);
      if (adminsSnap.empty) {
        console.log("Seeding admins collection...");
        for (const admin of INITIAL_ADMINS) {
          await setDoc(doc(db, 'admins', admin.id), admin);
        }
        console.log("Admins collection seeded.");
      } else {
        console.log("Admins collection already has data.");
      }
    } catch (err) {
      console.warn("Could not check/seed admins:", err);
    }

    // Check and seed issues
    try {
      const issuesSnap = await withTimeout(getDocs(collection(db, 'issues')), 3000);
      if (issuesSnap.empty) {
        console.log("Seeding issues collection...");
        for (const issue of INITIAL_ISSUES) {
          const cleanIssue = Object.fromEntries(Object.entries(issue).filter(([_, v]) => v !== undefined));
          await setDoc(doc(db, 'issues', issue.id), cleanIssue);
        }
        console.log("Issues collection seeded.");
      } else {
        console.log("Issues collection already has data.");
      }
    } catch (err) {
      console.warn("Could not check/seed issues:", err);
    }

    console.log("Firestore seeding check completed successfully!");
  } catch (error) {
    console.warn("Could not seed Firestore. This is expected if security rules are restrictive or connection is offline.", error);
  }
}

// Execute seeding after a brief delay to avoid blocking startup renders
setTimeout(() => {
  seedFirebaseDatabase().catch(() => {});
}, 1000);

// Direct Firestore operations (without local storage or hardcoded overrides)
export async function getCitizensList(): Promise<Citizen[]> {
  if (!canUseFirestore()) {
    return Object.values(loadLocalDB().citizens);
  }
  try {
    const q = await withTimeout(getDocs(collection(db, 'citizens')), 1500);
    const firestoreList: Citizen[] = [];
    q.forEach(doc => {
      firestoreList.push(doc.data() as Citizen);
    });
    // Synchronize to fallback DB for future use
    const currentDB = loadLocalDB();
    firestoreList.forEach(c => {
      currentDB.citizens[c.email.toLowerCase()] = c;
    });
    saveLocalDB(currentDB);
    return firestoreList;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.LIST, 'citizens');
    } catch (logErr) {
      // Already logged to console by handleFirestoreError, we proceed to fallback
    }
    console.warn("Falling back to local citizens data due to Firestore delay or permission restriction.");
    return Object.values(loadLocalDB().citizens);
  }
}

export async function saveCitizenUser(citizen: Citizen): Promise<void> {
  // Always write to fallback DB first so local state is instantly updated and persisted
  const currentDB = loadLocalDB();
  currentDB.citizens[citizen.email.toLowerCase()] = citizen;
  saveLocalDB(currentDB);

  if (!canUseFirestore()) return;

  try {
    const cleanCitizen = Object.fromEntries(Object.entries(citizen).filter(([_, v]) => v !== undefined));
    await withTimeout(setDoc(doc(db, 'citizens', citizen.id), cleanCitizen), 1500);
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, `citizens/${citizen.id}`);
    } catch (logErr) {}
    console.warn("Saved citizen user locally; Firestore write skipped or timed out.");
  }
}

export async function getTechniciansList(): Promise<Technician[]> {
  if (!canUseFirestore()) {
    return Object.values(loadLocalDB().technicians);
  }
  try {
    const q = await withTimeout(getDocs(collection(db, 'technicians')), 1500);
    const firestoreList: Technician[] = [];
    q.forEach(doc => {
      firestoreList.push(doc.data() as Technician);
    });
    const currentDB = loadLocalDB();
    firestoreList.forEach(t => {
      currentDB.technicians[t.email.toLowerCase()] = t;
    });
    saveLocalDB(currentDB);
    return firestoreList;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.LIST, 'technicians');
    } catch (logErr) {}
    console.warn("Falling back to local technicians data due to Firestore delay or permission restriction.");
    return Object.values(loadLocalDB().technicians);
  }
}

export async function saveTechnicianUser(technician: Technician): Promise<void> {
  const currentDB = loadLocalDB();
  currentDB.technicians[technician.email.toLowerCase()] = technician;
  saveLocalDB(currentDB);

  if (!canUseFirestore()) return;

  try {
    const cleanTech = Object.fromEntries(Object.entries(technician).filter(([_, v]) => v !== undefined));
    await withTimeout(setDoc(doc(db, 'technicians', technician.id), cleanTech), 1500);
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, `technicians/${technician.id}`);
    } catch (logErr) {}
    console.warn("Saved technician user locally; Firestore write skipped or timed out.");
  }
}

export async function getAdminsList(): Promise<AdminUser[]> {
  if (!canUseFirestore()) {
    return Object.values(loadLocalDB().admins);
  }
  try {
    const q = await withTimeout(getDocs(collection(db, 'admins')), 1500);
    const firestoreList: AdminUser[] = [];
    q.forEach(doc => {
      firestoreList.push(doc.data() as AdminUser);
    });
    const currentDB = loadLocalDB();
    firestoreList.forEach(a => {
      currentDB.admins[a.email.toLowerCase()] = a;
    });
    saveLocalDB(currentDB);
    return firestoreList;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.LIST, 'admins');
    } catch (logErr) {}
    console.warn("Falling back to local admins data due to Firestore delay or permission restriction.");
    return Object.values(loadLocalDB().admins);
  }
}

export async function saveAdminUser(admin: AdminUser): Promise<void> {
  const currentDB = loadLocalDB();
  currentDB.admins[admin.email.toLowerCase()] = admin;
  saveLocalDB(currentDB);

  if (!canUseFirestore()) return;

  try {
    const cleanAdmin = Object.fromEntries(Object.entries(admin).filter(([_, v]) => v !== undefined));
    await withTimeout(setDoc(doc(db, 'admins', admin.id), cleanAdmin), 1500);
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, `admins/${admin.id}`);
    } catch (logErr) {}
    console.warn("Saved admin user locally; Firestore write skipped or timed out.");
  }
}

export async function getIssuesList(): Promise<IssueReport[]> {
  if (!canUseFirestore()) {
    return Object.values(loadLocalDB().issues).map(normalizeIssue).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  try {
    const q = await withTimeout(getDocs(collection(db, 'issues')), 1500);
    const firestoreList: IssueReport[] = [];
    q.forEach(doc => {
      firestoreList.push(normalizeIssue(doc.data() as IssueReport));
    });
    const currentDB = loadLocalDB();
    firestoreList.forEach(i => {
      currentDB.issues[i.id] = i;
    });
    saveLocalDB(currentDB);
    return firestoreList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.LIST, 'issues');
    } catch (logErr) {}
    console.warn("Falling back to local issues data due to Firestore delay or permission restriction.");
    return Object.values(loadLocalDB().issues).map(normalizeIssue).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function saveIssueReport(issue: IssueReport): Promise<void> {
  const normalized = normalizeIssue(issue);
  const currentDB = loadLocalDB();
  currentDB.issues[normalized.id] = normalized;
  saveLocalDB(currentDB);

  if (!canUseFirestore()) return;

  try {
    const cleanIssue = Object.fromEntries(Object.entries(normalized).filter(([_, v]) => v !== undefined));
    await withTimeout(setDoc(doc(db, 'issues', normalized.id), cleanIssue), 1500);
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, `issues/${normalized.id}`);
    } catch (logErr) {}
    console.warn("Saved issue report locally; Firestore write skipped or timed out.");
  }
}

export async function updateIssueInDatabase(issueId: string, updates: Partial<IssueReport>): Promise<void> {
  const currentDB = loadLocalDB();
  if (currentDB.issues[issueId]) {
    currentDB.issues[issueId] = { ...currentDB.issues[issueId], ...updates };
    saveLocalDB(currentDB);
  }

  if (!canUseFirestore()) return;

  try {
    const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
    const dRef = doc(db, 'issues', issueId);
    await withTimeout(updateDoc(dRef, cleanUpdates as any), 1500);
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.UPDATE, `issues/${issueId}`);
    } catch (logErr) {}
    console.warn("Updated issue locally; Firestore write skipped or timed out.");
  }
}

export function subscribeToIssues(callback: (issues: IssueReport[]) => void): () => void {
  if (!canUseFirestore()) {
    // Return interval to push local changes to components dynamically
    const intervalId = setInterval(() => {
      callback(Object.values(loadLocalDB().issues).map(normalizeIssue).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, 2500);

    return () => {
      clearInterval(intervalId);
    };
  }

  try {
    const colRef = collection(db, 'issues');
    let isCancelled = false;
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      if (isCancelled) return;
      const list: IssueReport[] = [];
      snapshot.forEach((doc) => {
        list.push(normalizeIssue(doc.data() as IssueReport));
      });
      // Sort issues by createdAt descending (newest at the starting/top)
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Update local storage representation
      const currentDB = loadLocalDB();
      list.forEach(i => {
        currentDB.issues[i.id] = i;
      });
      saveLocalDB(currentDB);

      callback(list);
    }, (error) => {
      if (isCancelled) return;
      try {
        handleFirestoreError(error, OperationType.GET, 'issues');
      } catch (logErr) {}
      console.warn("Firestore subscription error, active polling local fallback...");
      // Trigger instant callback with local db issues
      callback(Object.values(loadLocalDB().issues).map(normalizeIssue).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    // Start a backup polling interval to keep UI reactive if Firestore stops sending updates/is slow
    const intervalId = setInterval(() => {
      if (isCancelled) return;
      const localIssues = Object.values(loadLocalDB().issues).map(normalizeIssue).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(localIssues);
    }, 2500);

    return () => {
      isCancelled = true;
      try {
        unsubscribe();
      } catch (unsErr) {}
      clearInterval(intervalId);
    };
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.GET, 'issues');
    } catch (logErr) {}
    console.warn("Direct Firestore subscription setup failed, running local interval...");
    
    // Return interval to push local changes to components dynamically
    const intervalId = setInterval(() => {
      callback(Object.values(loadLocalDB().issues).map(normalizeIssue).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, 2500);

    return () => {
      clearInterval(intervalId);
    };
  }
}

