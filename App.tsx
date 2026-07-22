import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import AITrainer from './components/AITrainer';
import WorkoutLog from './components/WorkoutLog';
import ProfileModal from './components/ProfileModal';
import ActiveWorkout from './components/ActiveWorkout';
import ProgressTracker from './components/ProgressTracker';
import { AppView, UserProfile, WorkoutSession, Exercise, ProgressEntry } from './types';
import { AnimatePresence, motion } from 'motion/react';
import { auth, db, signInWithGoogle, logout, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, deleteDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useToast } from './components/Toast';

const App: React.FC = () => {
  const { showToast, confirm } = useToast();
  const [currentView, setCurrentView] = useState<AppView>(() => {
    return (localStorage.getItem('fitflow_current_view') as AppView) || AppView.DASHBOARD;
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSession[]>([]);
  const [progressHistory, setProgressHistory] = useState<ProgressEntry[]>([]);
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Profile editing modal
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // State for Active Workout
  const [activeRoutine, setActiveRoutine] = useState<Exercise[] | null>(() => {
    const saved = localStorage.getItem('fitflow_active_routine');
    return saved ? JSON.parse(saved) : null;
  });
  const [activePlanName, setActivePlanName] = useState<string>(() => {
    return localStorage.getItem('fitflow_active_plan_name') || "";
  });

  // Persist State
  useEffect(() => {
    localStorage.setItem('fitflow_current_view', currentView);
  }, [currentView]);

  useEffect(() => {
    if (activeRoutine) {
      localStorage.setItem('fitflow_active_routine', JSON.stringify(activeRoutine));
    } else {
      localStorage.removeItem('fitflow_active_routine');
    }
  }, [activeRoutine]);

  useEffect(() => {
    localStorage.setItem('fitflow_active_plan_name', activePlanName);
  }, [activePlanName]);

  // Handle Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Load data from Firestore when user is authenticated
  useEffect(() => {
    if (!isAuthReady || !user) {
      setUserProfile(null);
      setWorkoutHistory([]);
      setProgressHistory([]);
      return;
    }

    const userId = user.uid;

    // Listen to User Profile
    const profileUnsubscribe = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      } else {
        setUserProfile(null);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${userId}`));

    // Listen to Workout History
    const workoutsQuery = query(collection(db, 'users', userId, 'workouts'), orderBy('date', 'desc'));
    const workoutsUnsubscribe = onSnapshot(workoutsQuery, (snapshot) => {
      const workouts = snapshot.docs.map(doc => doc.data() as WorkoutSession);
      setWorkoutHistory(workouts);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/workouts`));

    // Listen to Progress History
    const progressQuery = query(collection(db, 'users', userId, 'progress'), orderBy('date', 'desc'));
    const progressUnsubscribe = onSnapshot(progressQuery, (snapshot) => {
      const progress = snapshot.docs.map(doc => doc.data() as ProgressEntry);
      setProgressHistory(progress);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/progress`));

    return () => {
      profileUnsubscribe();
      workoutsUnsubscribe();
      progressUnsubscribe();
    };
  }, [user, isAuthReady]);

  // Save profile to Firestore
  const handleSaveProfile = async (profile: UserProfile) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), profile);
      // Local state is updated via onSnapshot
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  // Save workout to Firestore
  // fromActiveWorkout: 只有從「訓練模式」完成時才需要跳轉回首頁；
  // 從「紀錄」頁或 AI 聊天記錄運動時，留在原頁面即可
  const handleSaveWorkout = async (session: WorkoutSession, options?: { fromActiveWorkout?: boolean }) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'workouts', session.id), session);
      if (options?.fromActiveWorkout) {
        setActiveRoutine(null);
        setCurrentView(AppView.DASHBOARD);
      }
      showToast("🎉 訓練已成功記錄！", 'success');
    } catch (error) {
      showToast("儲存失敗，請檢查網路連線。", 'error');
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/workouts/${session.id}`);
    }
  };

  // Delete a logged workout
  const handleDeleteWorkout = async (id: string) => {
    if (!user) return;
    const ok = await confirm("確定要刪除這筆訓練紀錄嗎？此動作無法復原。");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'workouts', id));
      showToast("已刪除訓練紀錄", 'info');
    } catch (error) {
      showToast("刪除失敗，請稍後再試。", 'error');
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/workouts/${id}`);
    }
  };

  // Delete a progress entry
  const handleDeleteProgress = async (id: string) => {
    if (!user) return;
    const ok = await confirm("確定要刪除這筆體態紀錄嗎？此動作無法復原。");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'progress', id));
      showToast("已刪除體態紀錄", 'info');
    } catch (error) {
      showToast("刪除失敗，請稍後再試。", 'error');
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/progress/${id}`);
    }
  };

  // Save progress entry to Firestore
  const handleSaveProgress = async (entry: ProgressEntry) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'progress', entry.id), entry);
      
      // Update user profile weight if it changed
      if (userProfile && entry.weight !== userProfile.weight) {
        const updatedProfile = { ...userProfile, weight: entry.weight };
        await handleSaveProfile(updatedProfile);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/progress/${entry.id}`);
    }
  };

  const startActiveWorkout = (routine: Exercise[], name: string) => {
    setActiveRoutine(routine);
    setActivePlanName(name);
    setCurrentView(AppView.ACTIVE_WORKOUT);
  };

  const handleReset = async () => {
      if(await confirm("確定要登出嗎？")) {
        await logout();
        // 清除本機暫存，避免下一位登入者看到上一位的聊天與訓練狀態
        localStorage.removeItem('fitflow_chat_messages');
        localStorage.removeItem('fitflow_active_routine');
        localStorage.removeItem('fitflow_active_plan_name');
        setActiveRoutine(null);
        setActivePlanName("");
        setCurrentView(AppView.DASHBOARD);
      }
  };

  const goalMap: Record<string, string> = {
      muscle: '增肌',
      weight_loss: '減脂',
      endurance: '耐力',
      flexibility: '柔軟度'
  };

  const experienceMap: Record<string, string> = {
      beginner: '初學者',
      intermediate: '中階',
      advanced: '進階'
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-white">
        <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-primary/20">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
        </div>
        <h1 className="text-4xl font-display font-bold mb-2">FitFlow</h1>
        <p className="text-zinc-400 mb-12 text-center max-w-xs">你的專屬 AI 健身教練，隨時隨地為你量身打造訓練計畫。</p>
        
        <button 
          onClick={signInWithGoogle}
          className="w-full max-w-sm bg-white text-zinc-900 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-zinc-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
          使用 Google 帳號登入
        </button>
      </div>
    );
  }

  if (!userProfile) {
    return <ProfileModal onSave={handleSaveProfile} />;
  }

  // Render Full Screen Active Workout if active
  if (currentView === AppView.ACTIVE_WORKOUT && activeRoutine) {
      return (
          <ActiveWorkout
            routine={activeRoutine}
            planName={activePlanName}
            onFinish={(session) => handleSaveWorkout(session, { fromActiveWorkout: true })}
            onCancel={() => setCurrentView(AppView.DASHBOARD)}
          />
      );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-zinc-50 selection:bg-primary selection:text-zinc-950">
      <main className="max-w-md mx-auto min-h-screen relative bg-background shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 pt-6 flex-1 overflow-y-auto no-scrollbar relative">
          <AnimatePresence mode="wait">
            {currentView === AppView.DASHBOARD && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Dashboard 
                    profile={userProfile} 
                    history={workoutHistory} 
                    onStartWorkout={startActiveWorkout}
                    onUpdateProfile={handleSaveProfile}
                />
              </motion.div>
            )}
            
            {currentView === AppView.TRAINER && (
              <motion.div
                key="trainer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <AITrainer 
                  profile={userProfile} 
                  workoutHistory={workoutHistory}
                  progressHistory={progressHistory}
                  onUpdateProfile={handleSaveProfile} 
                  onStartWorkout={startActiveWorkout}
                  onLogWorkout={handleSaveWorkout}
                />
              </motion.div>
            )}
            
            {currentView === AppView.LOG && (
              <motion.div
                key="log"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <WorkoutLog onSave={handleSaveWorkout} history={workoutHistory} onDelete={handleDeleteWorkout} />
              </motion.div>
            )}

            {currentView === AppView.PROGRESS && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ProgressTracker
                  profile={userProfile}
                  history={progressHistory}
                  onSaveEntry={handleSaveProgress}
                  onDelete={handleDeleteProgress}
                />
              </motion.div>
            )}

            {currentView === AppView.PROFILE && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                 <div className="space-y-6 pb-24">
                    <h2 className="text-2xl font-display font-bold tracking-tight">個人設定</h2>
                    <div className="bg-surface p-5 rounded-3xl border border-white/5 shadow-xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center text-2xl font-display font-bold text-zinc-900 uppercase shadow-lg shadow-primary/20">
                                {userProfile.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-display font-bold text-xl">{userProfile.name}</p>
                                <p className="text-zinc-400 text-sm">{experienceMap[userProfile.experience] || userProfile.experience}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-background/50 p-4 rounded-2xl text-center border border-white/5">
                                <p className="text-xs text-zinc-400 mb-1">BMI</p>
                                <p className="text-2xl font-display font-bold text-primary">
                                    {(userProfile.weight / Math.pow(userProfile.height / 100, 2)).toFixed(1)}
                                </p>
                            </div>
                            <div className="bg-background/50 p-4 rounded-2xl text-center border border-white/5">
                                <p className="text-xs text-zinc-400 mb-1">基礎代謝 (BMR)</p>
                                <p className="text-2xl font-display font-bold text-primary">
                                    {/* Mifflin-St Jeor: male +5 / female -161; older profiles without gender fall back to male */}
                                    {Math.round(10 * userProfile.weight + 6.25 * userProfile.height - 5 * userProfile.age + (userProfile.gender === 'female' ? -161 : 5))} <span className="text-sm text-zinc-500 font-sans">kcal</span>
                                </p>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm text-zinc-300 bg-background/30 p-4 rounded-2xl border border-white/5">
                            <p className="flex justify-between"><span>目標</span> <span className="text-primary font-medium">{goalMap[userProfile.goal] || userProfile.goal}</span></p>
                            <p className="flex justify-between"><span>身高</span> <span className="text-white font-medium">{userProfile.height} cm</span></p>
                            <p className="flex justify-between"><span>體重</span> <span className="text-white font-medium">{userProfile.weight} kg</span></p>
                            <p className="flex justify-between"><span>年齡</span> <span className="text-white font-medium">{userProfile.age} 歲</span></p>
                            {userProfile.gender && (
                              <p className="flex justify-between"><span>生理性別</span> <span className="text-white font-medium">{userProfile.gender === 'male' ? '男' : '女'}</span></p>
                            )}
                            <div className="pt-2 mt-2 border-t border-white/5">
                                <p className="mb-1 text-zinc-400">可用器材</p>
                                <p className="text-white font-medium">{userProfile.equipment.join(', ')}</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsEditingProfile(true)}
                        className="w-full bg-primary/10 border border-primary/30 text-primary py-4 rounded-2xl hover:bg-primary/20 transition-colors font-medium"
                    >
                        編輯個人資料
                    </button>

                    <button
                        onClick={handleReset}
                        className="w-full border border-red-500/30 text-red-400 py-4 rounded-2xl hover:bg-red-500/10 transition-colors font-medium"
                    >
                        登出 (Logout)
                    </button>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Navigation currentView={currentView} setView={setCurrentView} />

        {isEditingProfile && (
          <ProfileModal
            initialProfile={userProfile}
            onSave={(p) => { handleSaveProfile(p); setIsEditingProfile(false); showToast("個人資料已更新", 'success'); }}
            onClose={() => setIsEditingProfile(false)}
          />
        )}
      </main>
    </div>
  );
};

export default App;
