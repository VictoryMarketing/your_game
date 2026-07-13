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
  email?: string;
  email_verified?: boolean;
  voice_name?: string;
  voice_speed?: number;
  voice_tone?: string;
  first_free_remaining?: number;
  daily_chapters_remaining?: number;
  playable_chapters_remaining?: number | null;
  unlimited_chapters?: boolean;
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
  traits_delta?: Record<string, number>;
  world_delta?: Record<string, number>;
  image_url?: string;
  voice_url?: string;
  voice_version?: number;
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
    npc_relations?: Record<string, {
      name: string;
      role?: string;
      trust?: number;
      fear?: number;
      respect?: number;
      debt?: number;
      known_facts?: string[];
      unresolved_conflict?: string;
    }>;
    combo: number;
    momentum: number;
    last_roll?: {
      roll?: number;
      total?: number;
      dc?: number;
      comment?: string;
      used_items?: string[];
      used_clues?: string[];
    };
    final_summary?: {
      title: string;
      rarity_label: string;
      hero_fate: string;
      world_fate: string;
      npc_fates: Array<{ name: string; fate: string }>;
      key_decisions: string[];
      secrets_found: string[];
      missed_mysteries: number;
      playstyle_archetype: string;
      dominant_trait: string;
    };
  };
  current_chapter?: Chapter;
  created_at?: string;
  updated_at?: string;
  finished_at?: string;
  auto_generate_images?: boolean;
  auto_generate_voice?: boolean;
};

export type UserItem = {
  key: string;
  emoji: string;
  title: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";
  rarity_label: string;
  icon_index: number;
  image_path?: string;
  description: string;
  helps: string;
  count?: number;
  protected?: boolean;
  protected_count?: number;
  available_count?: number;
  evolution_level?: number;
  evolution_label?: string;
  acquired_at?: string;
};

export type InventoryPayload = {
  items: UserItem[];
  catalog: UserItem[];
  collections?: Array<{
    rarity: UserItem["rarity"];
    rarity_label: string;
    owned: number;
    total: number;
    complete: boolean;
    reward_hint: string;
  }>;
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
  weekly_challenge?: {
    seed: string;
    start_param: string;
    deep_link: string;
    title: string;
    description: string;
    settings: Record<string, unknown>;
  };
  notifications?: Array<{
    id: number;
    kind: string;
    title: string;
    body: string;
    action?: string;
    created_at: string;
  }>;
};

export type FeatureFlags = Record<
  | "story_engine_v3"
  | "new_game_ui_v3"
  | "artifact_evolution"
  | "weekly_challenge"
  | "share_cards"
  | "web_auth"
  | "en_locale"
  | "async_media_jobs",
  boolean
> & Record<string, boolean>;

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
  weekly?: boolean;
};

export type Product = {
  code: string;
  title: string;
  description: string;
  stars: number;
  rub?: number;
  badge?: string;
  meta_label?: string;
  category?: "premium" | "images" | "voice" | "branches" | "artifacts";
  premium_days?: number;
  period_months?: number;
  recurring_eligible?: boolean;
};
