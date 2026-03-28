import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UserProfile, ProgressEntry } from '../types';
import { analyzePhysique } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface ProgressTrackerProps {
  profile: UserProfile;
  history: ProgressEntry[];
  onSaveEntry: (entry: ProgressEntry) => void;
}

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ profile, history, onSaveEntry }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [weight, setWeight] = useState<number>(profile.weight);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ProgressEntry | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prepare chart data
  const chartData = history.map(entry => ({
    date: new Date(entry.date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
    weight: entry.weight
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBase64 = await compressImage(file);
      setPhoto(compressedBase64);
    } catch (error) {
      console.error("Error compressing image:", error);
      alert("圖片處理失敗，請換一張試試。");
    }
  };

  const handleSave = async () => {
    if (!weight) return;
    
    setIsAnalyzing(true);
    let analysis = "";
    
    if (photo) {
      try {
        analysis = await analyzePhysique(photo, profile, weight);
      } catch (error) {
        console.error("Analysis failed", error);
        alert("AI 分析失敗，但仍會儲存您的紀錄。");
      }
    }

    const newEntry: ProgressEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      weight,
    };
    
    if (photo) newEntry.photoBase64 = photo;
    if (analysis) newEntry.aiAnalysis = analysis;

    onSaveEntry(newEntry);
    setIsAdding(false);
    setPhoto(null);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-display font-bold tracking-tight">體態追蹤</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-primary text-zinc-900 px-4 py-2 rounded-full font-medium text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
        >
          + 新增紀錄
        </button>
      </div>

      {/* Weight Chart */}
      {chartData.length > 0 && (
        <div className="bg-surface p-5 rounded-3xl border border-white/5 shadow-xl">
          <h3 className="text-lg font-display font-semibold mb-4 text-zinc-100">體重變化趨勢</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="date" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#a3e635' }}
                />
                <Line type="monotone" dataKey="weight" stroke="#a3e635" strokeWidth={3} dot={{ r: 4, fill: '#a3e635', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* History Gallery */}
      <div className="space-y-4">
        <h3 className="text-lg font-display font-semibold text-zinc-100">歷史紀錄</h3>
        {history.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 bg-surface/50 rounded-3xl border border-white/5">
            <p>目前還沒有體態紀錄，趕快新增一筆吧！</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {history.slice().reverse().map(entry => (
              <motion.div 
                key={entry.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedEntry(entry)}
                className="bg-surface rounded-2xl overflow-hidden border border-white/5 shadow-lg cursor-pointer flex flex-col"
              >
                {entry.photoBase64 ? (
                  <div className="aspect-square bg-zinc-800 relative">
                    <img src={entry.photoBase64} alt="Progress" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-square bg-zinc-800/50 flex items-center justify-center text-zinc-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                  </div>
                )}
                <div className="p-3 flex justify-between items-center bg-surface">
                  <span className="text-xs text-zinc-400">{new Date(entry.date).toLocaleDateString('zh-TW')}</span>
                  <span className="text-sm font-bold text-primary">{entry.weight} kg</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-surface w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-white/10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-display font-bold">新增體態紀錄</h3>
                <button onClick={() => setIsAdding(false)} className="text-zinc-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">目前體重 (kg)</label>
                  <input 
                    type="number" 
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">體態照片 (選填，上傳後由 AI 分析)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  {photo ? (
                    <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-video bg-zinc-900">
                      <img src={photo} alt="Preview" className="w-full h-full object-contain" />
                      <button 
                        onClick={() => setPhoto(null)}
                        className="absolute top-2 right-2 bg-black/50 p-2 rounded-full text-white hover:bg-black/70"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-white/10 rounded-xl py-8 flex flex-col items-center justify-center text-zinc-500 hover:text-primary hover:border-primary/30 transition-colors bg-background/30"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                      <span>點擊上傳照片</span>
                    </button>
                  )}
                </div>

                <button 
                  onClick={handleSave}
                  disabled={isAnalyzing}
                  className="w-full bg-primary text-zinc-900 py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors disabled:opacity-50 flex justify-center items-center"
                >
                  {isAnalyzing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-zinc-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      AI 分析中...
                    </span>
                  ) : "儲存紀錄"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entry Detail Modal */}
      <AnimatePresence>
        {selectedEntry && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface w-full max-w-md rounded-3xl overflow-hidden border border-white/10 shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="p-4 flex justify-between items-center border-b border-white/5 bg-surface z-10">
                <div>
                  <h3 className="font-display font-bold text-lg">{new Date(selectedEntry.date).toLocaleDateString('zh-TW')}</h3>
                  <p className="text-primary font-medium text-sm">{selectedEntry.weight} kg</p>
                </div>
                <button onClick={() => setSelectedEntry(null)} className="bg-background/50 p-2 rounded-full text-zinc-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              
              <div className="overflow-y-auto p-5 space-y-6">
                {selectedEntry.photoBase64 && (
                  <div className="rounded-2xl overflow-hidden border border-white/5 bg-black">
                    <img src={selectedEntry.photoBase64} alt="Progress" className="w-full h-auto" />
                  </div>
                )}
                
                {selectedEntry.aiAnalysis && (
                  <div className="bg-primary/5 rounded-2xl p-5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                      </div>
                      <h4 className="font-display font-bold text-primary">AI 體態分析</h4>
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-a:text-primary markdown-body">
                      <ReactMarkdown>{selectedEntry.aiAnalysis}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProgressTracker;
