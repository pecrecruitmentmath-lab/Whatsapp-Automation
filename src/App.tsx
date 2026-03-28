import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  LogOut, 
  User as UserIcon, 
  ShieldCheck, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  Loader2,
  Upload,
  Download,
  AlertCircle,
  Trash2,
  Eye,
  Mail,
  Settings,
  MessageSquare,
  ExternalLink,
  Layout,
  MessageCircle,
  Plus,
  Save,
  Copy,
  Play,
  Pause,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { io } from 'socket.io-client';

const socket = io();

// Utility for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface UserProfile {
  email: string;
  role: 'admin' | 'user';
}

interface UserRecord {
  id: string;
  mobile: string;
  name: string;
  name_lowercase?: string;
  fatherName?: string;
  bloodGroup?: string;
  gender?: string;
  dob?: string;
  email?: string;
  details?: string;
  isEligible?: boolean;
  markedAt?: string;
  markedBy?: string;
  [key: string]: any;
}

interface AppSettings {
  recruitmentTemplates: { id: string; name: string; content: string }[];
  whatsappTemplates: { id: string; name: string; content: string }[];
}

interface User {
  uid: string;
  email: string;
  displayName: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<AppSettings>({ recruitmentTemplates: [], whatsappTemplates: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recruitment' | 'whatsapp' | 'templates'>('recruitment');

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error('Fetch settings error:', err);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedProfile = localStorage.getItem('profile');
    if (savedUser && savedProfile) {
      setUser(JSON.parse(savedUser));
      setProfile(JSON.parse(savedProfile));
    }
    fetchSettings();
    setLoading(false);

    socket.on('settings:updated', (newSettings: AppSettings) => {
      setSettings(newSettings);
    });

    return () => {
      socket.off('settings:updated');
    };
  }, []);

  const handleLogin = async (email: string) => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      setUser(data.user);
      setProfile(data.profile);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('profile', JSON.stringify(data.profile));
    } catch (err) {
      console.error('Login error:', err);
      alert('Failed to login. Please try again.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('user');
    localStorage.removeItem('profile');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-zinc-900 tracking-tight hidden sm:block">Recruitment Portal</h1>
          </div>
          
          <nav className="flex items-center bg-zinc-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('recruitment')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 text-sm font-bold rounded-lg transition",
                activeTab === 'recruitment' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <Layout className="w-4 h-4" />
              Recruitment
            </button>
            <button 
              onClick={() => setActiveTab('whatsapp')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 text-sm font-bold rounded-lg transition",
                activeTab === 'whatsapp' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Tool
            </button>
            {profile?.role === 'admin' && (
              <button 
                onClick={() => setActiveTab('templates')}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 text-sm font-bold rounded-lg transition",
                  activeTab === 'templates' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                <FileText className="w-4 h-4" />
                Templates
              </button>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-zinc-900">{user.displayName}</span>
            <span className="text-xs text-zinc-500 capitalize">{profile?.role}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'templates' && profile?.role === 'admin' ? (
          <div className="space-y-12">
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-lg w-fit">
                <Layout className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Recruitment Templates</span>
              </div>
              <MessageTemplateEditor 
                settings={settings} 
                onUpdateSettings={setSettings} 
                type="recruitment" 
              />
            </div>
            <div className="pt-12 border-t border-zinc-100 space-y-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-lg w-fit">
                <MessageCircle className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-bold text-zinc-900 uppercase tracking-wider">WhatsApp Tool Templates</span>
              </div>
              <MessageTemplateEditor 
                settings={settings} 
                onUpdateSettings={setSettings} 
                type="whatsapp" 
              />
            </div>
          </div>
        ) : profile?.role === 'admin' ? (
          <AdminDashboard 
            user={user} 
            settings={settings} 
            onUpdateSettings={setSettings} 
            mode={activeTab === 'whatsapp' ? 'whatsapp' : 'recruitment'} 
          />
        ) : (
          <UserView 
            user={user} 
            settings={settings} 
            mode={activeTab === 'whatsapp' ? 'whatsapp' : 'recruitment'} 
          />
        )}
      </main>
    </div>
  );
}

function LoginView({ onLogin }: { onLogin: (email: string) => void }) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onLogin(email.trim());
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center"
      >
        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Recruitment Portal</h1>
        <p className="text-zinc-500 mb-8">Enter your email to access the recruitment data.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input 
              type="email" 
              required
              placeholder="Enter your email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition"
            />
          </div>
          <button 
            type="submit"
            className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition shadow-lg"
          >
            Continue
          </button>
        </form>
        <p className="mt-8 text-xs text-zinc-400 font-medium">
          <span className="block mb-1">Role-based Access:</span>
          <span className="text-zinc-500">Admin: pecrecruitmentmath@gmail.com</span>
          <br />
          <span className="text-zinc-500">User: Any other email</span>
        </p>
      </motion.div>
    </div>
  );
}

function BulkSendModal({ 
  records, 
  template, 
  onClose 
}: { 
  records: UserRecord[]; 
  template: string; 
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoSending, setIsAutoSending] = useState(false);
  const [delay, setDelay] = useState(10); // 10 seconds default for better reliability
  const [timeLeft, setTimeLeft] = useState(delay);
  const [useWeb, setUseWeb] = useState(true);
  const whatsappWindowRef = useRef<Window | null>(null);

  const getWhatsAppUrl = (mobile: string) => {
    let cleanNumber = mobile.replace(/\D/g, '');
    if (cleanNumber.startsWith('0')) cleanNumber = cleanNumber.substring(1);
    const finalNumber = cleanNumber.startsWith('92') ? cleanNumber : `92${cleanNumber}`;
    
    const baseUrl = useWeb ? 'https://web.whatsapp.com/send' : 'https://api.whatsapp.com/send';
    return `${baseUrl}?phone=${finalNumber}&text=${encodeURIComponent(template)}`;
  };

  const sendCurrent = () => {
    const record = records[currentIndex];
    const url = getWhatsAppUrl(record.mobile);
    
    // CRITICAL FIX: Always use window.open with a target name.
    // We cannot use whatsappWindowRef.current.location.href because of cross-origin restrictions
    // once the WhatsApp page loads. window.open(url, name) is the only way to update it.
    const win = window.open(url, 'whatsapp_bulk_sender');
    if (win) {
      whatsappWindowRef.current = win;
      try {
        win.focus();
      } catch (e) {
        // Ignore focus errors on cross-origin
      }
    } else {
      // If win is null, it's likely blocked by a popup blocker
      setIsAutoSending(false);
      alert('Popup blocked! Please allow popups for this website in your browser settings to use automation.');
    }
  };

  const handleNext = () => {
    if (currentIndex < records.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setTimeLeft(delay);
    } else {
      setIsAutoSending(false);
      alert('Bulk send complete!');
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setTimeLeft(delay);
    }
  };

  useEffect(() => {
    let timer: any;
    if (isAutoSending) {
      if (timeLeft > 0) {
        timer = setInterval(() => {
          setTimeLeft(prev => prev - 1);
        }, 1000);
      } else {
        sendCurrent();
        handleNext();
      }
    }
    return () => clearInterval(timer);
  }, [isAutoSending, timeLeft]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div>
            <h3 className="text-xl font-bold text-zinc-900">Bulk Send Automation</h3>
            <p className="text-sm text-zinc-500">Sending 1 by 1 to avoid browser blocking.</p>
          </div>
          <button 
            onClick={() => {
              if (whatsappWindowRef.current && !whatsappWindowRef.current.closed) {
                whatsappWindowRef.current.close();
              }
              onClose();
            }}
            className="p-2 hover:bg-zinc-200 rounded-full transition"
          >
            <X className="w-6 h-6 text-zinc-400" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="text-center space-y-4">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="60"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-zinc-100"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="60"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={377}
                  strokeDashoffset={377 - (377 * (currentIndex + 1)) / records.length}
                  className="text-green-600 transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-zinc-900">{currentIndex + 1}</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">of {records.length}</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-lg font-bold text-zinc-900">{records[currentIndex].name}</p>
              <p className="text-sm font-mono text-zinc-500">{records[currentIndex].mobile}</p>
            </div>
          </div>

          <div className="bg-zinc-50 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-600">WhatsApp Version</span>
              <div className="flex items-center gap-2 bg-zinc-200 p-1 rounded-lg">
                <button 
                  onClick={() => setUseWeb(true)}
                  className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition", useWeb ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500")}
                >WEB</button>
                <button 
                  onClick={() => setUseWeb(false)}
                  className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition", !useWeb ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500")}
                >APP</button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-600">Auto-Send Delay</span>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min="5" 
                  max="30" 
                  value={delay}
                  onChange={(e) => setDelay(parseInt(e.target.value))}
                  disabled={isAutoSending}
                  className="w-32 accent-zinc-900"
                />
                <span className="text-sm font-mono font-bold text-zinc-900 w-8">{delay}s</span>
              </div>
            </div>

            {isAutoSending && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-center gap-2 text-green-600 font-bold animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Next contact in {timeLeft}s...
                </div>
                <p className="text-[10px] text-zinc-400 italic">Keep this tab visible for automation to run.</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handlePrev}
                disabled={currentIndex === 0 || isAutoSending}
                className="py-4 border border-zinc-200 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-50 transition disabled:opacity-30"
              >
                Previous
              </button>
              <button 
                onClick={sendCurrent}
                disabled={isAutoSending}
                className="py-4 bg-zinc-100 text-zinc-900 rounded-2xl font-bold hover:bg-zinc-200 transition disabled:opacity-30"
              >
                Send Now
              </button>
            </div>

            <button 
              onClick={() => {
                if (isAutoSending) {
                  setIsAutoSending(false);
                } else {
                  sendCurrent();
                  setIsAutoSending(true);
                  setTimeLeft(delay);
                }
              }}
              className={cn(
                "w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3",
                isAutoSending 
                  ? "bg-amber-500 text-white hover:bg-amber-600" 
                  : "bg-green-600 text-white hover:bg-green-700"
              )}
            >
              {isAutoSending ? (
                <>
                  <Pause className="w-6 h-6 fill-current" />
                  PAUSE AUTOMATION
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 fill-current" />
                  START AUTOMATION
                </>
              )}
            </button>
          </div>

          <div className="space-y-3 px-4">
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[10px] text-amber-700 font-medium leading-relaxed">
              <p className="font-bold mb-1">⚠️ Browser Setup Required:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>You MUST **Allow Popups** for this site in your browser settings.</li>
                <li>If only the first message sends, your browser is blocking the rest.</li>
                <li>Keep the WhatsApp tab open; the app will reuse it.</li>
              </ul>
            </div>
            <p className="text-[10px] text-center text-zinc-400 font-medium leading-relaxed">
              1. Click "Start" to open WhatsApp.
              <br />
              2. Click "Send" in WhatsApp.
              <br />
              3. Wait for this app to automatically load the next person.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function UserView({ 
  user, 
  settings, 
  mode = 'recruitment' 
}: { 
  user: User; 
  settings: AppSettings;
  mode?: 'recruitment' | 'whatsapp';
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<UserRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [marking, setMarking] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'groups'>('list');
  const [bulkQueue, setBulkQueue] = useState<UserRecord[] | null>(null);
  const [bulkTemplate, setBulkTemplate] = useState('');

  useEffect(() => {
    const fetchInitialRecords = async () => {
      try {
        const res = await fetch(`/api/records?type=${mode}`);
        const data = await res.json();
        setRecords(data);
      } catch (err) {
        console.error('Fetch error:', err);
      }
    };
    fetchInitialRecords();

    socket.on('records:updated', (data: { type: string }) => {
      if (data.type === mode) {
        fetchInitialRecords();
      }
    });

    return () => {
      socket.off('records:updated');
    };
  }, [mode]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    
    if (term.length < 4) {
      setError('Please enter at least 4 characters to search.');
      return;
    }

    setSearching(true);
    setError('');
    setRecords([]);

    try {
      const res = await fetch(`/api/records?q=${encodeURIComponent(term)}&type=${mode}`);
      const data = await res.json();
      
      if (data.length > 0) {
        setRecords(data);
      } else {
        setError('No record found matching your search. Try searching by name or mobile number.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search records. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleMarkEligible = async (record: UserRecord) => {
    setMarking(record.id);
    try {
      const res = await fetch(`/api/records/${record.id}/eligible`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markedBy: user.uid, type: mode })
      });
      const data = await res.json();
      if (data.success) {
        setRecords(prev => prev.map(r => r.id === record.id ? data.record : r));
      }
    } catch (err) {
      console.error('Mark eligible error:', err);
      alert('Failed to update record.');
    } finally {
      setMarking(null);
    }
  };

  const groupedRecords = useMemo(() => {
    const groups: { [name: string]: UserRecord[] } = {};
    records.forEach(r => {
      const name = r.groupName || 'Unassigned';
      if (!groups[name]) groups[name] = [];
      groups[name].push(r);
    });
    return Object.entries(groups).sort((a, b) => {
      if (a[0] === 'Unassigned') return 1;
      if (b[0] === 'Unassigned') return -1;
      return a[0].localeCompare(b[0], undefined, { numeric: true });
    });
  }, [records]);

  const handleBulkSend = async (groupRecords: UserRecord[]) => {
    const templates = mode === 'recruitment' ? settings.recruitmentTemplates : settings.whatsappTemplates;
    const template = templates?.[0]?.content || '';
    
    if (!template) {
      alert('Please define at least one template first.');
      return;
    }

    setBulkQueue(groupRecords);
    setBulkTemplate(template);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">
          {mode === 'whatsapp' ? 'WhatsApp Messaging Tool' : 'Search Record'}
        </h2>
        <p className="text-zinc-500">
          {mode === 'whatsapp' 
            ? 'Search and send WhatsApp messages to candidates.' 
            : 'Search by Name or Mobile Number (min 4 characters).'}
        </p>
      </div>

      <div className="flex justify-center">
        <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setViewMode('list')}
            className={cn(
              "px-6 py-2 text-sm font-bold rounded-lg transition",
              viewMode === 'list' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Search View
          </button>
          <button 
            onClick={() => setViewMode('groups')}
            className={cn(
              "px-6 py-2 text-sm font-bold rounded-lg transition",
              viewMode === 'groups' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Group View (100s)
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <div className="space-y-8">
            <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
              <input 
                type="text" 
                placeholder="Enter Name or Mobile Number" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition text-lg"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400" />
              <button 
                type="submit"
                disabled={searching}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition disabled:opacity-50"
              >
                {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
              </button>
            </form>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 max-w-2xl mx-auto"
              >
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {records.map((record) => (
                <motion.div 
                  key={record.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900">{record.name}</h3>
                      <p className="text-zinc-500 font-mono">{record.mobile}</p>
                    </div>
                    {record.isEligible && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        Eligible
                      </div>
                    )}
                  </div>
                  <div className="p-6 space-y-6 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Father's Name</label>
                        <p className="text-sm text-zinc-700 font-medium">{record.fatherName || '-'}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Gender</label>
                        <p className="text-sm text-zinc-700 font-medium">{record.gender || '-'}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Blood Group</label>
                        <p className="text-sm text-zinc-700 font-medium">{record.bloodGroup || '-'}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Date of Birth</label>
                        <p className="text-sm text-zinc-700 font-medium">{record.dob || '-'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Email Address</label>
                      <p className="text-sm text-zinc-700 font-medium">{record.email || '-'}</p>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Other Details</label>
                      <p className="text-sm text-zinc-600 mt-1 line-clamp-3">{record.details || '-'}</p>
                    </div>
                  </div>
                  
                  <div className="p-6 pt-0 space-y-3">
                    <WhatsAppButton mobile={record.mobile} settings={settings} mode={mode} />
                    {!record.isEligible ? (
                      <button 
                        onClick={() => handleMarkEligible(record)}
                        disabled={marking === record.id}
                        className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {marking === record.id ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Mark as Eligible'}
                      </button>
                    ) : (
                      <div className="p-3 bg-zinc-50 rounded-xl text-center text-zinc-500 text-xs font-medium">
                        Already marked as eligible
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {groupedRecords.map(([groupName, groupRecords]) => (
              <div key={groupName} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-zinc-900">{groupName}</h3>
                    <span className="px-2 py-1 bg-zinc-100 text-zinc-500 rounded-md text-[10px] font-bold uppercase tracking-wider">
                      {groupRecords.length} Contacts
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">Batch of 100 contacts for bulk outreach.</p>
                </div>
                
                <div className="pt-4 border-t border-zinc-50 flex items-center gap-2">
                  <button 
                    onClick={() => handleBulkSend(groupRecords)}
                    className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Bulk Send (1 Click)
                  </button>
                  <button 
                    onClick={() => {
                      setSearchTerm(groupName);
                      setViewMode('list');
                    }}
                    className="p-2.5 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition"
                    title="View Group Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {groupedRecords.length === 0 && (
              <div className="col-span-full py-20 text-center text-zinc-400">
                No groups found. Upload a list to see them here.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {bulkQueue && (
        <BulkSendModal 
          records={bulkQueue} 
          template={bulkTemplate} 
          onClose={() => setBulkQueue(null)} 
        />
      )}
    </div>
  );
}

function AdminDashboard({ 
  user, 
  settings, 
  onUpdateSettings,
  mode = 'recruitment'
}: { 
  user: User; 
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
  mode?: 'recruitment' | 'whatsapp';
}) {
  const [records, setRecords] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'eligible' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'groups'>('list');
  const [bulkQueue, setBulkQueue] = useState<UserRecord[] | null>(null);
  const [bulkTemplate, setBulkTemplate] = useState('');

  const fetchRecords = async () => {
    try {
      const res = await fetch(`/api/records?type=${mode}`);
      const data = await res.json();
      setRecords(data);
    } catch (err) {
      console.error('Fetch records error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();

    socket.on('records:updated', (data: { type: string }) => {
      if (data.type === mode) {
        fetchRecords();
      }
    });

    return () => {
      socket.off('records:updated');
    };
  }, [mode]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesFilter = 
        filter === 'all' ? true :
        filter === 'eligible' ? r.isEligible :
        !r.isEligible;
      
      const term = searchTerm.toLowerCase();
      const normalizedTerm = term.replace(/\D/g, '');
      const searchMobile = normalizedTerm.startsWith('0') ? normalizedTerm.substring(1) : normalizedTerm;

      const matchesSearch = 
        (r.name && r.name.toLowerCase().includes(term)) ||
        (r.mobile && r.mobile.includes(term)) ||
        (searchMobile && r.mobile && r.mobile.replace(/\D/g, '').includes(searchMobile));
        
      return matchesFilter && matchesSearch;
    });
  }, [records, filter, searchTerm]);

  const groupedRecords = useMemo(() => {
    const groups: { [name: string]: UserRecord[] } = {};
    filteredRecords.forEach(r => {
      const name = r.groupName || 'Unassigned';
      if (!groups[name]) groups[name] = [];
      groups[name].push(r);
    });
    return Object.entries(groups).sort((a, b) => {
      if (a[0] === 'Unassigned') return 1;
      if (b[0] === 'Unassigned') return -1;
      return a[0].localeCompare(b[0], undefined, { numeric: true });
    });
  }, [filteredRecords]);

  const handleBulkSend = async (groupRecords: UserRecord[]) => {
    const templates = mode === 'recruitment' ? settings.recruitmentTemplates : settings.whatsappTemplates;
    const template = templates?.[0]?.content || '';
    
    if (!template) {
      alert('Please define at least one template first.');
      return;
    }

    setBulkQueue(groupRecords);
    setBulkTemplate(template);
  };

  const eligibleRecords = useMemo(() => records.filter(r => r.isEligible), [records]);

  const handleDeleteAll = async () => {
    if (!window.confirm(`Are you sure you want to delete ALL records?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/records', { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: mode })
      });
      if (res.ok) {
        setRecords([]);
        alert('Successfully deleted all records.');
      }
    } catch (err) {
      console.error('Delete all error:', err);
      alert('Failed to delete records.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (record: UserRecord) => {
    if (!window.confirm(`Are you sure you want to delete the record for ${record.name}?`)) return;
    
    try {
      const res = await fetch(`/api/records/${record.id}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: mode })
      });
      if (res.ok) {
        setRecords(prev => prev.filter(r => r.id !== record.id));
      }
    } catch (err) {
      console.error('Delete record error:', err);
      alert('Failed to delete record.');
    }
  };

  const downloadTemplate = () => {
    const data = [
      { 
        name: 'John Doe', 
        mobile: '1234567890', 
        fatherName: 'Richard Doe',
        bloodGroup: 'O+',
        gender: 'Male',
        dob: '1995-01-01',
        email: 'john@example.com',
        details: 'Sample candidate info' 
      }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Recruitment_Template.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          throw new Error('No sheets found in the Excel file.');
        }
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        if (!ws) {
          throw new Error('Sheet not found.');
        }
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const processedData = data.map(row => {
          const normalizedRow: any = {};
          const rowKeys = Object.keys(row);
          
          rowKeys.forEach(key => {
            const cleanKey = key.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
            normalizedRow[cleanKey] = row[key];
          });

          // 1. Try to find mobile number
          let mobile = String(row.mobile || row.Mobile || normalizedRow.mobile || normalizedRow.phone || normalizedRow.contact || normalizedRow.whatsapp || '').replace(/\D/g, '');
          
          // If still no mobile, look for any column that looks like a phone number (10-13 digits)
          if (!mobile) {
            for (const key of rowKeys) {
              const val = String(row[key]).replace(/\D/g, '');
              if (val.length >= 10 && val.length <= 13) {
                mobile = val;
                break;
              }
            }
          }

          if (mobile) {
            // Remove leading 0092 or 0
            if (mobile.startsWith('0092')) mobile = mobile.substring(4);
            if (mobile.startsWith('0')) mobile = mobile.substring(1);
            
            // Handle 920... case (common mistake)
            if (mobile.startsWith('920')) mobile = '92' + mobile.substring(3);
            
            // Ensure it starts with 92
            if (!mobile.startsWith('92')) {
              mobile = '92' + mobile;
            }
            
            // Add +
            if (!mobile.startsWith('+')) {
              mobile = '+' + mobile;
            }
          }
          
          // 2. Try to find name
          let name = String(row.name || row.Name || normalizedRow.name || normalizedRow.fullname || normalizedRow.customername || '');
          
          // If no name, look for any string column that isn't the mobile number
          if (!name || name === 'undefined' || name === 'null') {
            for (const key of rowKeys) {
              const val = String(row[key]).trim();
              const cleanVal = val.replace(/\D/g, '');
              // If it's not the mobile number and not just a number, it might be a name
              if (val && cleanVal !== mobile.replace(/\D/g, '') && isNaN(Number(val.replace(/\+/g, '')))) {
                name = val;
                break;
              }
            }
          }

          // Fallback name if still empty
          if (!name || name === 'undefined' || name === 'null') {
            name = mobile ? `Contact ${mobile}` : 'Unknown';
          }
          
          return {
            ...row,
            mobile,
            name,
            name_lowercase: name.toLowerCase(),
            fatherName: String(row.fatherName || row['Father Name'] || normalizedRow.fathername || normalizedRow.fathersname || ''),
            bloodGroup: String(row.bloodGroup || row['Blood Group'] || normalizedRow.bloodgroup || normalizedRow.bg || ''),
            gender: String(row.gender || row.Gender || normalizedRow.gender || normalizedRow.sex || ''),
            dob: String(row.dob || row.DOB || row['Date of Birth'] || normalizedRow.dob || normalizedRow.dateofbirth || ''),
            email: String(row.email || row.Email || row['Email Address'] || normalizedRow.email || normalizedRow.emailaddress || ''),
          };
        }).filter(r => r.mobile); // Only require mobile number now

        const res = await fetch('/api/records/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: processedData, type: mode })
        });
        
        if (res.ok) {
          alert('Data uploaded successfully!');
          fetchRecords();
        }
      } catch (err) {
        console.error('Upload error:', err);
        alert('Error uploading file.');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const data = eligibleRecords.map(r => ({
      Name: r.name,
      'Father Name': r.fatherName || '',
      Mobile: r.mobile,
      Gender: r.gender || '',
      'Blood Group': r.bloodGroup || '',
      DOB: r.dob || '',
      Email: r.email || '',
      'Marked At': r.markedAt ? new Date(r.markedAt).toLocaleString() : 'N/A'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Eligible Candidates");
    XLSX.writeFile(wb, "Eligible_Candidates.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("Eligible Candidates Report", 14, 15);
    
    const tableData = eligibleRecords.map(r => [
      r.name,
      r.fatherName || '',
      r.mobile,
      r.gender || '',
      r.bloodGroup || '',
      r.dob || '',
      r.email || '',
      r.markedAt ? new Date(r.markedAt).toLocaleString() : 'N/A'
    ]);

    (doc as any).autoTable({
      head: [['Name', 'Father Name', 'Mobile', 'Gender', 'Blood Group', 'DOB', 'Email', 'Marked At']],
      body: tableData,
      startY: 25,
      styles: { fontSize: 8 },
    });

    doc.save("Eligible_Candidates.pdf");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">
            {mode === 'whatsapp' ? 'WhatsApp Tool Dashboard' : 'Admin Dashboard'}
          </h2>
          <p className="text-zinc-500">
            {mode === 'whatsapp' 
              ? 'Manage WhatsApp communications and contact lists.' 
              : 'Manage recruitment records and export eligible candidate data.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition text-sm font-medium text-zinc-700 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Template
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition cursor-pointer text-sm font-medium shadow-sm">
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Import Excel'}
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
          <div className="w-px h-8 bg-zinc-200 mx-2" />
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition text-sm font-medium text-zinc-700 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition text-sm font-medium text-zinc-700 shadow-sm"
          >
            <FileText className="w-4 h-4 text-red-600" />
            PDF
          </button>
          <button 
            onClick={handleDeleteAll}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 transition text-sm font-medium"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Records" value={records.length} icon={<UserIcon className="w-5 h-5" />} />
        <StatCard title="Eligible Candidates" value={eligibleRecords.length} icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} />
        <StatCard title="Pending Review" value={records.length - eligibleRecords.length} icon={<Loader2 className="w-5 h-5 text-zinc-400" />} />
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex bg-zinc-100 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('list')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition",
                  viewMode === 'list' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                List View
              </button>
              <button 
                onClick={() => setViewMode('groups')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition",
                  viewMode === 'groups' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                Group View (100s)
              </button>
            </div>

            <div className="flex bg-zinc-100 p-1 rounded-lg">
              {(['all', 'eligible', 'pending'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md capitalize transition",
                    filter === f ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search by name or mobile..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 outline-none w-full md:w-64"
            />
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Group</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Father Name</th>
                  <th className="px-6 py-4">Mobile</th>
                  <th className="px-6 py-4">Gender</th>
                  <th className="px-6 py-4">Blood Group</th>
                  <th className="px-6 py-4">DOB</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Marked At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-zinc-200 mx-auto" />
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center text-zinc-500">
                      No records found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-zinc-50 transition">
                      <td className="px-6 py-4">
                        {record.isEligible ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            Eligible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full text-[10px] font-bold uppercase">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">{record.groupName || '-'}</td>
                      <td className="px-6 py-4 font-medium text-zinc-900">{record.name}</td>
                      <td className="px-6 py-4 text-zinc-500 text-sm">{record.fatherName || '-'}</td>
                      <td className="px-6 py-4 text-zinc-500 font-mono text-sm">{record.mobile}</td>
                      <td className="px-6 py-4 text-zinc-500 text-sm">{record.gender || '-'}</td>
                      <td className="px-6 py-4 text-zinc-500 text-sm">{record.bloodGroup || '-'}</td>
                      <td className="px-6 py-4 text-zinc-500 text-sm">{record.dob || '-'}</td>
                      <td className="px-6 py-4 text-zinc-500 text-sm">{record.email || '-'}</td>
                      <td className="px-6 py-4 text-zinc-400 text-xs">
                        {record.markedAt ? new Date(record.markedAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <WhatsAppButton 
                            mobile={record.mobile} 
                            settings={settings} 
                            mode={mode}
                            variant="icon" 
                          />
                          <button 
                            onClick={() => handleDeleteRecord(record)}
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-zinc-50">
            {groupedRecords.map(([groupName, groupRecords]) => (
              <div key={groupName} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-zinc-900">{groupName}</h3>
                    <span className="px-2 py-1 bg-zinc-100 text-zinc-500 rounded-md text-[10px] font-bold uppercase tracking-wider">
                      {groupRecords.length} Contacts
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">Batch of 100 contacts for bulk outreach.</p>
                </div>
                
                <div className="pt-4 border-t border-zinc-50 flex items-center gap-2">
                  <button 
                    onClick={() => handleBulkSend(groupRecords)}
                    className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Bulk Send (1 Click)
                  </button>
                  <button 
                    onClick={() => {
                      setSearchTerm(groupName);
                      setViewMode('list');
                    }}
                    className="p-2.5 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition"
                    title="View Group Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {groupedRecords.length === 0 && (
              <div className="col-span-full py-20 text-center text-zinc-400">
                No groups found. Upload a list to see them here.
              </div>
            )}
          </div>
        )}
      </div>

      {bulkQueue && (
        <BulkSendModal 
          records={bulkQueue} 
          template={bulkTemplate} 
          onClose={() => setBulkQueue(null)} 
        />
      )}
    </div>
  );
}

function MessageTemplateEditor({ 
  settings, 
  onUpdateSettings,
  type
}: { 
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
  type: 'recruitment' | 'whatsapp';
}) {
  const initialTemplates = type === 'recruitment' ? settings.recruitmentTemplates : settings.whatsappTemplates;
  const [templates, setTemplates] = useState(initialTemplates || []);
  const [activeId, setActiveId] = useState(templates?.[0]?.id || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const currentTemplates = type === 'recruitment' ? settings.recruitmentTemplates : settings.whatsappTemplates;
    setTemplates(currentTemplates || []);
    if (!activeId && currentTemplates?.length > 0) {
      setActiveId(currentTemplates[0].id);
    }
  }, [settings, type]);

  const activeTemplate = templates.find(t => t.id === activeId);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = type === 'recruitment' 
        ? { recruitmentTemplates: templates } 
        : { whatsappTemplates: templates };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        onUpdateSettings(data.settings);
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} templates saved successfully!`);
      }
    } catch (err) {
      console.error('Save templates error:', err);
      alert('Failed to save templates.');
    } finally {
      setSaving(false);
    }
  };

  const addTemplate = () => {
    const newId = Date.now().toString();
    const newTemplate = { id: newId, name: 'New Template', content: '' };
    setTemplates([...templates, newTemplate]);
    setActiveId(newId);
  };

  const deleteTemplate = (id: string) => {
    if (templates.length === 1) return;
    const newTemplates = templates.filter(t => t.id !== id);
    setTemplates(newTemplates);
    if (activeId === id && newTemplates.length > 0) setActiveId(newTemplates[0].id);
    else if (activeId === id) setActiveId('');
  };

  const updateTemplate = (id: string, field: 'name' | 'content', value: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Message Editor</h2>
          <p className="text-zinc-500">Create and manage WhatsApp message templates.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={addTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition text-sm font-medium text-zinc-700 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition shadow-md disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-2">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 mb-2">Your Templates</div>
          {templates.map(t => (
            <div 
              key={t.id}
              className={cn(
                "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition border",
                activeId === t.id 
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-md" 
                  : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300"
              )}
              onClick={() => setActiveId(t.id)}
            >
              <span className="text-sm font-medium truncate">{t.name}</span>
              {templates.length > 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}
                  className={cn(
                    "p-1 rounded-md transition opacity-0 group-hover:opacity-100",
                    activeId === t.id ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-red-50 text-zinc-400 hover:text-red-600"
                  )}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="md:col-span-3">
          {activeTemplate ? (
            <motion.div 
              key={activeId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm space-y-6"
            >
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-900">Template Name</label>
                <input 
                  type="text"
                  value={activeTemplate.name}
                  onChange={(e) => updateTemplate(activeId, 'name', e.target.value)}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-900">Message Content</label>
                <textarea 
                  value={activeTemplate.content}
                  onChange={(e) => updateTemplate(activeId, 'content', e.target.value)}
                  placeholder="Enter your message here..."
                  className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition min-h-[250px] leading-relaxed"
                />
              </div>
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Preview</span>
                </div>
                <p className="text-sm text-zinc-600 whitespace-pre-wrap">{activeTemplate.content || 'No content yet...'}</p>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4 py-20">
              <FileText className="w-12 h-12 opacity-20" />
              <p>Select a template to edit or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 border border-zinc-200 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{title}</span>
        <div className="p-2 bg-zinc-50 rounded-lg">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-zinc-900">{value}</div>
    </div>
  );
}

function WhatsAppButton({ 
  mobile, 
  settings,
  mode,
  variant = 'button' 
}: { 
  mobile: string; 
  settings: AppSettings;
  mode: 'recruitment' | 'whatsapp';
  variant?: 'button' | 'icon';
}) {
  const [showTemplates, setShowTemplates] = useState(false);
  const currentTemplates = mode === 'recruitment' ? settings.recruitmentTemplates : settings.whatsappTemplates;

  const handleWhatsApp = (content: string) => {
    let cleanNumber = mobile.replace(/\D/g, '');
    // If it starts with 0, remove it (common in Pakistan: 0300... -> 300...)
    if (cleanNumber.startsWith('0')) {
      cleanNumber = cleanNumber.substring(1);
    }
    // If it doesn't already start with 92, add it
    const finalNumber = cleanNumber.startsWith('92') ? cleanNumber : `92${cleanNumber}`;
    
    const url = `https://api.whatsapp.com/send?phone=${finalNumber}&text=${encodeURIComponent(content)}`;
    
    // Using a named window 'whatsapp_portal' allows the browser to reuse the same tab
    // for subsequent messages, which is much faster for bulk messaging.
    window.open(url, 'whatsapp_portal');
    setShowTemplates(false);
  };

  const handleCopyAndSend = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      handleWhatsApp(content);
    } catch (err) {
      console.error('Copy error:', err);
      handleWhatsApp(content);
    }
  };

  const primaryTemplate = (currentTemplates && currentTemplates.length > 0) 
    ? currentTemplates[0].content 
    : '';

  if (variant === 'icon') {
    return (
      <div className="relative">
        <button 
          onClick={() => (currentTemplates && currentTemplates.length > 1) ? setShowTemplates(!showTemplates) : handleWhatsApp(primaryTemplate)}
          title="Send WhatsApp Message"
          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        
        <AnimatePresence>
          {showTemplates && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowTemplates(false)} />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute right-0 bottom-full mb-2 w-64 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 overflow-hidden"
              >
                <div className="p-3 bg-zinc-50 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Select Template
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {(currentTemplates || []).map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleCopyAndSend(t.content)}
                      className="w-full text-left px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition border-b border-zinc-50 last:border-0 group/item"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="font-bold">{t.name}</div>
                        <Copy className="w-3 h-3 opacity-0 group-hover/item:opacity-100 text-zinc-400" />
                      </div>
                      <div className="text-xs text-zinc-400 truncate">{t.content}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <button 
        onClick={() => (currentTemplates && currentTemplates.length > 1) ? setShowTemplates(!showTemplates) : handleWhatsApp(primaryTemplate)}
        className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-md"
      >
        <MessageSquare className="w-5 h-5" />
        {(currentTemplates && currentTemplates.length > 1) ? 'Select & Send WhatsApp' : 'Send WhatsApp'}
      </button>

      <AnimatePresence>
        {showTemplates && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowTemplates(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-zinc-200 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-3 bg-zinc-50 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Choose a Message Template
              </div>
              <div className="max-h-60 overflow-y-auto">
                {(currentTemplates || []).map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleCopyAndSend(t.content)}
                    className="w-full text-left px-4 py-4 text-sm text-zinc-700 hover:bg-zinc-50 transition border-b border-zinc-50 last:border-0 group/item"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-zinc-900">{t.name}</div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest opacity-0 group-hover/item:opacity-100">
                        <Copy className="w-3 h-3" />
                        Copy & Send
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500 line-clamp-2">{t.content}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
