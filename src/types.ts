export type ElementType = 'Fire' | 'Water' | 'Grass' | 'Electric' | 'Psychic' | 'Dark' | 'Dragon' | 'Steel' | 'Normal' | 'Ground' | 'Ice' | 'Bug' | 'Ghost' | 'Fairy' | 'Fighting' | 'Poison' | 'Rock' | 'Flying';

export interface CreatureStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export interface CreatureForm {
  name: string;
  stage: 0 | 1 | 2; // 0: Base, 1: Stage 1, 2: Stage 2
  stats: CreatureStats;
  type: ElementType;
  secondaryType?: ElementType;
}

export interface CreatureSpecies {
  id: string;
  baseForm: CreatureForm;
  stage1Form?: CreatureForm;
  stage2Form?: CreatureForm;
  tier: 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
  captureCost: number;
  baseRent: number;
  groupId: string; // To match color groups on the board
}

export interface ActiveCreature {
  id: string; // Unique instance ID
  speciesId: string;
  currentHp: number;
  level: number;
  exp: number;
  currentStage: 0 | 1 | 2;
  // Computed stats based on level + stage bonus
  stats: CreatureStats; 
}

export type SpaceType = 'Start' | 'Creature' | 'Gym' | 'Event' | 'Tax' | 'Corner' | 'Wild';

export interface BoardSpace {
  index: number;
  name: string;
  type: SpaceType;
  // For creatures
  speciesId?: string;
  groupId?: string; // color group
  // For gyms
  gymTier?: number;
  gymElement?: ElementType;
  // For events/taxes
  eventDeck?: 'Scout' | 'Journal';
  taxAmount?: number;
}
