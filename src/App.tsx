import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { transcribeFile, transcribeUrl } from './services/transcriptionService';
import { 
  Upload, 
  Link as LinkIcon, 
  FileAudio, 
  FileVideo, 
  History, 
  Loader2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  X,
  ShieldCheck,
  Globe,
  Layers,
  CassetteTape,
  Disc,
  Music,
  Mic2,
  Radio,
  Keyboard,
  Database,
  HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

interface TranscriptRecord {
  id: string;
  userId: string;
  fileName: string;
  fileUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transcript?: string;
  type: 'audio' | 'video';
  createdAt: any;
  error?: string;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [transcripts, setTranscripts] = useState<TranscriptRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [selectedTranscript, setSelectedTranscript] = useState<TranscriptRecord | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch all transcripts (local-first vibe, no auth)
    const q = query(
      collection(db, 'transcripts'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TranscriptRecord[];
      setTranscripts(docs);
      setLoading(false);
    }, (error) => {
      console.error("Firestore subscription error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const processFile = async (file: File) => {
    setIsUploading(true);
    const type = file.type.startsWith('audio') ? 'audio' : 'video';
    
    try {
      // 1. Create record in Firestore
      const docRef = await addDoc(collection(db, 'transcripts'), {
        userId: 'local-user',
        fileName: file.name,
        status: 'processing',
        type: type,
        createdAt: serverTimestamp()
      });

      // 2. Upload to Storage
      const storageRef = ref(storage, `transcripts/local/${docRef.id}_${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);
      
      await updateDoc(docRef, { fileUrl });

      // 3. Transcribe
      const transcript = await transcribeFile(file, type);
      
      // 4. Update record
      await updateDoc(docRef, {
        status: 'completed',
        transcript: transcript
      });
    } catch (error: any) {
      console.error("Processing failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file: File) => processFile(file));
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;

    setIsUploading(true);
    const type = urlInput.includes('video') || urlInput.endsWith('.mp4') ? 'video' : 'audio';
    
    try {
      const docRef = await addDoc(collection(db, 'transcripts'), {
        userId: 'local-user',
        fileName: urlInput.split('/').pop() || 'Remote File',
        fileUrl: urlInput,
        status: 'processing',
        type: type,
        createdAt: serverTimestamp()
      });

      const transcript = await transcribeUrl(urlInput, type);
      
      await updateDoc(docRef, {
        status: 'completed',
        transcript: transcript
      });
      setUrlInput('');
    } catch (error: any) {
      console.error("URL processing failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteTranscript = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transcripts', id));
      if (selectedTranscript?.id === id) setSelectedTranscript(null);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F2ED]">
        <Loader2 className="w-12 h-12 animate-spin text-[#D45D00]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F2ED] text-[#4B3621] plaid-pattern">
      {/* Header */}
      <header className="border-b-8 border-[#4B3621] bg-white p-6 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#E9B824] rounded-2xl border-4 border-[#4B3621] -rotate-3 shadow-[4px_4px_0px_0px_rgba(212,93,0,1)]">
              <CassetteTape className="w-8 h-8 text-[#4B3621]" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tighter uppercase italic">VibeScribe</h2>
              <p className="text-xs font-bold tracking-[0.2em] text-[#D45D00] -mt-1">ANALOG SOUL • DIGITAL MIND</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-[#E9B824]/10 border-2 border-[#E9B824] rounded-full">
              <Database className="w-4 h-4 text-[#D45D00]" />
              <span className="text-xs font-black text-[#D45D00] uppercase">Cloud Storage Active</span>
            </div>
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-[#568203]/10 border-2 border-[#568203] rounded-full">
              <ShieldCheck className="w-4 h-4 text-[#568203]" />
              <span className="text-xs font-black text-[#568203] uppercase">Tailscale Node</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl border-4 border-[#4B3621] bg-[#E9B824] flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(75,54,33,1)]">
                <Disc className="w-6 h-6 animate-spin-slow text-[#4B3621]" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-12 relative">
        {/* Background Retro Element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-[0.03] pointer-events-none">
           <Keyboard className="w-full h-full" />
        </div>

        {/* Left Column: Controls */}
        <div className="lg:col-span-5 space-y-10 relative z-10">
          <section className="bg-white border-8 border-[#4B3621] rounded-[2rem] p-8 shadow-[16px_16px_0px_0px_rgba(212,93,0,1)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Radio className="w-32 h-32" />
            </div>
            
            <h3 className="text-2xl font-black mb-6 flex items-center gap-3 uppercase italic">
              <Mic2 className="w-6 h-6 text-[#D45D00]" /> New Session
            </h3>

            <div className="flex gap-3 mb-8 p-1.5 bg-[#F5F2ED] rounded-2xl border-4 border-[#4B3621]">
              <button 
                onClick={() => setActiveTab('upload')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 text-sm",
                  activeTab === 'upload' ? "bg-[#E9B824] text-[#4B3621] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]" : "hover:bg-white/50"
                )}
              >
                <Upload className="w-4 h-4" /> Local File
              </button>
              <button 
                onClick={() => setActiveTab('url')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 text-sm",
                  activeTab === 'url' ? "bg-[#D45D00] text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]" : "hover:bg-white/50"
                )}
              >
                <LinkIcon className="w-4 h-4" /> Remote URL
              </button>
            </div>

            {activeTab === 'upload' ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-4 border-dashed border-[#D45D00]/30 rounded-[1.5rem] p-16 flex flex-col items-center justify-center cursor-pointer hover:border-[#D45D00] hover:bg-[#D45D00]/5 transition-all group relative"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  multiple 
                  accept="audio/*,video/*" 
                />
                <div className="w-20 h-20 rounded-full bg-[#D45D00] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[4px_4px_0px_0px_rgba(75,54,33,1)]">
                  <Plus className="w-10 h-10 text-white" />
                </div>
                <p className="font-black text-xl mb-2 uppercase italic">Batch Upload</p>
                <p className="text-sm text-[#4B3621]/60 font-bold">WAV, MP3, MP4, MOV</p>
              </div>
            ) : (
              <form onSubmit={handleUrlSubmit} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-[0.2em] text-[#4B3621]/60 ml-1">Stream Source</label>
                  <input 
                    type="url" 
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://archive.org/audio/..."
                    className="w-full p-5 bg-[#F5F2ED] border-4 border-[#4B3621] rounded-2xl focus:ring-8 focus:ring-[#D45D00]/10 outline-none font-bold text-lg placeholder:opacity-30"
                  />
                </div>
                <button 
                  disabled={!urlInput || isUploading}
                  className="w-full py-5 bg-[#D45D00] text-white rounded-2xl font-black text-lg uppercase italic shadow-[8px_8px_0px_0px_rgba(75,54,33,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isUploading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Initiate Stream"}
                </button>
              </form>
            )}
          </section>

          {/* Batch Status / Active Jobs */}
          {transcripts.filter(t => t.status === 'processing').length > 0 && (
            <section className="bg-[#E9B824] border-8 border-[#4B3621] rounded-[2rem] p-8 shadow-[16px_16px_0px_0px_rgba(75,54,33,1)]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black uppercase italic flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" /> Batch Queue
                </h3>
                <span className="bg-[#4B3621] text-white px-3 py-1 rounded-full text-xs font-black">
                  {transcripts.filter(t => t.status === 'processing').length} ACTIVE
                </span>
              </div>
              <div className="space-y-3">
                {transcripts.filter(t => t.status === 'processing').map(t => (
                  <div key={t.id} className="flex items-center justify-between bg-white/50 p-4 rounded-2xl border-4 border-[#4B3621]">
                    <div className="flex items-center gap-4 overflow-hidden">
                      {t.type === 'audio' ? <FileAudio className="w-6 h-6 shrink-0" /> : <FileVideo className="w-6 h-6 shrink-0" />}
                      <span className="font-black truncate text-sm uppercase italic">{t.fileName}</span>
                    </div>
                    <div className="w-2 h-2 bg-[#D45D00] rounded-full animate-ping" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tailscale / Local Network Info */}
          <section className="bg-[#4B3621] text-[#F5F2ED] rounded-[2rem] p-8 shadow-[16px_16px_0px_0px_rgba(233,184,36,1)]">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black uppercase italic flex items-center gap-3">
                  <Globe className="w-6 h-6 text-[#E9B824]" /> Network Node
                </h3>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(74,222,128,0.5)]" />
             </div>
             <div className="space-y-4 font-mono text-sm">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="opacity-50 uppercase">Device ID</span>
                  <span className="font-bold">vibe-scribe-node-01</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="opacity-50 uppercase">Tailnet IP</span>
                  <span className="font-bold">100.82.14.93</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-50 uppercase">Status</span>
                  <span className="text-[#E9B824] font-bold uppercase">Encrypted & Synced</span>
                </div>
             </div>
          </section>
        </div>

        {/* Right Column: History & Results */}
        <div className="lg:col-span-7 space-y-8 relative z-10">
          {selectedTranscript ? (
            <motion.section 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border-8 border-[#4B3621] rounded-[2rem] overflow-hidden shadow-[16px_16px_0px_0px_rgba(233,184,36,1)]"
            >
              <div className="retro-gradient p-8 text-[#4B3621] flex items-center justify-between border-b-8 border-[#4B3621]">
                <div className="flex items-center gap-6">
                  <button onClick={() => setSelectedTranscript(null)} className="p-3 bg-white/20 hover:bg-white/40 rounded-xl border-2 border-[#4B3621]/20">
                    <X className="w-6 h-6" />
                  </button>
                  <div>
                    <h3 className="text-2xl font-black leading-tight uppercase italic">{selectedTranscript.fileName}</h3>
                    <p className="text-xs opacity-80 uppercase font-black tracking-widest mt-1">
                      {selectedTranscript.createdAt?.toDate() ? new Date(selectedTranscript.createdAt.toDate()).toLocaleDateString() : 'Just now'} • {selectedTranscript.type}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                   <button 
                    onClick={() => deleteTranscript(selectedTranscript.id)}
                    className="p-3 bg-white/20 hover:bg-white/40 rounded-xl border-2 border-[#4B3621]/20"
                   >
                     <Trash2 className="w-6 h-6" />
                   </button>
                </div>
              </div>
              <div className="p-10 prose prose-stone max-w-none">
                <div className="bg-[#F5F2ED] p-8 rounded-[2rem] border-4 border-[#4B3621] whitespace-pre-wrap font-medium leading-relaxed text-xl shadow-inner">
                  {selectedTranscript.transcript || "No transcript available."}
                </div>
              </div>
            </motion.section>
          ) : (
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-4xl font-black flex items-center gap-4 uppercase italic">
                  <History className="w-10 h-10 text-[#D45D00]" /> Archive
                </h3>
              </div>

              {transcripts.length === 0 ? (
                <div className="bg-white border-8 border-dashed border-[#E9B824]/30 rounded-[3rem] p-24 text-center">
                  <div className="w-24 h-24 bg-[#E9B824]/10 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-[#E9B824]/20">
                    <Music className="w-12 h-12 text-[#D45D00]/40" />
                  </div>
                  <p className="text-2xl font-black text-[#4B3621]/30 italic uppercase tracking-widest">The tape is blank.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AnimatePresence>
                    {transcripts.map((t) => (
                      <motion.div 
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => t.status === 'completed' && setSelectedTranscript(t)}
                        className={cn(
                          "group bg-white border-8 border-[#4B3621] rounded-[2rem] p-6 cursor-pointer transition-all hover:shadow-[12px_12px_0px_0px_rgba(233,184,36,1)] hover:-translate-x-1 hover:-translate-y-1",
                          t.status === 'processing' && "opacity-60 pointer-events-none"
                        )}
                      >
                        <div className="flex items-start justify-between mb-6">
                          <div className={cn(
                            "p-4 rounded-2xl border-4 border-[#4B3621] shadow-[4px_4px_0px_0px_rgba(75,54,33,1)]",
                            t.type === 'audio' ? "bg-[#E9B824]" : "bg-[#D45D00]"
                          )}>
                            {t.type === 'audio' ? <FileAudio className="w-8 h-8 text-[#4B3621]" /> : <FileVideo className="w-8 h-8 text-[#4B3621]" />}
                          </div>
                          {t.status === 'completed' ? (
                            <CheckCircle2 className="w-6 h-6 text-[#568203]" />
                          ) : t.status === 'failed' ? (
                            <AlertCircle className="w-6 h-6 text-red-500" />
                          ) : (
                            <Loader2 className="w-6 h-6 animate-spin text-[#D45D00]" />
                          )}
                        </div>
                        <h4 className="font-black text-xl truncate mb-2 uppercase italic">{t.fileName}</h4>
                        <p className="text-xs text-[#4B3621]/60 font-black uppercase tracking-[0.2em]">
                          {t.createdAt?.toDate() ? new Date(t.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                        </p>
                        
                        <div className="mt-6 flex items-center justify-between">
                          <span className={cn(
                            "text-xs font-black uppercase px-3 py-1.5 rounded-xl border-4 border-[#4B3621]",
                            t.status === 'completed' ? "bg-[#568203] text-white" : "bg-[#F5F2ED]"
                          )}>
                            {t.status}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTranscript(t.id);
                            }}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity border-2 border-transparent hover:border-red-100"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* Footer / Plaid Accent */}
      <footer className="mt-auto border-t-8 border-[#4B3621] bg-white p-10 relative overflow-hidden">
        <div className="absolute inset-0 plaid-pattern opacity-10" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-sm font-black uppercase italic opacity-60">
            <CassetteTape className="w-5 h-5" />
            <span>© 2026 VibeScribe • Analog Soul • Digital Mind</span>
          </div>
          <div className="flex gap-8 text-xs font-black uppercase tracking-[0.3em] opacity-40">
            <a href="#" className="hover:text-[#D45D00] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#D45D00] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#D45D00] transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
