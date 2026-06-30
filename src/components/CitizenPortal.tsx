import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  MapPin, 
  Upload, 
  Compass, 
  Trophy, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  PlusCircle, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  Sparkles, 
  ChevronRight, 
  ArrowRight,
  Eye,
  Check,
  Zap,
  Volume2,
  Flame,
  Star,
  Award,
  ThumbsUp,
  TrendingUp,
  Heart,
  Video,
  Square
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Citizen, IssueReport, IssueCategory, IssuePriority } from '../types';
import { saveCitizenUser, getCitizensList, saveIssueReport, updateIssueInDatabase } from '../lib/firebase';
import { SAMPLE_IMAGE_TEMPLATES, INDIAN_REGIONS, CITIZEN_BADGES, getProperCommunity } from './MockAssets';
import { 
  playSuccessChime, 
  playXpGainSound, 
  playLevelUpFanfare, 
  playClickBeep, 
  playErrorBuzz, 
  playUnlockSucceed 
} from '../lib/audio';

const ALL_CIVIC_MISSIONS = [
  { id: 1, title: 'Road Safety Patrol', text: 'Report a pothole in your ward', xp: 50, check: (issues: IssueReport[]) => issues.some(i => i.category === 'Potholes') },
  { id: 2, title: 'Water Warrior', text: 'Report a water leak or drainage issue', xp: 50, check: (issues: IssueReport[]) => issues.some(i => i.category === 'Water Leakages') },
  { id: 3, title: 'Light Up The Streets', text: 'Report an unlit streetlamp', xp: 50, check: (issues: IssueReport[]) => issues.some(i => i.category === 'Damaged Streetlights') },
  { id: 4, title: 'Swachhta Ambassador', text: 'Report a waste accumulation issue', xp: 50, check: (issues: IssueReport[]) => issues.some(i => i.category === 'Waste Management') },
  { id: 5, title: 'Critical Watch', text: 'Report a high priority civic issue', xp: 100, check: (issues: IssueReport[]) => issues.some(i => i.priority === 'high') },
  { id: 6, title: 'First Steps', text: 'File your first report of the day', xp: 30, check: (issues: IssueReport[]) => issues.length > 0 },
];

interface CitizenPortalProps {
  onLoginSuccess: (user: Citizen) => void;
  loggedInCitizen: Citizen | null;
  allIssues: IssueReport[];
  onRefreshIssues: () => Promise<void>;
}

export default function CitizenPortal({ 
  onLoginSuccess, 
  loggedInCitizen, 
  allIssues, 
  onRefreshIssues 
}: CitizenPortalProps) {
  // Login / Reg form states
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('@citizen.in');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedState, setSelectedState] = useState('Karnataka');
  const [selectedDistrict, setSelectedDistrict] = useState('Bengaluru Urban');
  const [selectedCommunity, setSelectedCommunity] = useState('Indiranagar Ward 80');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
  // Registration Verification workflow
  const [regStep, setRegStep] = useState(1); // 1 = Details, 2 = Email Verification Simulated OTP
  const [otpInput, setOtpInput] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState(false);

  // Issue Reporting states
  const [description, setDescription] = useState('');
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customVideo, setCustomVideo] = useState<string | null>(null);
  const [lat, setLat] = useState<number>(12.9716);
  const [lng, setLng] = useState<number>(77.5946);
  const [locationName, setLocationName] = useState('Bengaluru, Karnataka');
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<IssueReport | null>(null);

  // Camera & Video Capture states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<any | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeMediaTab, setActiveMediaTab] = useState<'upload' | 'camera'>('upload');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<any>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Resident Telemetry Unlock state
  const [isVerifiedResident, setIsVerifiedResident] = useState(true);
  const [isUnlockingLoading, setIsUnlockingLoading] = useState(false);
  const [residentVerificationCode, setResidentVerificationCode] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Points & Level monitoring for gamification audio and visuals
  const lastPointsRef = React.useRef(loggedInCitizen?.points ?? 0);
  useEffect(() => {
    if (loggedInCitizen) {
      const prevPoints = lastPointsRef.current;
      const prevLvl = Math.floor(prevPoints / 200) + 1;
      const curLvl = Math.floor(loggedInCitizen.points / 200) + 1;
      
      if (curLvl > prevLvl) {
        // Level up!
        setTimeout(() => {
          playLevelUpFanfare();
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        }, 150);
      } else if (loggedInCitizen.points > prevPoints) {
        // Points gain
        setTimeout(() => {
          playXpGainSound();
        }, 150);
      }
      lastPointsRef.current = loggedInCitizen.points;
    } else {
      lastPointsRef.current = 0;
    }
  }, [loggedInCitizen?.points]);

  // Gamified Co-signing / Supporting community noticeboard state
  const [upvotedIssueIds, setUpvotedIssueIds] = useState<string[]>([]);
  const [citizens, setCitizens] = useState<Citizen[]>([]);

  // Synchronize upvotedIssueIds with allIssues supporters
  useEffect(() => {
    if (loggedInCitizen && allIssues) {
      const userUpvoted = allIssues
        .filter(issue => issue.supporters?.includes(loggedInCitizen.id))
        .map(issue => issue.id);
      setUpvotedIssueIds(userUpvoted);
    }
  }, [allIssues, loggedInCitizen?.id]);

  useEffect(() => {
    if (loggedInCitizen) {
      const fetchCitizens = async () => {
        try {
          const list = await getCitizensList();
          setCitizens(list);
        } catch (error) {
          console.error("Failed to load citizens for leaderboard:", error);
        }
      };
      fetchCitizens();
    }
  }, [loggedInCitizen?.points, loggedInCitizen?.community]);

  const handleSupportIssue = async (issueId: string) => {
    if (upvotedIssueIds.includes(issueId)) return;
    
    if (loggedInCitizen) {
      // Find the issue to update its supporters
      const targetIssue = allIssues.find(i => i.id === issueId);
      if (targetIssue) {
        const currentSupporters = targetIssue.supporters || [];
        if (!currentSupporters.includes(loggedInCitizen.id)) {
          const updatedSupporters = [...currentSupporters, loggedInCitizen.id];
          await updateIssueInDatabase(issueId, { supporters: updatedSupporters });
          if (onRefreshIssues) {
            await onRefreshIssues();
          }
        }
      }

      const updated = {
        ...loggedInCitizen,
        points: loggedInCitizen.points + 10 // reward +10 Pts for civic validation!
      };
      await saveCitizenUser(updated);
      onLoginSuccess(updated);
      setUpvotedIssueIds(prev => [...prev, issueId]);
      
      // Fun feedback
      playXpGainSound();
      confetti({
        particleCount: 30,
        spread: 30,
        colors: ['#FF9933', '#138808']
      });
    }
  };

  // Load registered citizens on mount to support instant login check
  useEffect(() => {
    if (loggedInCitizen) {
      // Apply defaults from citizen profile
      setSelectedState(loggedInCitizen.state);
      setSelectedDistrict(loggedInCitizen.district);
      setSelectedCommunity(loggedInCitizen.community);
    }
  }, [loggedInCitizen]);

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pin) {
      setAuthError('Please fill in both Email and 4-digit PIN.');
      playErrorBuzz();
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const list = await getCitizensList();
      const match = list.find(c => c.email.toLowerCase() === email.toLowerCase() && c.pin === pin);
      if (match) {
        onLoginSuccess(match);
        playSuccessChime();
        confetti({ particleCount: 60, spread: 50, colors: ['#FF9933', '#138808'] });
      } else {
        setAuthError('Invalid email or PIN. If you are new, click Register below.');
        playErrorBuzz();
      }
    } catch (e) {
      setAuthError('Connection error. Please try again.');
      playErrorBuzz();
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Direct Registration
  const handleRegistrationSubmit = async (e: React.FormEvent) => {
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
      const newCitizen: Citizen = {
        id: 'cit_' + Date.now(),
        name,
        email,
        phoneNumber: phone,
        pin,
        state: selectedState,
        district: selectedDistrict,
        community: selectedCommunity,
        points: 100, // starting gift
        role: 'citizen'
      };
      await saveCitizenUser(newCitizen);
      onLoginSuccess(newCitizen);
      playSuccessChime();
      confetti({ particleCount: 100, spread: 70, colors: ['#FF9933', '#FFFFFF', '#138808'] });
    } catch (e) {
      setAuthError('Registration failed. Please try again.');
      playErrorBuzz();
    } finally {
      setAuthLoading(false);
    }
  };

  // Precision Geo GPS tagging using live system/mobile sensor APIs
  const handleAutoGps = () => {
    setIsGpsLoading(true);
    if (!navigator.geolocation) {
      alert('Error: Geolocation is not supported by your current system or mobile device browser.');
      setIsGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setLat(latitude);
        setLng(longitude);
        
        // Fetch accurate system/mobile location name via OpenStreetMap Nominatim reverse geocoding
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`)
          .then(res => res.json())
          .then(data => {
            if (data && data.display_name) {
              setLocationName(data.display_name);
            } else {
              setLocationName(`GPS Lock (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
            }
            setIsGpsLoading(false);
          })
          .catch(() => {
            setLocationName(`GPS Lock (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
            setIsGpsLoading(false);
          });
          
        confetti({ particleCount: 30, spread: 45, colors: ['#FF9933', '#FFFFFF', '#138808'] });
      },
      (err) => {
        setIsGpsLoading(false);
        let errorMsg = 'Could not retrieve your system/mobile location.';
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = 'Location permission was denied. Please allow location access in your browser/device settings to get accurate GPS tagging.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information is unavailable. Please ensure your device GPS/Location Services are turned on.';
        } else if (err.code === err.TIMEOUT) {
          errorMsg = 'The request to retrieve system location timed out. Please try again.';
        }
        alert(`Precision GPS Error: ${errorMsg}`);
        playErrorBuzz();
      },
      { 
        enableHighAccuracy: true, // Forces precise system or mobile GPS hardware tracking
        timeout: 12000,           // 12 second limit to secure a solid lock
        maximumAge: 0            // Forces device to retrieve the latest real-time coordinate rather than cached data
      }
    );
  };

  // Custom Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Custom Video Upload Handler
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomVideo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Camera Helper Functions
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Error playing video stream:", e));
        }
      }, 100);
    } catch (err: any) {
      console.warn("Camera with audio failed, trying video only:", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        setCameraStream(stream);
        setIsCameraActive(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Error playing video stream (video-only):", e));
          }
        }, 100);
      } catch (videoErr: any) {
        setCameraError("Unable to access camera. Please check camera permissions in your browser.");
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [cameraStream]);

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCustomImage(dataUrl);
        setCustomVideo(null); // Clear video if photo is taken
        stopCamera();
        confetti({ particleCount: 30, spread: 40 });
      }
    }
  };

  const startVideoRecording = () => {
    if (!cameraStream) return;
    recordedChunksRef.current = [];
    try {
      let options = { mimeType: 'video/webm;codecs=vp9' };
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: 'video/webm;codecs=vp8' };
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: 'video/webm' };
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: '' };
        }

        const recorder = new MediaRecorder(cameraStream, options);
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            setCustomVideo(reader.result as string);
            setCustomImage(null); // Clear image if video is recorded
          };
          reader.readAsDataURL(blob);
          stopCamera();
        };

        recorder.start(10);
        setMediaRecorder(recorder);
        setIsRecording(true);
        setRecordingSeconds(0);

        timerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => {
            if (prev >= 9) {
              const rec = recorder;
              if (rec && rec.state !== 'inactive') {
                rec.stop();
              }
              setIsRecording(false);
              if (timerRef.current) {
                clearInterval(timerRef.current);
              }
              return 10;
            }
            return prev + 1;
          });
        }, 1000);
      } else {
        setCameraError("Media recording is not supported in this browser.");
      }
    } catch (e) {
      console.error("Failed to start MediaRecorder:", e);
    }
  };

  const stopVideoRecording = (activeRecorder?: any) => {
    const rec = activeRecorder || mediaRecorder;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  // Submit Issue Report
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInCitizen) return;

    if (!customImage && !customVideo) {
      alert('Please upload an image or video of the issue to proceed with AI diagnostics.');
      return;
    }

    const finalDescription = description.trim() || 'No citizen remarks provided.';

    // Determine target image before
    const imageToSend = customImage || 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600';

    setIsSubmittingReport(true);
    try {
      // Call server-side Gemini categorization endpoint
      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageToSend,
          description: finalDescription
        })
      });

      if (!response.ok) {
        throw new Error('AI Categorization server response failed');
      }

      const aiResponse = await response.json();

      // Create new report
      const newReport: IssueReport = {
        id: 'report_' + Date.now(),
        citizenId: loggedInCitizen.id,
        citizenName: loggedInCitizen.name,
        category: aiResponse.category as IssueCategory,
        description: finalDescription,
        imageBefore: imageToSend,
        ...(customVideo ? { videoBefore: 'Video uploaded' } : {}),
        latitude: lat,
        longitude: lng,
        locationName: locationName,
        community: loggedInCitizen.community,
        district: loggedInCitizen.district,
        state: loggedInCitizen.state,
        status: 'pending',
        priority: aiResponse.priority as IssuePriority,
        estimatedDuration: aiResponse.estimatedDuration || '3 days',
        createdAt: new Date().toISOString(),
        aiConfidence: aiResponse.confidence || 0.95,
        aiAnalysis: aiResponse.aiAnalysis || 'Categorized automatically by Bharat AI.',
        pointsAwarded: 50,
        supporters: [loggedInCitizen.id]
      };

      // Save to Firebase (with Local fallback)
      await saveIssueReport(newReport);

      // Award points to the user
      const updatedCitizen = {
        ...loggedInCitizen,
        points: loggedInCitizen.points + 50
      };
      await saveCitizenUser(updatedCitizen);
      onLoginSuccess(updatedCitizen); // update state in parent

      setReportSuccess(newReport);
      setDescription('');
      setCustomImage(null);
      setCustomVideo(null);

      // Big celebratory burst
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FF9933', '#FFFFFF', '#138808', '#000080']
      });

      // Refresh parent lists
      await onRefreshIssues();
    } catch (e) {
      console.error(e);
      alert('Failed to report issue. AI Engine is temporarily busy. Please try again.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Verification of Resident Account
  const handleResidentUnlock = () => {
    setIsUnlockingLoading(true);
    setTimeout(() => {
      if (residentVerificationCode === 'SWACHH') {
        setIsVerifiedResident(true);
        setShowVerificationModal(false);
        playUnlockSucceed();
        confetti({ particleCount: 50, spread: 60, colors: ['#138808', '#000080'] });
      } else {
        playErrorBuzz();
        alert('Invalid Verification Code. Tip: Enter "SWACHH" to verify instant local residence.');
      }
      setIsUnlockingLoading(false);
    }, 1000);
  };

  // Filter issues for current logged in citizen
  const citizenIssues = allIssues.filter(i => i.citizenId === loggedInCitizen?.id);

  // Daily Missions Logic
  const todayStr = new Date().toISOString().split('T')[0];
  const hash = todayStr.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const startIndex = Math.abs(hash) % ALL_CIVIC_MISSIONS.length;
  const dailyMissions = [
    ALL_CIVIC_MISSIONS[startIndex],
    ALL_CIVIC_MISSIONS[(startIndex + 1) % ALL_CIVIC_MISSIONS.length]
  ];
  const todayIssues = citizenIssues.filter(i => (i.createdAt || '').startsWith(todayStr));

  // Compute stats for current community
  const communityIssues = allIssues.filter(i => {
    const targetComm = selectedCommunity || loggedInCitizen?.community;
    if (!targetComm) return false;
    return getProperCommunity(i) === targetComm;
  });
  const totalComm = communityIssues.length;
  const resolvedComm = communityIssues.filter(i => i.status === 'completed' || i.status === 'closed').length;
  const inProgressComm = communityIssues.filter(i => i.status === 'in-progress' || i.status === 'assigned').length;
  const pendingComm = communityIssues.filter(i => i.status === 'pending').length;
  const swachhtaIndex = totalComm > 0 ? Math.round((resolvedComm / totalComm) * 100) : 100;

  return (
    <div className="space-y-8 animate-fade-in">
      {!loggedInCitizen ? (
        /* Auth Portal */
        <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden glow-ashoka grid grid-cols-1 md:grid-cols-12">
          {/* Left Visual Column */}
          <div className="md:col-span-5 bg-ashoka-700 p-8 text-white flex flex-col justify-between relative overflow-hidden min-h-[400px]">
            <div className="absolute inset-0 bg-radial-gradient from-ashoka-600/40 via-transparent to-transparent opacity-60"></div>
            
            <div className="relative z-10 space-y-4">
              <span className="bg-saffron-500 text-[10px] uppercase tracking-wider font-mono font-bold px-2.5 py-1 rounded-full text-white inline-block">
                Resident Portal
              </span>
              <h2 className="text-2xl font-bold font-display tracking-tight leading-snug">
                Citizen Welfare & Grievances
              </h2>
              <p className="text-xs text-ashoka-100 leading-relaxed">
                Empowering every citizen of India to actively report local issues, track resolution, and build clean neighborhoods under the Swachh Bharat mission.
              </p>
            </div>

            {/* Role Image Card */}
            <div className="relative z-10 my-6 h-36 rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-gray-900/40">
              <img 
                src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=600&q=80" 
                alt="Responsible Citizen Activity" 
                className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-500" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"></div>
              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px]">
                <span className="font-mono text-saffron-400 font-bold">🧹 Swachhta Mission</span>
                <span className="text-india-green-400 font-bold">★ Active Resident</span>
              </div>
            </div>

            <div className="relative z-10 space-y-2 text-[11px] text-ashoka-100 border-t border-white/10 pt-4">
              <div className="flex items-center space-x-2">
                <span className="text-saffron-400">✓</span>
                <span>Report potholes, garbage & leakages</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-saffron-400">✓</span>
                <span>Claim Swachh XP & earn verified badges</span>
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
              /* LOGIN VIEW */
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-gray-900">Sign In to Citizen Grid</h3>
                  <p className="text-xs text-gray-400">Access your local resident ward panel</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-ashoka-500" />
                    <span>Resident Email ID</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-ashoka-500 focus:bg-white transition-all duration-300"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5 text-ashoka-500" />
                    <span>4-Digit Login PIN</span>
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-ashoka-500 focus:bg-white text-center font-mono text-lg tracking-widest transition-all duration-300"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 bg-ashoka-500 hover:bg-ashoka-600 text-white font-semibold rounded-2xl text-xs shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {authLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>Enter Citizen Grid</span>
                      <ChevronRight className="w-4.5 h-4.5" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginView(false);
                      setAuthError('');
                      setRegStep(1);
                      setEmail('@citizen.in');
                      setPin('');
                      setConfirmPin('');
                    }}
                    className="text-xs text-saffron-600 hover:text-saffron-700 font-bold transition-all duration-300"
                  >
                    New Resident? Register to Begin Reporting →
                  </button>
                </div>


              </form>
            ) : (
              /* REGISTRATION VIEW */
              <div>
                <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-saffron-500" />
                      <span>Full Name</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-saffron-500 focus:bg-white transition-all duration-300"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                        <Mail className="w-3.5 h-3.5 text-saffron-500" />
                        <span>Email ID</span>
                      </label>
                      <input
                        type="type"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="aarav@citizen.in"
                        className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-saffron-500 focus:bg-white transition-all duration-300 font-mono text-xs shadow-2xs hover:border-saffron-200"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-saffron-500" />
                        <span>Phone Number</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="9876543210"
                        className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-saffron-500 focus:bg-white transition-all duration-300 shadow-2xs hover:border-saffron-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600">State</label>
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
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-saffron-500 focus:bg-white transition-all duration-300 font-medium text-gray-800 shadow-2xs hover:border-saffron-200 cursor-pointer"
                      >
                        {INDIAN_REGIONS.map(r => (
                          <option key={r.state} value={r.state}>{r.state}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600">District</label>
                      <select
                        value={selectedDistrict}
                        onChange={(e) => {
                          setSelectedDistrict(e.target.value);
                        }}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-saffron-500 focus:bg-white transition-all duration-300 font-medium text-gray-800 shadow-2xs hover:border-saffron-200 cursor-pointer"
                      >
                        {INDIAN_REGIONS.find(r => r.state === selectedState)?.districts.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600">Ward/Community</label>
                      <select
                        value={selectedCommunity}
                        onChange={(e) => setSelectedCommunity(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-saffron-500 focus:bg-white transition-all duration-300 font-medium text-gray-800 shadow-2xs hover:border-saffron-200 cursor-pointer"
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
                        placeholder="e.g. 1234"
                        className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-saffron-500 focus:bg-white text-center font-mono text-lg tracking-widest transition-all duration-300"
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
                        placeholder="e.g. 1234"
                        className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-saffron-500 focus:bg-white text-center font-mono text-lg tracking-widest transition-all duration-300"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-india-green-600 hover:bg-india-green-700 disabled:bg-gray-400 text-white font-semibold rounded-2xl text-xs shadow-md transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>{authLoading ? 'Launching Account...' : 'Register & Launch Account'}</span>
                    <ArrowRight className="w-4 h-4" />
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
                      className="text-xs text-ashoka-600 hover:text-ashoka-700 font-bold transition-all duration-300"
                    >
                      Already registered? Sign In Instead
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* CITIZEN PORTAL WORKSPACE */
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] text-saffron-600 font-bold uppercase tracking-wider font-mono">
                🇮🇳 Official Citizen Welfare Hub
              </p>
              <h2 className="text-xl font-bold font-display text-gray-900 mt-1">
                Citizen Grievance & Swachhta Portal
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Active Resident: <strong className="text-gray-700">{loggedInCitizen.name}</strong> • Region Circle: <span className="font-bold text-ashoka-600">{loggedInCitizen.community}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT PANEL: Citizen Stats, Badges, and Reporting Form */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Citizen Stats Card */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md relative overflow-hidden">
              {/* tricolor background accent glows */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-saffron-50 rounded-full -mr-8 -mt-8 opacity-40 blur-md"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-india-green-50 rounded-full -ml-8 -mb-8 opacity-30 blur-md"></div>
              
              <div className="flex flex-col sm:flex-row items-center gap-5 border-b border-gray-50 pb-5">
                {/* Gamified Circular Avatar Progress Meter */}
                <div 
                  onClick={() => playLevelUpFanfare()} 
                  title="Click to hear your level chime!" 
                  className="relative cursor-pointer hover:scale-105 transition-all duration-300 select-none group shrink-0"
                >
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      className="stroke-gray-100"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      className="stroke-saffron-500 transition-all duration-500 ease-out"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 34}
                      strokeDashoffset={2 * Math.PI * 34 * (1 - (loggedInCitizen.points % 200) / 200)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-13 h-13 rounded-full bg-ashoka-50 text-ashoka-600 font-bold text-xl flex items-center justify-center border border-ashoka-200 shadow-inner group-hover:bg-saffron-50 transition-colors">
                      {loggedInCitizen.name.charAt(0)}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-india-green-500 text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded-full border border-white shadow-md">
                    Lvl {Math.floor(loggedInCitizen.points / 200) + 1}
                  </div>
                </div>

                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start space-x-2">
                    <h3 className="text-lg font-bold text-gray-900">{loggedInCitizen.name}</h3>
                    <span className="animate-pulse inline-block w-2 h-2 bg-india-green-500 rounded-full" title="Online profile active"></span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono flex items-center justify-center sm:justify-start">
                    <MapPin className="w-3.5 h-3.5 text-saffron-500 mr-1 shrink-0" />
                    {loggedInCitizen.community}
                  </p>
                  
                  {/* Interactive Civic Rank / Title */}
                  <div className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full border inline-flex items-center space-x-1 ${
                    Math.floor(loggedInCitizen.points / 200) + 1 === 1 ? 'bg-gray-50 text-gray-600 border-gray-100' :
                    Math.floor(loggedInCitizen.points / 200) + 1 === 2 ? 'bg-saffron-50 text-saffron-700 border-saffron-100' :
                    Math.floor(loggedInCitizen.points / 200) + 1 === 3 ? 'bg-ashoka-50 text-ashoka-700 border-ashoka-100' :
                    Math.floor(loggedInCitizen.points / 200) + 1 === 4 ? 'bg-india-green-50 text-india-green-700 border-india-green-100' :
                    'bg-yellow-50 text-yellow-800 border-yellow-200 animate-pulse font-black'
                  }`}>
                    <span>{
                      Math.floor(loggedInCitizen.points / 200) + 1 === 1 ? '⚔️ Satyagrahi Novice' :
                      Math.floor(loggedInCitizen.points / 200) + 1 === 2 ? '🧹 Swachhta Soldier' :
                      Math.floor(loggedInCitizen.points / 200) + 1 === 3 ? '🛡️ Ward Guardian' :
                      Math.floor(loggedInCitizen.points / 200) + 1 === 4 ? '🌟 State Champion' :
                      '🏆 Rashtra Sevak Supreme'
                    }</span>
                  </div>
                </div>
              </div>

              {/* Points status & progression helper */}
              <div className="mt-4 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-500">Total Score</span>
                  <span className="font-bold text-gray-800">{loggedInCitizen.points} Swachh XP</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                  <span>{loggedInCitizen.points % 200} / 200 to Level Up</span>
                  <span>{200 - (loggedInCitizen.points % 200)} XP left</span>
                </div>
              </div>

              {/* Daily Civic Quests / Challenges list */}
              <div className="mt-5 p-4 bg-ashoka-50/40 rounded-2xl border border-ashoka-100/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-ashoka-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <Zap className="w-3.5 h-3.5 text-saffron-500 animate-bounce-short" />
                    <span>Daily Civic Missions</span>
                  </h4>
                  <span className="text-[9px] bg-saffron-100 text-saffron-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Bonus Pts</span>
                </div>
                
                <div className="space-y-2 text-xs">
                  {dailyMissions.map((mission, index) => {
                    const isCompleted = mission.check(todayIssues);
                    return (
                      <div key={mission.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-50">
                        <div className="flex items-center space-x-2">
                          <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                            isCompleted ? 'bg-india-green-500 text-white' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {isCompleted ? '✓' : index + 1}
                          </span>
                          <span className={isCompleted ? 'line-through text-gray-400 font-light' : 'text-gray-700 font-medium'}>
                            {mission.text}
                          </span>
                        </div>
                        <span className="font-mono text-[9px] text-gray-400">
                          {isCompleted ? 'Claimed' : `+${mission.xp} XP`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Badges Earned */}
              <div className="mt-5">
                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider font-mono">My Swachhta Medals</h4>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {CITIZEN_BADGES.map(badge => {
                    const isEarned = loggedInCitizen.points >= (badge.id === 'b1' ? 100 : badge.id === 'b2' ? 150 : badge.id === 'b3' ? 250 : badge.id === 'b4' ? 350 : badge.id === 'b5' ? 400 : 300);
                    return (
                      <div 
                        key={badge.id}
                        title={`${badge.name}: ${badge.desc}`}
                        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-bold transition-all duration-300 ${
                          isEarned 
                            ? 'bg-india-green-50/70 text-india-green-800 border-india-green-200/50 shadow-xs' 
                            : 'bg-gray-50 text-gray-300 border-gray-100 grayscale opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <span className="text-sm">{badge.icon}</span>
                        <span className="truncate">{badge.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

{/* Impact Dashboard Section */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
              <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                <div>
                  <h3 className="text-base font-bold font-display text-gray-900">
                    {loggedInCitizen.community} Telemetry Dashboard
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Ward-level resolution indicators and Swachhta score
                  </p>
                </div>
                <span className="text-[10px] bg-india-green-100 text-india-green-800 font-bold px-2.5 py-1 rounded-full flex items-center">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  Verified Resident
                </span>
              </div>

              <div className="space-y-6">
                {/* Metric Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                    <p className="text-2xl font-bold font-display text-gray-900">{totalComm}</p>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Total Reports</p>
                  </div>
                  <div className="p-4 bg-india-green-50 rounded-2xl border border-india-green-100 text-center">
                    <p className="text-2xl font-bold font-display text-india-green-600">{resolvedComm}</p>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider font-sans">Resolved</p>
                  </div>
                  <div className="p-4 bg-saffron-50 rounded-2xl border border-saffron-100 text-center">
                    <p className="text-2xl font-bold font-display text-saffron-600">{inProgressComm}</p>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">In Progress</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center">
                    <p className="text-2xl font-bold font-display text-red-600">{pendingComm}</p>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Pending</p>
                  </div>
                </div>

                {/* Swachhta Index Dial Meter */}
                <div className="p-4 border border-gray-100 rounded-2xl flex items-center justify-between space-x-6">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-gray-800">Community Swachhta Rating</h4>
                    <p className="text-xs text-gray-500">
                      Based on resolved public infrastructure issues in the past 30 days.
                    </p>
                  </div>
                  <div className="relative flex items-center justify-center shrink-0 w-20 h-20 bg-gray-50 rounded-full border border-gray-100">
                    <span className="text-lg font-bold font-display text-india-green-600">{swachhtaIndex}%</span>
                  </div>
                </div>

                {/* Community wise Citizen Leaderboard */}
                <div className="p-5 border border-amber-100 bg-amber-50/15 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-500 animate-pulse" />
                        <span>{loggedInCitizen.community} Swachh Leaderboard</span>
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Top active residents driving local swachhta in this ward
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {(() => {
                      const communityLeaderboard = citizens
                        .filter(c => c.community === loggedInCitizen?.community)
                        .sort((a, b) => b.points - a.points);

                      if (communityLeaderboard.length === 0) {
                        return (
                          <div className="text-center p-4 bg-white rounded-xl border border-dashed border-gray-200">
                            <p className="text-xs text-gray-400">No residents registered in this ward yet.</p>
                          </div>
                        );
                      }

                      return communityLeaderboard.map((citizenItem, index) => {
                        const isCurrentUser = citizenItem.id === loggedInCitizen.id;
                        const rank = index + 1;
                        let medal = '';
                        let rankBadgeClass = '';
                        
                        if (rank === 1) {
                          medal = '🥇';
                          rankBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
                        } else if (rank === 2) {
                          medal = '🥈';
                          rankBadgeClass = 'bg-slate-100 text-slate-800 border-slate-200';
                        } else if (rank === 3) {
                          medal = '🥉';
                          rankBadgeClass = 'bg-amber-50 text-amber-900 border-amber-100';
                        } else {
                          rankBadgeClass = 'bg-gray-50 text-gray-500 border-gray-100';
                        }

                        return (
                          <div 
                            key={citizenItem.id} 
                            className={`p-3 rounded-xl border transition-all flex justify-between items-center ${
                              isCurrentUser 
                                ? 'bg-ashoka-50/30 border-ashoka-200 shadow-xs ring-1 ring-ashoka-200' 
                                : 'bg-white border-gray-100 hover:border-gray-200'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              {/* Rank indicator with medal or number */}
                              <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${rankBadgeClass}`}>
                                {medal ? medal : rank}
                              </div>
                              
                              {/* Name and You indicator */}
                              <div>
                                <p className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                                  <span>{citizenItem.name}</span>
                                  {isCurrentUser && (
                                    <span className="text-[9px] bg-ashoka-500 text-white font-extrabold px-1.5 py-0.2 rounded-md">
                                      YOU
                                    </span>
                                  )}
                                </p>
                                <p className="text-[9px] text-gray-400 font-mono capitalize">
                                  {rank === 1 ? 'Swachh Champion 🌟' : rank === 2 ? 'Local Ambassador' : rank === 3 ? 'Active Reformer' : 'Local Resident'}
                                </p>
                              </div>
                            </div>

                            {/* Points / XP badge */}
                            <div className="text-right">
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-ashoka-50 text-ashoka-700 text-[10px] font-bold rounded-lg border border-ashoka-100">
                                <Zap className="w-3 h-3 text-ashoka-500 fill-current" />
                                <span>{citizenItem.points} XP</span>
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Co-signing & Supporting Community Board */}
                <div className="p-5 border border-ashoka-100 bg-ashoka-50/10 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-ashoka-500 animate-spin-slow" />
                        <span>Community Co-signing Board</span>
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Support local issues submitted by neighbors to expedite resolution and earn <strong>+10 points</strong>!
                      </p>
                    </div>
                  </div>

                  {communityIssues.length === 0 ? (
                    <div className="text-center p-6 bg-white rounded-xl border border-dashed border-gray-200">
                      <p className="text-xs text-gray-400">No community issues reported in this area yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {communityIssues.map(commIssue => {
                        const hasUpvoted = upvotedIssueIds.includes(commIssue.id);
                        return (
                          <div key={commIssue.id} className="p-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-all flex justify-between items-center">
                            <div className="space-y-1 max-w-[70%]">
                              <div className="flex items-center space-x-2">
                                <span className="text-[11px] font-bold text-gray-800">{commIssue.category}</span>
                                <span className="text-[9px] bg-gray-100 text-gray-500 font-mono px-1.5 py-0.2 rounded-md capitalize">
                                  {commIssue.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-500 truncate">{commIssue.description}</p>
                              <p className="text-[9px] text-gray-400 font-mono flex items-center">
                                <User className="w-3 h-3 mr-0.5 shrink-0" />
                                <span>By {commIssue.citizenName || 'Resident'}</span>
                              </p>
                            </div>

                            {hasUpvoted ? (
                              <div className="flex flex-col items-end space-y-0.5 shrink-0">
                                <span className="text-[10px] bg-india-green-50 text-india-green-700 border border-india-green-100 font-bold px-2.5 py-1 rounded-xl flex items-center space-x-1">
                                  <Check className="w-3 h-3 text-india-green-600" />
                                  <span>Supported</span>
                                </span>
                                <span className="text-[9px] text-gray-500 font-medium">
                                  {(commIssue.supporters || []).length || 1} Co-signers
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleSupportIssue(commIssue.id)}
                                className="px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center space-x-1.5 transition-all bg-saffron-500 hover:bg-saffron-600 text-white shadow-xs hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
                              >
                                <ThumbsUp className="w-3 h-3" />
                                <span>Co-sign (+10 Pts)</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: Impact Dashboards and Tracking Timeline */}
          <div className="lg:col-span-7 space-y-8">
            {/* Reporting Form */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold font-display text-gray-900 flex items-center space-x-2">
                  <PlusCircle className="w-5.5 h-5.5 text-saffron-500" />
                  <span>Report New Civic Issue</span>
                </h3>
                <span className="text-[10px] bg-india-green-100 text-india-green-800 font-mono font-bold px-2.5 py-0.5 rounded-full">
                  AI-Powered Diagnostic
                </span>
              </div>

              {reportSuccess && (
                <div className="p-4 bg-india-green-50 border border-india-green-200 rounded-2xl space-y-2 animate-bounce-short">
                  <div className="flex items-center space-x-2 text-india-green-800 font-bold text-xs">
                    <CheckCircle className="w-4.5 h-4.5" />
                    <span>Report Filed Successfully!</span>
                  </div>
                  <p className="text-[11px] text-india-green-700 leading-tight">
                    Bharat Seva AI classified this as <strong className="font-bold">{reportSuccess.category}</strong> with a priority of <strong className="font-bold">{reportSuccess.priority}</strong>. You have been awarded <strong className="font-bold text-saffron-600">+50 points</strong>!
                  </p>
                  <button 
                    onClick={() => setReportSuccess(null)}
                    className="text-[10px] font-semibold text-india-green-800 hover:underline"
                  >
                    Dismiss notification
                  </button>
                </div>
              )}

              <form onSubmit={handleReportSubmit} className="space-y-5">
                

                 {/* Combined Image/Video Upload & Live Capture Box */}
                <div className="space-y-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
                    <label className="text-xs font-bold text-gray-700 block">
                      Upload/Capture Issue Image or Video <span className="text-red-500">*</span>
                    </label>
                    <div className="flex space-x-1 bg-gray-100 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          stopCamera();
                          setActiveMediaTab('upload');
                        }}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                          activeMediaTab === 'upload' ? 'bg-white text-gray-800 shadow-xs font-bold' : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMediaTab('camera');
                          startCamera();
                        }}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                          activeMediaTab === 'camera' ? 'bg-white text-gray-800 shadow-xs font-bold' : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Live Capture
                      </button>
                    </div>
                  </div>

                  {/* Active Tab: Upload */}
                  {activeMediaTab === 'upload' && (
                    <div className="space-y-3 animate-fade-in">
                      {!customImage && !customVideo ? (
                        <div className="border border-dashed border-gray-200 rounded-xl p-5 text-center bg-gray-50/50 hover:bg-gray-50 transition-all">
                          <Upload className="w-7 h-7 text-gray-400 mx-auto mb-1.5" />
                          <p className="text-xs font-semibold text-gray-700">Drag & drop or browse files</p>
                          <p className="text-[10px] text-gray-400 mt-0.5 mb-3">Upload a clean picture or a short video clip</p>
                          <div className="flex justify-center space-x-2">
                            <label className="px-3 py-1.5 bg-saffron-500 hover:bg-saffron-600 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center space-x-1">
                              <Camera className="w-3 h-3" />
                              <span>Upload Image</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                            </label>
                            <label className="px-3 py-1.5 bg-ashoka-500 hover:bg-ashoka-600 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center space-x-1">
                              <Video className="w-3 h-3" />
                              <span>Upload Video</span>
                              <input
                                type="file"
                                accept="video/*"
                                onChange={handleVideoUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        /* Preview loaded file */
                        <div className="relative border border-gray-100 bg-gray-50 rounded-xl p-3 flex flex-col items-center">
                          {customImage && (
                            <div className="relative w-full max-h-48 rounded-lg overflow-hidden border border-gray-200 bg-black flex items-center justify-center">
                              <img src={customImage} alt="Custom upload" className="max-h-48 object-contain" />
                              <span className="absolute top-2 left-2 bg-india-green-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md">
                                Custom Image Attached
                              </span>
                            </div>
                          )}
                          {customVideo && (
                            <div className="relative w-full max-h-48 rounded-lg overflow-hidden border border-gray-200 bg-black flex items-center justify-center">
                              <video src={customVideo} controls className="max-h-48 w-full object-contain" />
                              <span className="absolute top-2 left-2 bg-ashoka-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md">
                                Custom Video Attached
                              </span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setCustomImage(null);
                              setCustomVideo(null);
                            }}
                            className="mt-3 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-bold rounded-lg transition-all"
                          >
                            Clear Media & Retake
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Active Tab: Live Camera */}
                  {activeMediaTab === 'camera' && (
                    <div className="space-y-3 animate-fade-in">
                      {cameraError && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-center text-red-600 text-[10px] font-semibold">
                          {cameraError}
                        </div>
                      )}

                      {isCameraActive ? (
                        <div className="relative bg-black rounded-xl overflow-hidden border border-gray-200 aspect-video flex items-center justify-center">
                          <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            playsInline
                            muted
                          />
                          {isRecording && (
                            <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center space-x-1 animate-pulse shadow-md">
                              <span className="w-2 h-2 rounded-full bg-white block"></span>
                              <span>Recording: {recordingSeconds}s / 10s</span>
                            </div>
                          )}
                          
                          <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-3 px-4">
                            {!isRecording ? (
                              <>
                                <button
                                  type="button"
                                  onClick={capturePhoto}
                                  className="px-3.5 py-2 bg-saffron-500 hover:bg-saffron-600 text-white text-[10px] font-bold rounded-xl shadow-md transition-all flex items-center space-x-1"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  <span>Capture Photo</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={startVideoRecording}
                                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-xl shadow-md transition-all flex items-center space-x-1"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  <span>Record Video Clip</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => stopVideoRecording()}
                                className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white text-[10px] font-bold rounded-xl shadow-md transition-all flex items-center space-x-1"
                              >
                                <Square className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                                <span>Stop Recording</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Camera not active or previewing captured content */
                        <div className="space-y-3">
                          {!customImage && !customVideo ? (
                            <div className="border border-dashed border-gray-200 rounded-xl p-5 text-center bg-gray-50/50 flex flex-col items-center">
                              <Camera className="w-7 h-7 text-gray-400 mb-1.5" />
                              <p className="text-xs font-semibold text-gray-700">Camera access is offline</p>
                              <p className="text-[10px] text-gray-400 mt-0.5 mb-4">Provide camera permissions to capture directly</p>
                              <button
                                type="button"
                                onClick={startCamera}
                                className="px-4 py-2 bg-saffron-500 hover:bg-saffron-600 text-white text-[10px] font-bold rounded-xl transition-all flex items-center space-x-1.5"
                              >
                                <Camera className="w-3.5 h-3.5" />
                                <span>Start Live Camera</span>
                              </button>
                            </div>
                          ) : (
                            <div className="relative border border-gray-100 bg-gray-50 rounded-xl p-3 flex flex-col items-center">
                              {customImage && (
                                <div className="relative w-full max-h-48 rounded-lg overflow-hidden border border-gray-200 bg-black flex items-center justify-center">
                                  <img src={customImage} alt="Captured preview" className="max-h-48 object-contain" />
                                  <span className="absolute top-2 left-2 bg-india-green-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md">
                                    Captured Photo Attached
                                  </span>
                                </div>
                              )}
                              {customVideo && (
                                <div className="relative w-full max-h-48 rounded-lg overflow-hidden border border-gray-200 bg-black flex items-center justify-center">
                                  <video src={customVideo} controls className="max-h-48 w-full object-contain" />
                                  <span className="absolute top-2 left-2 bg-ashoka-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md">
                                    Captured Video Attached
                                  </span>
                                </div>
                              )}
                              <div className="flex space-x-2 mt-3">
                                <button
                                  type="button"
                                  onClick={startCamera}
                                  className="px-3 py-1.5 bg-saffron-500 hover:bg-saffron-600 text-white text-[10px] font-bold rounded-lg transition-all"
                                >
                                  Retake Media
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomImage(null);
                                    setCustomVideo(null);
                                  }}
                                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-bold rounded-lg transition-all"
                                >
                                  Clear Media
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Location Tags */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 flex justify-between items-center">
                    <span>Geo-Location Tagging <span className="text-red-500">*</span></span>
                    <button
                      type="button"
                      onClick={handleAutoGps}
                      disabled={isGpsLoading}
                      className="text-[10px] font-bold text-ashoka-600 hover:text-ashoka-700 flex items-center space-x-1 cursor-pointer"
                    >
                      <Compass className={`w-3.5 h-3.5 ${isGpsLoading ? 'animate-spin' : ''}`} />
                      <span>{isGpsLoading ? 'Locking GPS...' : 'Auto-GPS Tag'}</span>
                    </button>
                  </label>
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col space-y-3">
                    <div className="flex items-center justify-between space-x-3">
                      <div className="flex items-center space-x-2 overflow-hidden flex-1">
                        <MapPin className="w-5 h-5 text-red-500 shrink-0" />
                        <div className="overflow-hidden flex-1">
                          <input
                            type="text"
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                            placeholder="Enter or verify location..."
                            className="text-[11px] font-bold text-gray-800 bg-transparent border-b border-dashed border-gray-300 focus:border-saffron-500 focus:outline-hidden w-full pb-0.5 font-sans"
                          />
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                            Lat: {lat.toFixed(5)}, Lng: {lng.toFixed(5)}
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] bg-red-100 text-red-800 font-mono font-bold px-2 py-0.5 rounded-sm shrink-0">
                        MAPPED
                      </span>
                    </div>
 
                    {/* Highly dynamic interactive Google Maps Embedded Preview */}
                    <div className="w-full h-36 rounded-xl overflow-hidden border border-gray-200 shadow-inner bg-gray-100 relative">
                      <iframe
                        title="GPS Location Map Preview"
                        src={`https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`}
                        className="w-full h-full border-0"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      ></iframe>
                      <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-md border border-gray-100 text-[8px] font-bold text-gray-600 flex items-center space-x-1 shadow-xs pointer-events-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-india-green-500 animate-ping"></span>
                        <span>Live Municipal Grid GPS</span>
                      </div>
                    </div>
                  </div>
                </div>
 
                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 block">
                    Issue Details & Citizen Remarks <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what you see... (e.g. Broken water valve near the park, giant pothole waterlogged under flyover, etc. - Optional)"
                    className="w-full px-4 py-3 text-xs bg-gray-50 border border-gray-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-saffron-500 focus:bg-white transition-all duration-300"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="w-full py-4 bg-india-green-500 hover:bg-india-green-600 disabled:opacity-50 text-white font-bold rounded-2xl text-xs shadow-md transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center space-x-2"
                >
                  {isSubmittingReport ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Bharat AI Classifying & Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Report to Municipal Grid</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

                        {/* Live Tracking Timeline of Reported Issues */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold font-display text-gray-900">
                    My Active Seva Requests
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Real-time timeline tracking of issues you reported
                  </p>
                </div>
                <span className="text-xs font-mono text-gray-500 font-bold">
                  {citizenIssues.length} Complaints Filed
                </span>
              </div>

              {citizenIssues.length === 0 ? (
                <div className="text-center p-10 bg-gradient-to-b from-gray-50/50 to-white rounded-3xl border border-dashed border-gray-200 shadow-2xs space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-saffron-50 flex items-center justify-center text-saffron-600 border border-saffron-100/50 shadow-2xs">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-800">Your Swachh Contribution Log is Empty</p>
                    <p className="text-[11px] text-gray-500 max-w-sm mx-auto leading-relaxed">
                      You have not reported any issues yet. Use the form above to submit your first civic grievance and earn Swachhta XP!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-h-[620px] overflow-y-auto pr-1.5 custom-scrollbar">
                  {citizenIssues.map(issue => (
                    <div 
                      key={issue.id}
                      className="border border-gray-100 rounded-2xl p-4 bg-white hover:border-ashoka-200/50 hover:shadow-xs hover:scale-[1.005] hover:translate-y-[-1px] transform transition-all duration-300 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-gray-800">{issue.category}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              issue.priority === 'high' 
                                ? 'bg-red-100 text-red-800' 
                                : issue.priority === 'medium' 
                                ? 'bg-saffron-100 text-saffron-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {issue.priority} priority
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-mono mt-1 flex items-center">
                            <MapPin className="w-3 h-3 text-red-400 mr-1 shrink-0" />
                            {issue.locationName}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center space-x-1 uppercase ${
                          issue.status === 'completed' || issue.status === 'closed'
                            ? 'bg-india-green-50 text-india-green-700 border-india-green-200'
                            : issue.status === 'in-progress' || issue.status === 'assigned'
                            ? 'bg-saffron-50 text-saffron-700 border-saffron-200'
                            : 'bg-gray-50 text-gray-500 border-gray-200'
                        }`}>
                          {issue.status === 'completed' || issue.status === 'closed' ? (
                            <CheckCircle className="w-3 h-3 mr-0.5 text-india-green-600" />
                          ) : (
                            <Clock className="w-3 h-3 mr-0.5 text-saffron-500 animate-spin-slow" />
                          )}
                          <span>{issue.status}</span>
                        </span>
                      </div>

                      {/* Description & AI diagnostic */}
                      <p className="text-xs text-gray-600 line-clamp-2">{issue.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Bharat Seva AI Diagnostic</p>
                          <p className="text-[11px] text-ashoka-600 font-semibold mt-1 italic">
                            "{issue.aiAnalysis}"
                          </p>
                        </div>
                        <div className="border-t md:border-t-0 md:border-l border-gray-200 pt-2 md:pt-0 md:pl-3 flex flex-col justify-between">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Assigned Technician</p>
                            <p className="text-[11px] text-gray-700 font-bold mt-1">
                              {issue.assignedTechnicianName || 'Pending municipal dispatch'}
                            </p>
                          </div>
                          <p className="text-[9px] text-gray-400 font-mono mt-1">
                            Est. Repair: {issue.estimatedDuration}
                          </p>
                        </div>
                      </div>

                      {/* Display before / after images inside ticket */}
                      <div className="flex items-center space-x-2 pt-2">
                        <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 border">
                          <img src={issue.imageBefore} alt="Before" className="w-full h-full object-cover" />
                        </div>
                        {issue.imageAfter && (
                          <>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                            <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 border">
                              <img src={issue.imageAfter} alt="After fix" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-[10px] text-india-green-600 font-bold">✓ Resolution Verified by AI</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      )}

      {/* VERIFICATION RESIDENT MODAL */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl border border-gray-100 animate-scale-up">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-saffron-50 text-saffron-500 flex items-center justify-center rounded-full border border-saffron-100">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Verify Local Residence</h3>
              <p className="text-xs text-gray-500">
                Enter your local ward registration key to access real-time neighborhood metrics.
              </p>
            </div>

            <div className="p-3 bg-saffron-50 rounded-2xl border border-saffron-100 text-center">
              <p className="text-[10px] text-saffron-800 font-bold font-mono">
                Hint: Enter "SWACHH" to pass instantly
              </p>
            </div>

            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="Enter Verification Key"
                value={residentVerificationCode}
                onChange={(e) => setResidentVerificationCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 text-center bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono tracking-widest focus:ring-2 focus:ring-saffron-500 focus:outline-hidden"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowVerificationModal(false)}
                className="flex-1 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleResidentUnlock}
                disabled={isUnlockingLoading}
                className="flex-1 py-2 text-xs font-bold bg-india-green-500 text-white rounded-xl shadow-xs hover:bg-india-green-600"
              >
                {isUnlockingLoading ? 'Verifying...' : 'Unlock Telemetry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
