// User Profile
export interface UserProfile {
  name: string;
  age: number;
  weight: number; // kg
  height: number; // cm
  gender?: 'male' | 'female'; // optional: older profiles don't have it
  goal: 'muscle' | 'weight_loss' | 'endurance' | 'flexibility';
  experience: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[]; // e.g., 'dumbbell', 'bodyweight', 'gym'
  weeklyPlan?: WeeklyPlan; // New: Store the current weekly plan
}

// Workout Data
export interface Exercise {
  name: string;
  sets: number;
  reps: string; // string to allow range "8-12"
  weight?: number;
  notes?: string;
  instruction?: string; // Detailed step-by-step tutorial
}

export interface WorkoutSession {
  id: string;
  date: string;
  exercises: Exercise[];
  durationMinutes: number;
  notes?: string;
}

// AI Plan Structure
export interface DayPlan {
  day: string; // "Monday", "Tuesday", etc.
  focus: string; // "Legs", "Push", "Rest"
  routine?: Exercise[]; // Can be empty if rest day
  isRest: boolean;
}

export interface WeeklyPlan {
  id: string;
  startDate: string;
  schedule: DayPlan[];
}

export interface WorkoutPlan {
  name: string;
  description: string;
  routine: Exercise[];
  advice?: string; // Professional caveats/suggestions
  diet?: string; // Dietary recommendations
}

// Chat
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isPlan?: boolean; // If true, the text is a JSON string of a plan
  timestamp: number;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  TRAINER = 'TRAINER',
  LOG = 'LOG',
  PROFILE = 'PROFILE',
  ACTIVE_WORKOUT = 'ACTIVE_WORKOUT', // New View
  PROGRESS = 'PROGRESS', // New View for tracking
}

export interface ProgressEntry {
  id: string;
  date: string;
  weight: number;
  photoBase64?: string;
  aiAnalysis?: string;
}
