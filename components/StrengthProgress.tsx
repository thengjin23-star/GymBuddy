import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { WorkoutSession } from '../types';

interface StrengthProgressProps {
  history: WorkoutSession[];
}

interface ExercisePoint {
  date: string; // ISO
  weight: number;
}

interface ExerciseStats {
  name: string;
  points: ExercisePoint[]; // ascending by date
  personalRecord: number;
  latestWeight: number;
  previousWeight: number | null;
  lastTrained: string; // ISO
  sessionCount: number;
}

/**
 * Aggregates per-exercise strength history from logged workouts.
 * Only exercises that were logged with a weight can show progression.
 */
const buildStats = (history: WorkoutSession[]): ExerciseStats[] => {
  const byName = new Map<string, ExercisePoint[]>();

  for (const session of history) {
    for (const ex of session.exercises || []) {
      if (!ex.weight || ex.weight <= 0) continue;
      const points = byName.get(ex.name) || [];
      // One point per session per exercise: keep the heaviest set
      const existing = points.find((p) => p.date === session.date);
      if (existing) {
        existing.weight = Math.max(existing.weight, ex.weight);
      } else {
        points.push({ date: session.date, weight: ex.weight });
      }
      byName.set(ex.name, points);
    }
  }

  const stats: ExerciseStats[] = [];
  byName.forEach((points, name) => {
    const sorted = [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    stats.push({
      name,
      points: sorted,
      personalRecord: Math.max(...sorted.map((p) => p.weight)),
      latestWeight: sorted[sorted.length - 1].weight,
      previousWeight: sorted.length > 1 ? sorted[sorted.length - 2].weight : null,
      lastTrained: sorted[sorted.length - 1].date,
      sessionCount: sorted.length,
    });
  });

  // Most recently trained first
  return stats.sort((a, b) => new Date(b.lastTrained).getTime() - new Date(a.lastTrained).getTime());
};

const StrengthProgress: React.FC<StrengthProgressProps> = ({ history }) => {
  const stats = useMemo(() => buildStats(history), [history]);
  const [selected, setSelected] = useState<ExerciseStats | null>(null);

  if (stats.length === 0) {
    return (
      <div className="text-center py-12 px-6 text-zinc-500 bg-surface/50 rounded-3xl border border-white/5">
        <span className="text-4xl block mb-4">🏋️</span>
        <p className="font-medium text-zinc-400">尚未有力量數據</p>
        <p className="text-sm mt-2 leading-relaxed">
          在訓練模式中記錄每個動作使用的重量，這裡就會顯示你的力量成長曲線與個人紀錄 (PR)。
        </p>
      </div>
    );
  }

  const totalPRs = stats.filter((s) => s.latestWeight >= s.personalRecord).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface/60 p-4 rounded-3xl border border-white/5 text-center">
          <p className="text-zinc-400 text-[11px] font-medium mb-1">追蹤動作</p>
          <p className="text-2xl font-display font-bold text-white">{stats.length}</p>
        </div>
        <div className="bg-surface/60 p-4 rounded-3xl border border-white/5 text-center">
          <p className="text-zinc-400 text-[11px] font-medium mb-1">保持 PR 中</p>
          <p className="text-2xl font-display font-bold text-primary drop-shadow-[0_0_12px_rgba(163,230,53,0.2)]">{totalPRs}</p>
        </div>
      </div>

      {/* Exercise list */}
      <div className="space-y-3">
        {stats.map((s) => {
          const delta = s.previousWeight !== null ? s.latestWeight - s.previousWeight : 0;
          const isPR = s.latestWeight >= s.personalRecord && s.sessionCount > 1;
          return (
            <motion.button
              key={s.name}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(s)}
              className="w-full bg-surface/60 p-4 rounded-2xl border border-white/5 flex justify-between items-center text-left hover:border-white/15 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white truncate flex items-center gap-2">
                  {s.name}
                  {isPR && <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full flex-shrink-0">PR</span>}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {s.sessionCount} 次紀錄 · 最佳 {s.personalRecord} kg
                </p>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className="text-lg font-display font-bold text-white tabular-nums">{s.latestWeight} <span className="text-xs text-zinc-500 font-sans font-normal">kg</span></p>
                {delta !== 0 && (
                  <p className={`text-xs font-medium ${delta > 0 ? 'text-primary' : 'text-orange-400'}`}>
                    {delta > 0 ? '▲' : '▼'} {Math.abs(delta)} kg
                  </p>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Detail chart */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface w-full max-w-md rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
            >
              <div className="p-5 flex justify-between items-center border-b border-white/5">
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-xl truncate">{selected.name}</h3>
                  <p className="text-primary font-medium text-sm">個人紀錄 {selected.personalRecord} kg</p>
                </div>
                <button onClick={() => setSelected(null)} className="bg-background/50 p-2 rounded-full text-zinc-400 hover:text-white flex-shrink-0 ml-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              <div className="p-5">
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selected.points.map((p) => ({
                      date: new Date(p.date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }),
                      weight: p.weight,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="date" stroke="#ffffff50" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff50" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 2.5', 'dataMax + 2.5']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#f8fafc' }}
                        itemStyle={{ color: '#a3e635', fontWeight: 'bold' }}
                        formatter={(v: number) => [`${v} kg`, '重量']}
                      />
                      <Line type="monotone" dataKey="weight" stroke="#a3e635" strokeWidth={3} dot={{ r: 4, fill: '#a3e635', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#fff' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StrengthProgress;
