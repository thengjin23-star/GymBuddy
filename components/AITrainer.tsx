import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, ChatMessage, WorkoutPlan, WeeklyPlan, WorkoutSession, ProgressEntry } from '../types';
import { sendChatMessage, generateWorkoutPlan, generateWeeklyPlan } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

interface AITrainerProps {
  profile: UserProfile;
  workoutHistory: WorkoutSession[];
  progressHistory: ProgressEntry[];
  onUpdateProfile: (p: UserProfile) => void;
  onStartWorkout: (routine: Exercise[], name: string) => void;
}

const AITrainer: React.FC<AITrainerProps> = ({ profile, workoutHistory, progressHistory, onUpdateProfile, onStartWorkout }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `嗨 ${profile.name}！我是你的專屬 AI 教練 FitFlow。根據你的資料（${profile.weight}kg, ${profile.height}cm），你的目標是「${profile.goal === 'muscle' ? '增肌' : profile.goal === 'weight_loss' ? '減脂' : profile.goal === 'endurance' ? '耐力' : '柔軟度'}」。\n\n你可以直接告訴我你想練什麼部位，我會幫你安排菜單，或者點擊下方按鈕讓我為你規劃一週課表！`,
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'chat' | 'plan' | 'weekly'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if ((!inputText.trim() && mode !== 'weekly') || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: mode === 'weekly' ? '請幫我產生一週課表' : inputText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    if (mode === 'chat') {
      const response = await sendChatMessage(messages, inputText, profile, workoutHistory, progressHistory);
      
      if (response.plan) {
         const newMsgs: ChatMessage[] = [];
         if (response.text && response.text.trim()) {
            newMsgs.push({
               id: (Date.now() + 1).toString(),
               role: 'model',
               text: response.text,
               timestamp: Date.now(),
            });
         }
         newMsgs.push({
            id: (Date.now() + 2).toString(),
            role: 'model',
            text: JSON.stringify(response.plan),
            isPlan: true,
            timestamp: Date.now() + 1,
         });
         setMessages((prev) => [...prev, ...newMsgs]);
      } else {
         const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: response.text,
            timestamp: Date.now(),
         };
         setMessages((prev) => [...prev, aiMsg]);
      }
    } else if (mode === 'plan') {
      const plan = await generateWorkoutPlan(profile, inputText, workoutHistory, progressHistory);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: plan ? JSON.stringify(plan) : "抱歉，無法生成單次菜單。",
        isPlan: !!plan,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setMode('chat'); 
    } else if (mode === 'weekly') {
      const weeklyPlan = await generateWeeklyPlan(profile, workoutHistory, progressHistory);
      if (weeklyPlan) {
        // Save to profile
        const newProfile = { ...profile, weeklyPlan };
        onUpdateProfile(newProfile);
        
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: "每週課表已生成並儲存到首頁！你可以隨時查看。",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
         const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: "生成週課表失敗，請稍後再試。",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
      setMode('chat');
    }

    setIsLoading(false);
  };

  const renderPlanCard = (jsonString: string) => {
    try {
      const plan: WorkoutPlan = JSON.parse(jsonString);
      return (
        <div className="bg-surface/80 rounded-3xl p-5 my-2 border border-white/10 w-full shadow-xl backdrop-blur-md">
          <div className="flex justify-between items-start mb-3">
             <h3 className="text-xl font-display font-bold text-white">{plan.name}</h3>
             <span className="text-[10px] uppercase tracking-wider font-bold bg-primary/20 text-primary px-2.5 py-1 rounded-full border border-primary/20">單次菜單</span>
          </div>
          <p className="text-sm text-zinc-400 mb-5 leading-relaxed">{plan.description}</p>
          <div className="space-y-3 mb-6">
            {plan.routine.map((ex, i) => (
              <div key={i} className="flex justify-between items-center bg-black/20 p-3.5 rounded-2xl border border-white/5">
                <div>
                  <p className="font-medium text-white">{ex.name}</p>
                  {ex.notes && <p className="text-xs text-zinc-500 mt-1">{ex.notes}</p>}
                </div>
                <div className="text-right bg-surface px-3 py-1.5 rounded-xl border border-white/5">
                  <p className="text-sm font-bold text-primary">{ex.sets} <span className="text-zinc-500 text-xs font-normal">組</span> x {ex.reps}</p>
                </div>
              </div>
            ))}
          </div>
          <button 
             onClick={() => onStartWorkout(plan.routine, plan.name)}
             className="w-full bg-primary text-zinc-950 font-bold py-4 rounded-2xl hover:bg-lime-400 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
             開始訓練
           </button>
        </div>
      );
    } catch (e) {
      return <div className="text-red-400 bg-red-500/10 p-4 rounded-2xl border border-red-500/20">無法顯示菜單格式。</div>;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      {/* Mode Switcher */}
      <div className="flex gap-2 p-2 overflow-x-auto no-scrollbar mx-2 mt-2 pb-4">
        <button
          onClick={() => setMode('chat')}
          className={`whitespace-nowrap px-5 py-2.5 text-sm font-medium rounded-full transition-all border ${
            mode === 'chat' ? 'bg-primary border-primary text-zinc-950 shadow-lg shadow-primary/20' : 'bg-surface/50 border-white/10 text-zinc-400 backdrop-blur-sm'
          }`}
        >
          對話教練
        </button>
        <button
          onClick={() => setMode('plan')}
          className={`whitespace-nowrap px-5 py-2.5 text-sm font-medium rounded-full transition-all border ${
            mode === 'plan' ? 'bg-primary border-primary text-zinc-950 shadow-lg shadow-primary/20' : 'bg-surface/50 border-white/10 text-zinc-400 backdrop-blur-sm'
          }`}
        >
          單次菜單
        </button>
        <button
          onClick={() => {
              setMode('weekly');
              // Auto trigger for better UX if clicking this button
              if(!isLoading) setTimeout(handleSend, 100);
          }}
          className={`whitespace-nowrap px-5 py-2.5 text-sm font-medium rounded-full transition-all border ${
            mode === 'weekly' ? 'bg-primary border-primary text-zinc-950 shadow-lg shadow-primary/20' : 'bg-surface/50 border-white/10 text-zinc-400 backdrop-blur-sm'
          }`}
        >
          🪄 生成一週課表
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 space-y-6 no-scrollbar pb-4 pt-2">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-emerald-400 text-zinc-950 flex items-center justify-center mr-3 flex-shrink-0 mt-1 shadow-lg shadow-primary/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="m16 8-2 2"/><path d="m8 8 2 2"/><rect width="16" height="12" x="4" y="12" rx="2"/><path d="M10 16h4"/></svg>
                </div>
              )}
              
              {msg.isPlan ? (
                renderPlanCard(msg.text)
              ) : (
                <div
                  className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap shadow-md ${
                    msg.role === 'user'
                      ? 'bg-primary text-zinc-950 rounded-br-sm font-medium'
                      : 'bg-surface/80 text-zinc-100 rounded-bl-sm border border-white/5 backdrop-blur-md'
                  }`}
                >
                  {msg.text}
                </div>
              )}
            </motion.div>
          ))}
          {isLoading && (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="flex justify-start"
             >
               <div className="w-8 h-8 mr-3" />
               <div className="bg-surface/80 px-5 py-4 rounded-3xl rounded-bl-sm border border-white/5 backdrop-blur-md shadow-md">
                 <div className="flex space-x-2">
                   <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 bg-primary rounded-full" />
                   <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-primary rounded-full" />
                   <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-primary rounded-full" />
                 </div>
               </div>
             </motion.div>
          )}
        </AnimatePresence>
        <div ref={scrollRef} className="h-1" />
      </div>

      {/* Input Area */}
      {mode !== 'weekly' && (
        <div className="p-4 bg-background/80 backdrop-blur-xl sticky bottom-0 border-t border-white/5">
            <div className="relative flex items-center">
            <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={mode === 'chat' ? "問我問題..." : "描述想練的部位 (例如：胸)"}
                className="w-full bg-surface/80 text-white rounded-full py-4 pl-5 pr-14 border border-white/10 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-zinc-500 shadow-inner"
            />
            <button
                onClick={handleSend}
                disabled={isLoading || !inputText.trim()}
                className="absolute right-2 p-2.5 bg-primary rounded-full text-zinc-950 hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default AITrainer;
