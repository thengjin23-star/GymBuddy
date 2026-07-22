import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UserProfile, WorkoutSession, WeeklyPlan, DayPlan, Exercise } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './Toast';

interface DashboardProps {
  profile: UserProfile;
  history: WorkoutSession[];
  onStartWorkout: (routine: Exercise[], name: string) => void;
  onUpdateProfile: (profile: UserProfile) => void;
}

const goalMap: Record<string, string> = {
  muscle: '增肌',
  weight_loss: '減脂',
  endurance: '耐力',
  flexibility: '柔軟度'
};

const dayMap: Record<string, string> = {
  'Monday': '週一', 'Tuesday': '週二', 'Wednesday': '週三', 'Thursday': '週四', 'Friday': '週五', 'Saturday': '週六', 'Sunday': '週日'
};

const Dashboard: React.FC<DashboardProps> = ({ profile, history, onStartWorkout, onUpdateProfile }) => {
  const { confirm, showToast } = useToast();
  const [selectedDayPlan, setSelectedDayPlan] = useState<DayPlan | null>(null);

  // Get today's day name (e.g., "Monday")
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  
  // Find today's plan from the weekly profile
  const todaysPlan = profile.weeklyPlan?.schedule.find(d => d.day === todayName);

  const handleDeleteWeeklyPlan = async () => {
    if (await confirm('確定要刪除目前的週課表嗎？')) {
      const updatedProfile = { ...profile };
      delete updatedProfile.weeklyPlan;
      onUpdateProfile(updatedProfile);
      showToast('已刪除週課表', 'info');
    }
  };

  // Process history for chart (Group by date)
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
  });

  const groupedData = history.reduce((acc, session) => {
    const dateStr = new Date(session.date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
    if (!acc[dateStr]) acc[dateStr] = 0;
    acc[dateStr] += session.durationMinutes;
    return acc;
  }, {} as Record<string, number>);

  const chartData = last7Days.map(dateStr => ({
    name: dateStr,
    duration: groupedData[dateStr] || 0,
  }));

  const totalWorkouts = history.length;
  const totalMinutes = history.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  // Calculate Streak
  const calculateStreak = () => {
    if (history.length === 0) return 0;
    
    const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const uniqueDates = Array.from(new Set(sortedHistory.map(h => {
      const d = new Date(h.date);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    })));

    let streak = 0;
    const today = new Date();
    const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const yesterdayTime = todayTime - 86400000;

    if (!uniqueDates.includes(todayTime) && !uniqueDates.includes(yesterdayTime)) {
      return 0;
    }

    let currentDateToCheck = uniqueDates.includes(todayTime) ? todayTime : yesterdayTime;

    for (let i = 0; i < uniqueDates.length; i++) {
      if (uniqueDates[i] === currentDateToCheck) {
        streak++;
        currentDateToCheck -= 86400000;
      } else if (uniqueDates[i] < currentDateToCheck) {
        break;
      }
    }

    return streak;
  };
  
  const currentStreak = calculateStreak();

  const motivationalQuotes = [
    "每一次的堅持，都是為了遇見更好的自己。",
    "不要在該奮鬥的年紀選擇安逸。",
    "汗水是脂肪在哭泣。",
    "今天的努力，明天的實力。",
    "放棄很容易，但堅持下去一定很酷。",
    "自律給你真正的自由。",
    "沒有天生的強者，只有不懈的努力。",
    "將來的你，一定會感謝現在拚命的自己。"
  ];
  
  // Use date to pick a quote so it changes daily but stays consistent during the day
  const quoteIndex = new Date().getDate() % motivationalQuotes.length;
  const dailyQuote = motivationalQuotes[quoteIndex];

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Header */}
      <header className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">你好，{profile.name}</h1>
          <p className="text-zinc-400 text-sm mt-1">{dailyQuote}</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center text-zinc-900 font-display font-bold text-xl uppercase shadow-lg shadow-primary/20">
          {profile.name.charAt(0)}
        </div>
      </header>

      {/* TODAY'S ACTION CARD (Hero Section) */}
      <div className="bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border border-white/10 p-6 rounded-[2rem] relative overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-10 -mt-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-full -ml-8 -mb-8 blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-primary font-semibold text-xs tracking-wider uppercase mb-2">今日計畫 • {dayMap[todayName] || todayName}</p>
              <h2 className="text-3xl font-display font-bold text-white leading-tight">
                {todaysPlan ? (todaysPlan.isRest ? '休息日 😴' : todaysPlan.focus) : '尚未安排計畫'}
              </h2>
            </div>
            {todaysPlan && !todaysPlan.isRest && (
              <div className="bg-primary/10 text-primary border border-primary/20 text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm">
                {todaysPlan.routine?.length || 0} 個動作
              </div>
            )}
          </div>

          {todaysPlan && !todaysPlan.isRest && todaysPlan.routine ? (
            <div className="space-y-5">
               <div className="text-zinc-300 text-sm line-clamp-2 leading-relaxed">
                 {todaysPlan.routine.map(e => e.name).join('、')}
               </div>
               <button 
                 onClick={() => onStartWorkout(todaysPlan.routine!, `週計畫 - ${todaysPlan.focus}`)}
                 className="w-full bg-primary text-zinc-950 font-bold py-4 rounded-2xl hover:bg-lime-400 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                 開始訓練
               </button>
            </div>
          ) : (
            <div className="text-zinc-400 text-sm bg-black/20 p-4 rounded-2xl border border-white/5">
              {todaysPlan?.isRest ? '好好休息，肌肉是在休息時生長的！' : '去「AI 教練」頁面產生一份專屬的週課表吧！'}
            </div>
          )}
        </div>
      </div>

      {/* Weekly Schedule Preview */}
      {profile.weeklyPlan && (
        <div className="mt-2">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-white font-display font-semibold text-lg">本週課表</h3>
             <button 
               onClick={handleDeleteWeeklyPlan}
               className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20 transition-colors"
             >
               刪除課表
             </button>
           </div>
           <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4">
             {profile.weeklyPlan.schedule.map((day, idx) => {
               const isToday = day.day === todayName;
               return (
                 <div 
                   key={idx} 
                   onClick={() => setSelectedDayPlan(day)}
                   className={`flex-shrink-0 w-[100px] p-4 rounded-3xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                     isToday 
                     ? 'bg-zinc-800 border-primary/50 shadow-lg shadow-primary/10 scale-105' 
                     : 'bg-surface/50 border-white/5 opacity-80 backdrop-blur-sm'
                   }`}
                 >
                   <p className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-zinc-400'}`}>
                     {(dayMap[day.day] || day.day).replace('週', '')}
                   </p>
                   <p className="text-white font-display font-bold text-sm text-center line-clamp-1">
                     {day.isRest ? '休息' : day.focus}
                   </p>
                   {day.isRest ? (
                      <span className="text-sm mt-1">💤</span>
                   ) : (
                      <div className={`w-2 h-2 rounded-full mt-1 ${isToday ? 'bg-primary shadow-[0_0_8px_rgba(163,230,53,0.8)]' : 'bg-zinc-600'}`}></div>
                   )}
                 </div>
               );
             })}
           </div>
        </div>
      )}

      {/* Day Plan Modal */}
      <AnimatePresence>
        {selectedDayPlan && (
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
              <div className="p-5 flex justify-between items-center border-b border-white/5 bg-surface z-10">
                <div>
                  <h3 className="font-display font-bold text-xl">{dayMap[selectedDayPlan.day] || selectedDayPlan.day}</h3>
                  <p className="text-primary font-medium text-sm">{selectedDayPlan.isRest ? '休息日' : selectedDayPlan.focus}</p>
                </div>
                <button onClick={() => setSelectedDayPlan(null)} className="bg-background/50 p-2 rounded-full text-zinc-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              
              <div className="overflow-y-auto p-5 space-y-4">
                {selectedDayPlan.isRest ? (
                  <div className="text-center py-10 text-zinc-400">
                    <span className="text-4xl block mb-4">💤</span>
                    <p>今天是休息日，讓肌肉好好恢復吧！</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(selectedDayPlan.routine || []).map((ex, i) => (
                      <div key={i} className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5">
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
                )}
              </div>

              {!selectedDayPlan.isRest && selectedDayPlan.routine && selectedDayPlan.routine.length > 0 && (
                <div className="p-5 border-t border-white/5 bg-surface/80 backdrop-blur-md">
                  <button
                    onClick={() => {
                      onStartWorkout(selectedDayPlan.routine!, `${dayMap[selectedDayPlan.day] || selectedDayPlan.day} - ${selectedDayPlan.focus}`);
                      setSelectedDayPlan(null);
                    }}
                    className="w-full bg-primary text-zinc-950 font-bold py-4 rounded-2xl hover:bg-lime-400 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    開始這天的訓練
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mt-2">
        <div className="bg-surface/60 p-4 rounded-3xl border border-white/5 backdrop-blur-sm flex flex-col items-center justify-center text-center">
          <p className="text-zinc-400 text-[11px] font-medium mb-1">連續打卡</p>
          <div className="flex items-baseline gap-1">
             <p className="text-2xl font-display font-bold text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.3)]">{currentStreak}</p>
             <span className="text-xs text-zinc-500 font-medium">天</span>
          </div>
        </div>
        <div className="bg-surface/60 p-4 rounded-3xl border border-white/5 backdrop-blur-sm flex flex-col items-center justify-center text-center">
          <p className="text-zinc-400 text-[11px] font-medium mb-1">本週訓練</p>
          <div className="flex items-baseline gap-1">
             <p className="text-2xl font-display font-bold text-white">{history.filter(h => {
                const d = new Date(h.date);
                const now = new Date();
                return d > new Date(now.setDate(now.getDate() - 7));
             }).length}</p>
             <span className="text-xs text-zinc-500 font-medium">次</span>
          </div>
        </div>
        <div className="bg-surface/60 p-4 rounded-3xl border border-white/5 backdrop-blur-sm flex flex-col items-center justify-center text-center">
           <p className="text-zinc-400 text-[11px] font-medium mb-1">總分鐘數</p>
           <div className="flex items-baseline gap-1">
             <p className="text-2xl font-display font-bold text-primary drop-shadow-[0_0_12px_rgba(163,230,53,0.2)]">{totalMinutes}</p>
             <span className="text-xs text-zinc-500 font-medium">分</span>
           </div>
        </div>
      </div>

      {/* Activity Chart */}
      {history.length > 0 && (
        <div className="bg-surface/60 p-6 rounded-3xl border border-white/5 mt-4 backdrop-blur-sm">
          <h3 className="text-white font-display font-semibold mb-6 text-lg">近期活動 <span className="text-zinc-500 text-sm font-sans font-normal ml-1">(分鐘)</span></h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a3e635" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#a3e635" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#f8fafc', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{ color: '#a3e635', fontWeight: 'bold' }}
                  cursor={{ stroke: 'rgba(163,230,53,0.2)', strokeWidth: 2, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="duration" stroke="#a3e635" strokeWidth={3} fillOpacity={1} fill="url(#colorDuration)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default Dashboard;
