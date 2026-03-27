import React, { useState } from 'react';
import { Exercise, WorkoutSession } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface WorkoutLogProps {
  onSave: (session: WorkoutSession) => void;
}

const WorkoutLog: React.FC<WorkoutLogProps> = ({ onSave }) => {
  const [sessionExercises, setSessionExercises] = useState<Exercise[]>([]);
  const [currentExercise, setCurrentExercise] = useState<Partial<Exercise>>({});
  const [duration, setDuration] = useState<number>(45);

  const addExercise = () => {
    if (currentExercise.name && currentExercise.sets && currentExercise.reps) {
      setSessionExercises([
        ...sessionExercises,
        {
          name: currentExercise.name,
          sets: Number(currentExercise.sets),
          reps: String(currentExercise.reps),
          weight: currentExercise.weight ? Number(currentExercise.weight) : 0,
        } as Exercise,
      ]);
      setCurrentExercise({});
    }
  };

  const handleFinish = () => {
    if (sessionExercises.length === 0) return;
    
    const newSession: WorkoutSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      exercises: sessionExercises,
      durationMinutes: duration,
    };
    
    onSave(newSession);
    setSessionExercises([]); // Reset
    alert("🎉 訓練紀錄已儲存！");
  };

  return (
    <div className="flex flex-col h-full pb-24 space-y-6">
      <h2 className="text-3xl font-display font-bold text-white tracking-tight">紀錄訓練</h2>

      {/* Input Card */}
      <div className="bg-surface/60 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 shadow-xl space-y-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        
        <h3 className="text-primary font-bold text-sm uppercase tracking-widest flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          新增動作
        </h3>
        
        <div className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">動作名稱</label>
            <input
              type="text"
              className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="例如：臥推"
              value={currentExercise.name || ''}
              onChange={e => setCurrentExercise({...currentExercise, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">組數</label>
              <input
                type="number"
                className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-center font-mono"
                placeholder="3"
                value={currentExercise.sets || ''}
                onChange={e => setCurrentExercise({...currentExercise, sets: parseInt(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">次數</label>
              <input
                type="text"
                className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-center font-mono"
                placeholder="12"
                value={currentExercise.reps || ''}
                onChange={e => setCurrentExercise({...currentExercise, reps: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">重量 (kg)</label>
              <input
                type="number"
                className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-center font-mono"
                placeholder="0"
                value={currentExercise.weight || ''}
                onChange={e => setCurrentExercise({...currentExercise, weight: parseFloat(e.target.value)})}
              />
            </div>
          </div>

          <button
            onClick={addExercise}
            disabled={!currentExercise.name || !currentExercise.sets || !currentExercise.reps}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/5 active:scale-[0.98]"
          >
            加入列表
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          本次訓練內容
        </h3>
        {sessionExercises.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 border-2 border-dashed border-white/10 rounded-[2rem] bg-surface/30 backdrop-blur-sm">
            <p className="font-medium">尚未新增任何動作</p>
            <p className="text-sm mt-1 opacity-70">在上方輸入動作並加入列表</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {sessionExercises.map((ex, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  className="bg-surface/80 backdrop-blur-md p-5 rounded-2xl flex justify-between items-center border border-white/5 shadow-lg group"
                >
                  <div>
                    <p className="font-bold text-white text-lg">{ex.name}</p>
                    <p className="text-sm text-zinc-400 font-mono mt-0.5">
                      <span className="text-primary/80">{ex.sets}</span> 組 × <span className="text-primary/80">{ex.reps}</span>
                      {ex.weight ? ` @ ${ex.weight}kg` : ''}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSessionExercises(sessionExercises.filter((_, i) => i !== idx))}
                    className="text-red-400/70 hover:text-red-400 p-3 bg-red-400/10 rounded-xl transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Finish Button */}
      <AnimatePresence>
        {sessionExercises.length > 0 && (
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: 20 }}
             className="bg-surface/80 backdrop-blur-xl p-5 rounded-[2rem] border border-white/10 shadow-2xl sticky bottom-4"
           >
             <label className="block text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wider">總時長 (分鐘)</label>
              <div className="flex gap-4">
                <input 
                  type="number" 
                  value={duration} 
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-24 bg-zinc-900/80 text-white p-4 rounded-2xl text-center font-mono text-lg border border-white/5 focus:border-primary outline-none transition-colors"
                />
                <button
                  onClick={handleFinish}
                  className="flex-1 bg-primary text-zinc-950 font-bold py-4 rounded-2xl hover:bg-lime-400 transition-all shadow-[0_0_20px_rgba(163,230,53,0.2)] active:scale-[0.98] text-lg"
                >
                  完成並儲存
                </button>
              </div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkoutLog;
