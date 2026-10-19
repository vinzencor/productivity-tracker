// The tulip unlocks only for this date (1 November 2003). Months are zero-based, like Date#getMonth.
export const SECRET_BIRTHDAY = { year: 2003, month: 10, day: 1 }

// The emoji only shows on happy screens; sad-path screens use the plain name.
export const PET_NAMES = [
  { name: 'my vaveee', emoji: '😘' },
  { name: 'my babyy', emoji: '💖' },
  { name: 'kuttapattani', emoji: '🥰' },
  { name: 'undakanni', emoji: '😍' },
  { name: 'goomole', emoji: '🌸' },
  { name: 'sree mole', emoji: '💕' },
  { name: 'sree vave', emoji: '😘' },
  { name: 'sreekutti', emoji: '🌷' },
  { name: 'kuttakalla', emoji: '😜' },
]

export const WRONG_BIRTHDAY_REPLIES = [
  'Hmm, that’s not my girl’s birthday 🤔 Try again!',
  'Nope! Only she knows the magic date 😜',
  'Are you really her? 👀 One more try…',
  'So close… or maybe not 🙈 Check the calendar again!',
]

export function timeGreeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 5) return { text: 'Good night', emoji: '🌙' }
  if (hour < 12) return { text: 'Good morning', emoji: '☀️' }
  if (hour < 17) return { text: 'Good afternoon', emoji: '🌤️' }
  if (hour < 21) return { text: 'Good evening', emoji: '✨' }
  return { text: 'Good night', emoji: '🌙' }
}

export type CheckInQuestion = {
  question: string
  answers: { label: string; reply: string }[]
}

export const CHECK_IN_QUESTIONS: CheckInQuestion[] = [
  {
    question: 'Did you eat something today? 🍛',
    answers: [
      { label: 'Yes, I did', reply: 'Good girl! Proud of you 😘' },
      { label: 'Not yet…', reply: 'Go eat something after this, okay? Promise me 🥺' },
    ],
  },
  {
    question: 'Did you drink enough water? 💧',
    answers: [
      { label: 'Yes!', reply: 'That’s my girl 💖 Stay hydrated, cutie.' },
      { label: 'Oops, no', reply: 'Go grab a glass right now 😤💧 I’m watching!' },
    ],
  },
  {
    question: 'Did you miss me today? 🥺',
    answers: [
      { label: 'Yes, a lot', reply: 'I missed you more. Always 💕' },
      { label: 'Hmm… maybe', reply: 'Maybe?! I’ll pretend that means yes 😜' },
    ],
  },
  {
    question: 'Is work being too much today? 💼',
    answers: [
      { label: 'A little', reply: 'You’re handling it like a queen 👑 I’m so proud of you.' },
      { label: 'Not really', reply: 'Yayy! Keep shining ✨' },
    ],
  },
  {
    question: 'Did someone make you smile today? 😊',
    answers: [
      { label: 'Yes!', reply: 'Now let me add one more to the list 😘' },
      { label: 'Not yet', reply: 'Challenge accepted. Let me fix that 😌' },
    ],
  },
  {
    question: 'Coffee or chai right now? ☕',
    answers: [
      { label: 'Coffee', reply: 'One coffee date, noted ☕💕' },
      { label: 'Chai', reply: 'Chai and you, my favourite combo 🫖💖' },
    ],
  },
  {
    question: 'Did you take a little break today? 🌿',
    answers: [
      { label: 'Yes', reply: 'Good! You deserve all the breaks 💆‍♀️' },
      { label: 'No time…', reply: 'Then this is your break now. Doctor’s orders 🩺💖' },
    ],
  },
]

export const MOOD_QUESTIONS = [
  'So tell me, how are you feeling right now?',
  'How are you, really? Tell me the truth 🥺',
  'How’s my girl doing today?',
  'How is your heart feeling right now?',
]

export const HAPPY_REPLIES = [
  'Yayy! That makes me sooo happy 💖 Let’s make it even better.',
  'That’s what I love to hear! 🥰 Now let’s have some fun.',
  'My favourite news of the day 😘 Come, let’s play!',
]

export const SWEET_NOTES = [
  'You’re doing amazing 💖',
  'I’m so proud of you 🥹',
  'Your smile is my favourite thing 😊',
  'Breathe. You’ve got this 🌿',
  'You’re my favourite person 💕',
  'This stress is temporary. My love isn’t 💞',
  'Hug incoming 🤗',
  'You make everything better ✨',
  'Sending you 1000 kisses 😘',
  'Drink some water, cutie 💧',
  'You’re stronger than you think 💪',
  'I love you more than chocolate 🍫',
  'One more pop, one less worry 🫧',
  'You’re the cutest HR ever 👩‍💼💖',
  'Your eyes, undakanni 😍',
  'Pinky promise: it gets better 🤙',
]

// Small helpers shared by the surprise flow and games.
export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
