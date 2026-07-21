import React, { useState } from 'react';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileModalProps {
  onSave: (profile: UserProfile) => void;
  initialProfile?: UserProfile; // 編輯模式：帶入現有資料
  onClose?: () => void; // 編輯模式：允許不儲存直接關閉
}

const goalMap: Record<string, string> = {
  muscle: '增肌 (Muscle Gain)',
  weight_loss: '減脂 (Weight Loss)',
  endurance: '耐力 (Endurance)',
  flexibility: '柔軟度 (Flexibility)'
};

const equipmentMap: Record<string, string> = {
  'Dumbbells': '啞鈴',
  'Barbell': '槓鈴',
  'Bodyweight': '徒手訓練',
  'Kettlebell': '壺鈴',
  'Pull-up Bar': '單槓',
  'Gym Machines': '健身房機器',
  'Resistance Bands': '彈力帶'
};

const ProfileModal: React.FC<ProfileModalProps> = ({ onSave, initialProfile, onClose }) => {
  const [formData, setFormData] = useState<Partial<UserProfile>>(
    initialProfile ?? {
      goal: 'muscle',
      experience: 'beginner',
      equipment: [],
      gender: 'male',
    }
  );
  const [step, setStep] = useState(1);
  const isEditing = !!initialProfile;

  const handleNext = () => setStep(step + 1);

  const toggleEquipment = (item: string) => {
    const current = formData.equipment || [];
    if (current.includes(item)) {
      setFormData({ ...formData, equipment: current.filter(i => i !== item) });
    } else {
      setFormData({ ...formData, equipment: [...current, item] });
    }
  };

  const handleFinish = () => {
    if (formData.name && formData.weight && formData.height && formData.age && formData.equipment) {
      onSave(formData as UserProfile);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-surface/80 backdrop-blur-md w-full max-w-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 z-20 bg-background/50 p-2 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
        <div className="mb-8 text-center relative z-10">
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">{isEditing ? '編輯個人資料' : '建立你的檔案'}</h2>
          <div className="flex justify-center mt-4 space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-10 bg-primary shadow-[0_0_10px_rgba(163,230,53,0.5)]' : 'w-3 bg-zinc-800'}`} />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="relative z-10"
          >
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">暱稱</label>
                  <input
                    type="text"
                    className="w-full bg-zinc-900/50 text-white p-4 rounded-2xl mt-1.5 focus:border-primary border border-white/5 outline-none transition-all focus:ring-1 focus:ring-primary placeholder:text-zinc-600"
                    placeholder="你的名字"
                    value={formData.name || ''}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">體重 (kg)</label>
                    <input 
                      type="number" 
                      className="w-full bg-zinc-900/50 text-white p-4 rounded-2xl mt-1.5 border border-white/5 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-zinc-600 text-center font-mono text-lg"
                      placeholder="70"
                      value={formData.weight ?? ''}
                      onChange={e => setFormData({...formData, weight: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">身高 (cm)</label>
                    <input 
                      type="number" 
                      className="w-full bg-zinc-900/50 text-white p-4 rounded-2xl mt-1.5 border border-white/5 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-zinc-600 text-center font-mono text-lg"
                      placeholder="175"
                      value={formData.height ?? ''}
                      onChange={e => setFormData({...formData, height: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">年齡</label>
                    <input
                      type="number"
                      className="w-full bg-zinc-900/50 text-white p-4 rounded-2xl mt-1.5 border border-white/5 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-zinc-600 text-center font-mono text-lg"
                      placeholder="25"
                      value={formData.age ?? ''}
                      onChange={e => setFormData({...formData, age: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">生理性別</label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      {(['male', 'female'] as const).map(g => (
                        <button
                          key={g}
                          onClick={() => setFormData({...formData, gender: g})}
                          className={`p-4 rounded-2xl text-sm font-medium transition-all border ${
                            formData.gender === g
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800'
                          }`}
                        >
                          {g === 'male' ? '男' : '女'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleNext}
                  disabled={!formData.name || !formData.weight || !formData.height || !formData.age}
                  className="w-full bg-primary text-zinc-950 font-bold py-4 rounded-2xl mt-6 hover:bg-lime-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 active:scale-[0.98] text-lg"
                >
                  下一步
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block ml-1">主要目標</label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(goalMap).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setFormData({...formData, goal: key as UserProfile['goal']})}
                        className={`p-4 rounded-2xl text-sm font-medium transition-all border ${
                          formData.goal === key 
                          ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(163,230,53,0.15)]' 
                          : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block ml-1">經驗程度</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['beginner', 'intermediate', 'advanced'].map(level => (
                      <button
                        key={level}
                        onClick={() => setFormData({...formData, experience: level as UserProfile['experience']})}
                        className={`p-3 rounded-2xl text-sm font-medium transition-all border capitalize ${
                          formData.experience === level 
                          ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(163,230,53,0.15)]' 
                          : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                        }`}
                      >
                        {level === 'beginner' ? '初學' : level === 'intermediate' ? '中階' : '進階'}
                      </button>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={handleNext}
                  className="w-full bg-primary text-zinc-950 font-bold py-4 rounded-2xl mt-4 hover:bg-lime-400 transition-all shadow-lg shadow-primary/20 active:scale-[0.98] text-lg"
                >
                  下一步
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block ml-1">可用器材 (可複選)</label>
                  <div className="flex flex-wrap gap-2.5">
                    {Object.entries(equipmentMap).map(([key, label]) => {
                      const isSelected = formData.equipment?.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => toggleEquipment(key)}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                            isSelected 
                            ? 'bg-primary border-primary text-zinc-950 shadow-[0_0_10px_rgba(163,230,53,0.3)]' 
                            : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button 
                  onClick={handleFinish}
                  disabled={!formData.equipment || formData.equipment.length === 0}
                  className="w-full bg-white text-zinc-950 font-bold py-4 rounded-2xl mt-4 hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl active:scale-[0.98] text-lg flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  開始旅程
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ProfileModal;
