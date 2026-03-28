import React, { useState, useEffect } from 'react';
import { Exercise, WorkoutSession } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ActiveWorkoutProps {
  routine: Exercise[];
  planName: string;
  onFinish: (session: WorkoutSession) => void;
  onCancel: () => void;
}

const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({ routine, planName, onFinish, onCancel }) => {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState<number[]>(routine.map(() => 0)); // Track completed sets per exercise
  const [workoutDuration, setWorkoutDuration] = useState(0); // Total workout time in seconds
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [showInstruction, setShowInstruction] = useState(false);

  // Active Set Timer
  const [activeSetTimer, setActiveSetTimer] = useState(0);
  const [isActiveSetRunning, setIsActiveSetRunning] = useState(false);

  // Global Workout Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setWorkoutDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Rest Timer
  useEffect(() => {
    let interval: number;
    if (isResting && restTimer > 0) {
      interval = window.setInterval(() => {
        setRestTimer(prev => prev - 1);
      }, 1000);
    } else if (restTimer === 0 && isResting) {
      setIsResting(false);
      // Play a beep sound or vibrate here in a real app
      if (navigator.vibrate) navigator.vibrate(200);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer]);

  const currentExercise = routine[currentExerciseIndex];
  const isLastExercise = currentExerciseIndex === routine.length - 1;

  const isTimeBased = (reps: string) => {
    return reps.includes('秒') || reps.toLowerCase().includes('s');
  };

  const parseTime = (reps: string) => {
    const match = reps.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

  // Active Set Timer Logic
  useEffect(() => {
    let interval: number;
    if (isActiveSetRunning && activeSetTimer > 0) {
      interval = window.setInterval(() => {
        setActiveSetTimer(prev => prev - 1);
      }, 1000);
    } else if (activeSetTimer === 0 && isActiveSetRunning) {
      setIsActiveSetRunning(false);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      handleSetComplete();
    }
    return () => clearInterval(interval);
  }, [isActiveSetRunning, activeSetTimer]);

  const startActiveSet = () => {
    const time = parseTime(currentExercise.reps);
    if (time > 0) {
      setActiveSetTimer(time);
      setIsActiveSetRunning(true);
    } else {
      handleSetComplete();
    }
  };

  const handleSetComplete = () => {
    const newCompletedSets = [...completedSets];
    newCompletedSets[currentExerciseIndex] += 1;
    setCompletedSets(newCompletedSets);
    setIsActiveSetRunning(false);

    // Start Rest Timer (default 60s)
    if (newCompletedSets[currentExerciseIndex] < currentExercise.sets) {
        setRestTimer(60);
        setIsResting(true);
    }
  };

  const handleNextExercise = () => {
    if (!isLastExercise) {
      setCurrentExerciseIndex(prev => prev + 1);
      setIsResting(false);
      setShowInstruction(false);
      setIsActiveSetRunning(false);
    } else {
      finishWorkout();
    }
  };

  const finishWorkout = () => {
    const session: WorkoutSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      exercises: routine, // In a complex app, we'd track actual weights used
      durationMinutes: Math.ceil(workoutDuration / 60),
      notes: `Completed plan: ${planName}`
    };
    onFinish(session);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-background z-50 flex flex-col"
    >
      {/* Top Bar */}
      <div className="p-4 flex justify-between items-center bg-surface/80 backdrop-blur-md border-b border-white/5">
        <button onClick={onCancel} className="text-zinc-400 text-sm font-medium px-2 py-1">離開</button>
        <div className="font-mono text-xl font-bold text-white tracking-widest">{formatTime(workoutDuration)}</div>
        <button onClick={finishWorkout} className="text-primary font-bold text-sm px-2 py-1">完成</button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center relative">
        
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-zinc-800 rounded-full mb-8 overflow-hidden">
           <motion.div 
             className="h-full bg-primary" 
             initial={{ width: 0 }}
             animate={{ width: `${((currentExerciseIndex) / routine.length) * 100}%` }}
             transition={{ duration: 0.5, ease: "easeInOut" }}
           />
        </div>

        {/* Current Exercise Card */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentExerciseIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm mb-8 text-center"
          >
              <h2 className="text-3xl font-display font-bold text-white mb-3">{currentExercise.name}</h2>
              <div className="inline-block bg-zinc-800/80 px-4 py-1.5 rounded-full text-zinc-300 text-sm mb-8 border border-white/5 font-medium">
                  第 {currentExerciseIndex + 1} / {routine.length} 個動作
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-surface/60 p-5 rounded-3xl border border-white/5 backdrop-blur-sm shadow-lg">
                      <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-1">目標組數</p>
                      <p className="text-3xl font-display font-bold text-white">{currentExercise.sets}</p>
                  </div>
                  <div className="bg-surface/60 p-5 rounded-3xl border border-white/5 backdrop-blur-sm shadow-lg">
                      <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-1">次數/時間</p>
                      <p className="text-3xl font-display font-bold text-primary drop-shadow-[0_0_12px_rgba(163,230,53,0.2)]">{currentExercise.reps}</p>
                  </div>
              </div>

              {currentExercise.notes && (
                  <p className="text-zinc-400 text-sm italic mb-8 bg-zinc-800/30 p-4 rounded-2xl border border-white/5">💡 "{currentExercise.notes}"</p>
              )}

              {currentExercise.instruction && (
                  <div className="mb-8 w-full text-left">
                      <button 
                          onClick={() => setShowInstruction(!showInstruction)}
                          className="flex items-center justify-between w-full bg-zinc-800/80 p-5 rounded-2xl text-zinc-300 hover:bg-zinc-700 transition-colors border border-white/5"
                      >
                          <span className="font-bold flex items-center gap-3">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                              動作教學
                          </span>
                          <motion.span animate={{ rotate: showInstruction ? 180 : 0 }}>▼</motion.span>
                      </button>
                      <AnimatePresence>
                        {showInstruction && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-zinc-800/40 p-5 rounded-b-2xl -mt-2 pt-6 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap border border-t-0 border-white/5 shadow-inner">
                                  {currentExercise.instruction}
                              </div>
                            </motion.div>
                        )}
                      </AnimatePresence>
                  </div>
              )}

              {/* Sets Tracker */}
              <div className="flex justify-center gap-3 mb-8">
                  {Array.from({length: currentExercise.sets}).map((_, i) => (
                      <motion.div 
                          key={i} 
                          initial={false}
                          animate={{ 
                            scale: i < completedSets[currentExerciseIndex] ? [1, 1.2, 1] : 1,
                            backgroundColor: i < completedSets[currentExerciseIndex] ? '#a3e635' : 'transparent',
                            borderColor: i < completedSets[currentExerciseIndex] ? '#a3e635' : '#52525b'
                          }}
                          className="w-4 h-4 rounded-full border-2"
                      />
                  ))}
              </div>
          </motion.div>
        </AnimatePresence>

        {/* Rest Timer Overlay */}
        <AnimatePresence>
          {isResting && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="absolute inset-x-4 top-1/4 bg-zinc-800/95 backdrop-blur-xl border border-primary/30 p-8 rounded-[2rem] text-center shadow-2xl z-10"
              >
                  <p className="text-zinc-400 font-medium mb-2 uppercase tracking-widest text-sm">休息一下</p>
                  <div className="text-7xl font-display font-bold text-white mb-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{restTimer}</div>
                  <div className="flex gap-4 justify-center">
                      <button onClick={() => setRestTimer(prev => prev + 10)} className="px-6 py-3 bg-zinc-700 rounded-2xl text-white font-bold hover:bg-zinc-600 transition-colors">+10s</button>
                      <button onClick={() => setIsResting(false)} className="px-6 py-3 bg-primary text-zinc-950 font-bold rounded-2xl hover:bg-lime-400 transition-colors shadow-lg shadow-primary/20">跳過</button>
                  </div>
              </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Bottom Controls */}
      <div className="p-4 bg-surface/80 backdrop-blur-md border-t border-white/5 pb-safe safe-area-inset-bottom">
         {completedSets[currentExerciseIndex] < currentExercise.sets ? (
             isTimeBased(currentExercise.reps) ? (
                 isActiveSetRunning ? (
                     <button 
                        onClick={handleSetComplete}
                        className="w-full bg-red-500/20 text-red-400 border border-red-500/50 font-bold text-lg py-4 rounded-2xl hover:bg-red-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl"
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        跳過計時 ({activeSetTimer}s)
                     </button>
                 ) : (
                     <button 
                        onClick={startActiveSet}
                        className="w-full bg-primary text-zinc-950 font-bold text-lg py-4 rounded-2xl hover:bg-lime-400 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        開始第 {completedSets[currentExerciseIndex] + 1} 組計時
                     </button>
                 )
             ) : (
                 <button 
                    onClick={handleSetComplete}
                    className="w-full bg-white text-zinc-950 font-bold text-lg py-4 rounded-2xl hover:bg-zinc-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    完成第 {completedSets[currentExerciseIndex] + 1} 組
                 </button>
             )
         ) : (
             <button 
                onClick={handleNextExercise}
                className="w-full bg-primary text-zinc-950 font-bold text-lg py-4 rounded-2xl hover:bg-lime-400 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
             >
                {isLastExercise ? '完成訓練！' : '下一個動作 →'}
             </button>
         )}
      </div>
    </motion.div>
  );
};

export default ActiveWorkout;
