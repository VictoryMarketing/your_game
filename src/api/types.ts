export type Profile = {
  user_id: string;
  name: string;
  age?: number;
  onboarding_done: number;
  first_free_chapters_used: number;
  subscription_status: string;
  subscription_expiry?: string;
  premium_until?: string;
  premium_image_limit?: number;
  premium_voice_limit?: number;
  premium_image_remaining?: number;
  premium_voice_remaining?: number;
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
  auto_generate_images?: number;
  auto_generate_voice?: number;
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
  created_at?: string;
  updated_at?: string;
  finished_at?: string;
  auto_generate_images?: boolean;
  auto_generate_voice?: boolean;
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
  key?: string;
  k: string;
  title: string;
  description?: string;
  target: number;
  progress?: number;
  reward?: string;
  cta?: string;
  status?: "active" | "completed" | "claimed";
  reward_type?: string;
  reward_amount?: number;
  persistent?: boolean;
};

export type Product = {
  code: string;
  title: string;
  description: string;
  stars: number;
  badge?: string;
};
