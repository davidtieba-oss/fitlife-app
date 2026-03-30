export type MuscleGroup =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Legs"
  | "Arms"
  | "Core"
  | "Cardio";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: string;
  isCompound: boolean;
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "Chest",
  "Back",
  "Shoulders",
  "Legs",
  "Arms",
  "Core",
  "Cardio",
];

export const exercises: Exercise[] = [
  // Chest
  { id: "bench-press", name: "Bench Press", muscleGroup: "Chest", equipment: "Barbell", isCompound: true },
  { id: "incline-bench", name: "Incline Bench Press", muscleGroup: "Chest", equipment: "Barbell", isCompound: true },
  { id: "db-bench", name: "Dumbbell Bench Press", muscleGroup: "Chest", equipment: "Dumbbell", isCompound: true },
  { id: "db-flyes", name: "Dumbbell Flyes", muscleGroup: "Chest", equipment: "Dumbbell", isCompound: false },
  { id: "cable-crossover", name: "Cable Crossover", muscleGroup: "Chest", equipment: "Cable", isCompound: false },
  { id: "push-ups", name: "Push-ups", muscleGroup: "Chest", isCompound: true },
  { id: "dips", name: "Dips", muscleGroup: "Chest", isCompound: true },

  // Back
  { id: "deadlift", name: "Deadlift", muscleGroup: "Back", equipment: "Barbell", isCompound: true },
  { id: "barbell-row", name: "Barbell Row", muscleGroup: "Back", equipment: "Barbell", isCompound: true },
  { id: "db-row", name: "Dumbbell Row", muscleGroup: "Back", equipment: "Dumbbell", isCompound: true },
  { id: "pull-ups", name: "Pull-ups", muscleGroup: "Back", isCompound: true },
  { id: "chin-ups", name: "Chin-ups", muscleGroup: "Back", isCompound: true },
  { id: "lat-pulldown", name: "Lat Pulldown", muscleGroup: "Back", equipment: "Cable", isCompound: true },
  { id: "seated-row", name: "Seated Cable Row", muscleGroup: "Back", equipment: "Cable", isCompound: true },
  { id: "face-pulls", name: "Face Pulls", muscleGroup: "Back", equipment: "Cable", isCompound: false },

  // Shoulders
  { id: "ohp", name: "Overhead Press", muscleGroup: "Shoulders", equipment: "Barbell", isCompound: true },
  { id: "db-shoulder-press", name: "Dumbbell Shoulder Press", muscleGroup: "Shoulders", equipment: "Dumbbell", isCompound: true },
  { id: "lateral-raise", name: "Lateral Raise", muscleGroup: "Shoulders", equipment: "Dumbbell", isCompound: false },
  { id: "front-raise", name: "Front Raise", muscleGroup: "Shoulders", equipment: "Dumbbell", isCompound: false },
  { id: "reverse-flyes", name: "Reverse Flyes", muscleGroup: "Shoulders", equipment: "Dumbbell", isCompound: false },
  { id: "arnold-press", name: "Arnold Press", muscleGroup: "Shoulders", equipment: "Dumbbell", isCompound: true },

  // Legs
  { id: "squat", name: "Barbell Squat", muscleGroup: "Legs", equipment: "Barbell", isCompound: true },
  { id: "front-squat", name: "Front Squat", muscleGroup: "Legs", equipment: "Barbell", isCompound: true },
  { id: "leg-press", name: "Leg Press", muscleGroup: "Legs", equipment: "Machine", isCompound: true },
  { id: "romanian-deadlift", name: "Romanian Deadlift", muscleGroup: "Legs", equipment: "Barbell", isCompound: true },
  { id: "lunges", name: "Lunges", muscleGroup: "Legs", isCompound: true },
  { id: "bulgarian-split", name: "Bulgarian Split Squat", muscleGroup: "Legs", equipment: "Dumbbell", isCompound: true },
  { id: "leg-curl", name: "Leg Curl", muscleGroup: "Legs", equipment: "Machine", isCompound: false },
  { id: "leg-extension", name: "Leg Extension", muscleGroup: "Legs", equipment: "Machine", isCompound: false },
  { id: "calf-raise", name: "Calf Raise", muscleGroup: "Legs", equipment: "Machine", isCompound: false },

  // Arms
  { id: "barbell-curl", name: "Barbell Curl", muscleGroup: "Arms", equipment: "Barbell", isCompound: false },
  { id: "db-curl", name: "Dumbbell Curl", muscleGroup: "Arms", equipment: "Dumbbell", isCompound: false },
  { id: "hammer-curl", name: "Hammer Curl", muscleGroup: "Arms", equipment: "Dumbbell", isCompound: false },
  { id: "tricep-pushdown", name: "Tricep Pushdown", muscleGroup: "Arms", equipment: "Cable", isCompound: false },
  { id: "skull-crushers", name: "Skull Crushers", muscleGroup: "Arms", equipment: "Barbell", isCompound: false },
  { id: "overhead-extension", name: "Overhead Tricep Extension", muscleGroup: "Arms", equipment: "Dumbbell", isCompound: false },

  // Core
  { id: "plank", name: "Plank", muscleGroup: "Core", isCompound: false },
  { id: "crunches", name: "Crunches", muscleGroup: "Core", isCompound: false },
  { id: "hanging-leg-raise", name: "Hanging Leg Raise", muscleGroup: "Core", isCompound: false },
  { id: "russian-twist", name: "Russian Twist", muscleGroup: "Core", isCompound: false },
  { id: "ab-wheel", name: "Ab Wheel Rollout", muscleGroup: "Core", isCompound: false },

  // Cardio
  { id: "burpees", name: "Burpees", muscleGroup: "Cardio", isCompound: true },
  { id: "jumping-jacks", name: "Jumping Jacks", muscleGroup: "Cardio", isCompound: false },
  { id: "mountain-climbers", name: "Mountain Climbers", muscleGroup: "Cardio", isCompound: true },
  { id: "treadmill", name: "Treadmill", muscleGroup: "Cardio", equipment: "Machine", isCompound: false },
  { id: "cycling", name: "Stationary Bike", muscleGroup: "Cardio", equipment: "Machine", isCompound: false },
];
