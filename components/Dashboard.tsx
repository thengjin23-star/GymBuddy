import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UserProfile, WorkoutSession, WeeklyPlan, DayPlan, Exercise } from '../types';

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
  // Get today's day name (e.g., "Monday")
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  
  // Find today's plan from the weekly profile
  const todaysPlan = profile.weeklyPlan?.schedule.find(d => d.day === todayName);

  const handleDeleteWeeklyPlan = () => {
    if (confirm('確定要刪除目前的週課表嗎？')) {
      const updatedProfile = { ...profile };
      delete updatedProfile.weeklyPlan;
      onUpdateProfile(updatedProfile);
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

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Header */}
      <header className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">你好，{profile.name}</h1>
          <p className="text-zinc-400 text-sm mt-1">今天狀況如何？</p>
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
                   className={`flex-shrink-0 w-[100px] p-4 rounded-3xl border flex flex-col items-center justify-center gap-2 transition-all ${
                     isToday 
                     ? 'bg-zinc-800 border-primary/50 shadow-lg shadow-primary/10 scale-105' 
                     : 'bg-surface/50 border-white/5 opacity-80 backdrop-blur-sm'
                   }`}
                 >
                   <p className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-zinc-400'}`}>
                     {dayMap[day.day].replace('週', '')}
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

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="bg-surface/60 p-5 rounded-3xl border border-white/5 backdrop-blur-sm">
          <p className="text-zinc-400 text-xs font-medium mb-1">本週訓練</p>
          <div className="flex items-baseline gap-1.5">
             <p className="text-3xl font-display font-bold text-white">{history.filter(h => {
                const d = new Date(h.date);
                const now = new Date();
                return d > new Date(now.setDate(now.getDate() - 7));
             }).length}</p>
             <span className="text-sm text-zinc-500 font-medium">次</span>
          </div>
        </div>
        <div className="bg-surface/60 p-5 rounded-3xl border border-white/5 backdrop-blur-sm">
           <p className="text-zinc-400 text-xs font-medium mb-1">總分鐘數</p>
           <div className="flex items-baseline gap-1.5">
             <p className="text-3xl font-display font-bold text-primary drop-shadow-[0_0_12px_rgba(163,230,53,0.2)]">{totalMinutes}</p>
             <span className="text-sm text-zinc-500 font-medium">分</span>
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
