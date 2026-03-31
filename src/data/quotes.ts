export const MOTIVATIONAL_QUOTES = [
  "The only bad workout is the one that didn't happen.",
  "Take care of your body. It's the only place you have to live.",
  "Strength does not come from the body. It comes from the will.",
  "The difference between try and triumph is a little umph.",
  "Your body can stand almost anything. It's your mind you have to convince.",
  "Fitness is not about being better than someone else. It's about being better than you used to be.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "Don't limit your challenges. Challenge your limits.",
  "Success is what comes after you stop making excuses.",
  "Motivation is what gets you started. Habit is what keeps you going.",
  "The hardest lift of all is lifting your butt off the couch.",
  "You don't have to be extreme, just consistent.",
  "It never gets easier. You just get stronger.",
  "The best project you'll ever work on is you.",
  "Sweat is just fat crying.",
  "Wake up with determination. Go to bed with satisfaction.",
  "A one-hour workout is 4% of your day. No excuses.",
  "The body achieves what the mind believes.",
  "Strive for progress, not perfection.",
  "Every champion was once a contender that didn't give up.",
  "Small daily improvements are the key to staggering long-term results.",
  "You are one workout away from a good mood.",
  "Results happen over time, not overnight. Stay patient and stay focused.",
  "The only way to finish is to start.",
  "Push harder than yesterday if you want a different tomorrow.",
  "What seems impossible today will one day become your warm-up.",
  "Discipline is choosing between what you want now and what you want most.",
  "Your health is an investment, not an expense.",
  "Fall in love with the process and the results will come.",
  "The secret of getting ahead is getting started.",
];

export function getDailyQuote(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
}
