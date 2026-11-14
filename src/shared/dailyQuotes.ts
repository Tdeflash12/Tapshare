export interface StudentQuote {
  text: string;
  author: string;
  theme: string;
}

export const STUDENT_QUOTES: readonly StudentQuote[] = [
  {
    text: 'Success is the sum of small efforts, repeated day in and day out.',
    author: 'Robert Collier',
    theme: 'Consistency',
  },
  {
    text: 'The secret to getting ahead is getting started.',
    author: 'Mark Twain',
    theme: 'Momentum',
  },
  {
    text: 'Education is the passport to the future, for tomorrow belongs to those who prepare for it today.',
    author: 'Malcolm X',
    theme: 'Preparation',
  },
  {
    text: 'Do not let what you cannot do interfere with what you can do.',
    author: 'John Wooden',
    theme: 'Focus',
  },
  {
    text: 'It always seems impossible until it is done.',
    author: 'Nelson Mandela',
    theme: 'Perseverance',
  },
  {
    text: 'Genius is 1% inspiration and 99% perspiration.',
    author: 'Thomas Edison',
    theme: 'Hard Work',
  },
  {
    text: 'The beautiful thing about learning is that nobody can take it away from you.',
    author: 'B.B. King',
    theme: 'Learning',
  },
  {
    text: 'Start where you are. Use what you have. Do what you can.',
    author: 'Arthur Ashe',
    theme: 'Action',
  },
  {
    text: 'Nothing in life is to be feared, it is only to be understood. Now is the time to understand more.',
    author: 'Marie Curie',
    theme: 'Curiosity',
  },
  {
    text: 'You do not have to be great to start, but you have to start to be great.',
    author: 'Zig Ziglar',
    theme: 'Beginnings',
  },
  {
    text: 'A little progress each day adds up to big results.',
    author: 'Satya Nani',
    theme: 'Daily Growth',
  },
  {
    text: 'Discipline is choosing between what you want now and what you want most.',
    author: 'Abraham Lincoln',
    theme: 'Discipline',
  },
  {
    text: 'Live as if you were to die tomorrow. Learn as if you were to live forever.',
    author: 'Mahatma Gandhi',
    theme: 'Lifelong Learning',
  },
  {
    text: 'Believe you can and you are halfway there.',
    author: 'Theodore Roosevelt',
    theme: 'Confidence',
  },
  {
    text: 'Failure is simply the opportunity to begin again, this time more intelligently.',
    author: 'Henry Ford',
    theme: 'Resilience',
  },
  {
    text: 'Quality is not an act, it is a habit.',
    author: 'Aristotle',
    theme: 'Habits',
  },
  {
    text: 'An investment in knowledge pays the best interest.',
    author: 'Benjamin Franklin',
    theme: 'Knowledge',
  },
  {
    text: 'Experts were once beginners who refused to quit when the problem felt hard.',
    author: 'Carol Dweck',
    theme: 'Growth Mindset',
  },
  {
    text: 'Your future is created by what you do today, not tomorrow.',
    author: 'Robert Kiyosaki',
    theme: 'Today',
  },
  {
    text: 'Strive for progress, not perfection.',
    author: 'Dave Perlmutter',
    theme: 'Progress',
  },
  {
    text: 'The mind is not a vessel to be filled, but a fire to be kindled.',
    author: 'Plutarch',
    theme: 'Discovery',
  },
];

export function getDayOfYearIndex(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.floor(diff / oneDay));
}

export function getDailyStudentQuoteIndex(date: Date = new Date()): number {
  return getDayOfYearIndex(date) % STUDENT_QUOTES.length;
}

export function getDailyStudentQuote(date: Date = new Date()): StudentQuote {
  return STUDENT_QUOTES[getDailyStudentQuoteIndex(date)];
}

export function getNextQuoteIndex(currentIndex: number): number {
  if (!Number.isFinite(currentIndex) || currentIndex < 0) return 0;
  return (Math.floor(currentIndex) + 1) % STUDENT_QUOTES.length;
}

export function formatShortQuoteDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
