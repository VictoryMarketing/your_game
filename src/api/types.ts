export type Profile = {
  user_id: string;
  name: string;
  age?: number;
  onboarding_done: number;
  first_free_chapters_used: number;
  subscription_status: string;
  subscription_expiry?: string;
  voice_credits: number;
  image_credits: number;
  branch_tokens: number;
  bonus_chapters: number;
  total_xp: number;
  level: number;
  daily_streak: number;
  referrals_count: number;
  viral_score: number;
  favorite_genre?: string;
  story_style?: string;
  interface_language?: string;
  safety_mode?: string;
};

export type Choice = {
  id: string;
  label: string;
  text: string;
};

export type Chapter = {
  id: string;
  chapter_number: number;
  scene_text: string;
  choices: Choice[];
  score_delta: number;
  image_url?: string;
  voice_url?: string;
};

export type GameSession = {
  id: string;
  status: string;
  mode: string;
  title: string;
  genre?: string;
  chapter: number;
  max_chapters: number;
  score: number;
  state: {
    traits: Record<string, number>;
    world: Record<string, number>;
    inventory: string[];
    clues: string[];
    combo: number;
    momentum: number;
  };
  current_chapter?: Chapter;
};

export type HomePayload = {
  profile: Profile;
  current_game?: GameSession | null;
  limits: {
    first_free_remaining: number;
    daily_remaining: number;
    daily_free_chapters: number;
    bonus_chapters: number;
    is_premium: boolean;
  };
  missions: Mission[];
  referral?: {
    link: string;
    share_url: string;
    invited_started: number;
    pending: number;
    reward_per_friend: number;
    progress_target: number;
    progress_current: number;
  };
};

export type Mission = {
  k: string;
  title: string;
  description?: string;
  target: number;
  progress?: number;
  reward?: string;
  cta?: string;
};

export type Product = {
  code: string;
  title: string;
  description: string;
  stars: number;
  badge?: string;
};
