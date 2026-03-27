import { GoogleGenAI, Type, Schema, FunctionDeclaration } from "@google/genai";
import { UserProfile, ChatMessage, WorkoutPlan, WeeklyPlan } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_CHAT = "gemini-3-flash-preview";
const MODEL_PLAN = "gemini-3-flash-preview";

// System instruction for the chat persona
const TRAINER_SYSTEM_INSTRUCTION = `
你是一位名為 FitFlow 的頂尖健身 AI 助理。
你的目標是幫助使用者達成健身目標。
請注意：
1. **必須全程使用繁體中文 (Traditional Chinese, Taiwan)** 回答。
2. 回答要簡潔有力，適合手機閱讀（多用列點、短段落）。
3. 語氣要像一位專業、充滿鼓勵性的健身教練 (Personal Trainer)。
4. 根據使用者的身體數據和器材提供科學的建議。
5. 當使用者明確要求「菜單」、「課表」、「安排訓練」時，請務必呼叫 createWorkoutRoutine 函數來產生結構化的菜單，不要只用純文字回覆。
`;

/**
 * Generates a specific workout plan based on user profile and request.
 */
export const generateWorkoutPlan = async (
  profile: UserProfile, 
  focus: string
): Promise<WorkoutPlan | null> => {
  
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "訓練菜單的創意名稱 (例如：強力胸肌轟炸)" },
      description: { type: Type.STRING, description: "簡短描述訓練重點" },
      routine: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "動作名稱 (中文)" },
            sets: { type: Type.INTEGER },
            reps: { type: Type.STRING, description: "例如：'8-12下' 或 '30秒'" },
            notes: { type: Type.STRING, description: "動作提示或節奏 (中文)" },
            instruction: { type: Type.STRING, description: "詳細的動作教學步驟與發力技巧，適合初學者閱讀 (中文)" }
          },
          required: ["name", "sets", "reps", "instruction"]
        }
      }
    },
    required: ["name", "description", "routine"]
  };

  const prompt = `
    請為使用者建立一份健身菜單，使用者數據如下：
    - 目標: ${profile.goal}
    - 程度: ${profile.experience}
    - 可用器材: ${profile.equipment.join(', ')}
    
    使用者本次想訓練的重點是: "${focus}"。
    
    請確保：
    1. 動作必須配合使用者擁有的器材。
    2. 內容全部使用繁體中文。
    3. 針對初學者給予較簡單的動作，進階者則給予高強度動作。
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_PLAN,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "你是一位專業的健身課表設計師，請輸出繁體中文的 JSON 格式。"
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as WorkoutPlan;
  } catch (error) {
    console.error("Error generating plan:", error);
    return null;
  }
};

/**
 * Generates a full weekly plan
 */
export const generateWeeklyPlan = async (profile: UserProfile): Promise<WeeklyPlan | null> => {
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      startDate: { type: Type.STRING },
      schedule: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            day: { type: Type.STRING, enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
            focus: { type: Type.STRING, description: "Focus area e.g. 'Push', 'Legs', 'Rest'" },
            isRest: { type: Type.BOOLEAN },
            routine: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  sets: { type: Type.INTEGER },
                  reps: { type: Type.STRING },
                  notes: { type: Type.STRING },
                  instruction: { type: Type.STRING, description: "詳細的動作教學步驟與發力技巧，適合初學者閱讀 (中文)" }
                },
                required: ["name", "sets", "reps", "instruction"]
              }
            }
          },
          required: ["day", "focus", "isRest"]
        }
      }
    },
    required: ["schedule"]
  };

  const prompt = `
    設計一個為期一週的完整訓練計畫 (Weekly Split)。
    使用者數據:
    - 目標: ${profile.goal}
    - 程度: ${profile.experience}
    - 器材: ${profile.equipment.join(', ')}

    要求：
    1. 必須包含 Monday 到 Sunday 共7天。
    2. 根據程度安排適當的休息日 (isRest: true)。
    3. 動作名稱請用繁體中文。
    4. 確保肌肉群有足夠恢復時間。
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_PLAN,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "你是一位專業的週期化訓練教練。"
      }
    });

    const text = response.text;
    if (!text) return null;
    const data = JSON.parse(text);
    return { ...data, id: Date.now().toString(), startDate: new Date().toISOString() } as WeeklyPlan;
  } catch (error) {
    console.error("Error generating weekly plan:", error);
    return null;
  }
}

/**
 * General chat with the fitness assistant.
 */
export const sendChatMessage = async (
  history: ChatMessage[],
  newMessage: string,
  profile: UserProfile
): Promise<{ text: string; plan?: WorkoutPlan }> => {
  // Convert app history to Gemini history format
  const historyContext = history.slice(-10).map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  const contextPrompt = `
    [背景資訊: 身高 ${profile.height}cm, 體重 ${profile.weight}kg, 年齡 ${profile.age}, 目標: ${profile.goal}, 器材: ${profile.equipment.join(', ')}]
    使用者問題: ${newMessage}
  `;

  const createWorkoutRoutineFunction: FunctionDeclaration = {
    name: "createWorkoutRoutine",
    description: "當使用者要求建立、規劃或想要一份健身菜單/課表時，呼叫此函數來生成結構化的菜單。",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "訓練菜單的創意名稱 (例如：強力胸肌轟炸)" },
        description: { type: Type.STRING, description: "簡短描述訓練重點" },
        routine: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "動作名稱 (中文)" },
              sets: { type: Type.INTEGER },
              reps: { type: Type.STRING, description: "例如：'8-12下' 或 '30秒'" },
              notes: { type: Type.STRING, description: "動作提示或節奏 (中文)" },
              instruction: { type: Type.STRING, description: "詳細的動作教學步驟與發力技巧，適合初學者閱讀 (中文)" }
            },
            required: ["name", "sets", "reps", "instruction"]
          }
        }
      },
      required: ["name", "description", "routine"]
    }
  };

  try {
    const chat = ai.chats.create({
      model: MODEL_CHAT,
      config: {
        systemInstruction: TRAINER_SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [createWorkoutRoutineFunction] }],
      },
      history: historyContext
    });

    const result = await chat.sendMessage({ message: contextPrompt });
    
    if (result.functionCalls && result.functionCalls.length > 0) {
      const call = result.functionCalls[0];
      if (call.name === "createWorkoutRoutine") {
        const plan = call.args as unknown as WorkoutPlan;
        return { text: result.text || "這是我為你專屬設計的菜單，看看適不適合！", plan };
      }
    }

    return { text: result.text || "連線不穩，就像力竭一樣，請再試一次？" };
  } catch (error) {
    console.error("Chat error:", error);
    return { text: "系統發生錯誤，請檢查網路連線。" };
  }
};

/**
 * Analyzes a user's physique photo and provides feedback.
 */
export const analyzePhysique = async (
  photoBase64: string,
  profile: UserProfile,
  currentWeight: number
): Promise<string> => {
  try {
    const prompt = `你是一個專業的健身教練與體態分析專家。
    這是我目前的體態照片。
    我的基本資料：
    - 目標：${profile.goal}
    - 經驗：${profile.experience}
    - 目前體重：${currentWeight} kg
    - 身高：${profile.height} cm
    - 年齡：${profile.age} 歲

    請根據照片與我的資料，給我一段專業、客觀且充滿鼓勵的體態分析。
    包含：
    1. 體態現況評估 (肌肉量、體脂分佈的粗略觀察，請加上免責聲明表示這只是視覺估算)
    2. 針對我的目標 (${profile.goal})，我接下來的訓練與飲食建議
    3. 給我一些激勵的話！
    請用繁體中文回答，排版要清楚易讀 (可使用 Markdown)。`;

    // Extract base64 and mime type
    const base64Data = photoBase64.split(',')[1];
    const mimeType = photoBase64.split(';')[0].split(':')[1];

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType } }
        ]
      }
    });

    return response.text || "無法分析照片，請稍後再試。";
  } catch (error) {
    console.error("Error analyzing physique:", error);
    throw error;
  }
};
