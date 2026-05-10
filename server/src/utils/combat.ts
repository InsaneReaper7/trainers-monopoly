import type { ElementType, CreatureStats } from '../types';

export const getTypeMultiplier = (attacker: ElementType, defender: ElementType): number => {
  const chart: Record<ElementType, Partial<Record<ElementType, number>>> = {
    Fire: { Grass: 1.2, Ice: 1.2, Steel: 1.2, Water: 0.8, Rock: 0.8, Ground: 0.8 },
    Water: { Fire: 1.2, Ground: 1.2, Rock: 1.2, Grass: 0.8, Electric: 0.8 },
    Grass: { Water: 1.2, Ground: 1.2, Rock: 1.2, Fire: 0.8, Ice: 0.8, Flying: 0.8 },
    Electric: { Water: 1.2, Flying: 1.2, Ground: 0.8, Grass: 0.8 },
    Psychic: { Fighting: 1.2, Poison: 1.2, Dark: 0.8, Bug: 0.8, Ghost: 0.8 },
    Dark: { Psychic: 1.2, Ghost: 1.2, Fighting: 0.8, Fairy: 0.8 },
    Dragon: { Dragon: 1.2, Ice: 0.8, Fairy: 0.8 },
    Steel: { Ice: 1.2, Rock: 1.2, Fairy: 1.2, Fire: 0.8, Fighting: 0.8, Ground: 0.8 },
    Normal: { Fighting: 0.8 },
    Ground: { Fire: 1.2, Electric: 1.2, Poison: 1.2, Rock: 1.2, Steel: 1.2, Water: 0.8, Grass: 0.8, Ice: 0.8 },
    Ice: { Grass: 1.2, Ground: 1.2, Flying: 1.2, Dragon: 1.2, Fire: 0.8, Water: 0.8, Steel: 0.8, Fighting: 0.8 },
    Bug: { Grass: 1.2, Psychic: 1.2, Dark: 1.2, Fire: 0.8, Fighting: 0.8, Poison: 0.8, Flying: 0.8, Ghost: 0.8, Steel: 0.8, Fairy: 0.8 },
    Ghost: { Psychic: 1.2, Ghost: 1.2, Dark: 0.8 },
    Fairy: { Fighting: 1.2, Dragon: 1.2, Dark: 1.2, Poison: 0.8, Steel: 0.8, Fire: 0.8 },
    Fighting: { Normal: 1.2, Ice: 1.2, Rock: 1.2, Dark: 1.2, Steel: 1.2, Poison: 0.8, Flying: 0.8, Psychic: 0.8, Bug: 0.8, Fairy: 0.8 },
    Poison: { Grass: 1.2, Fairy: 1.2, Poison: 0.8, Ground: 0.8, Rock: 0.8, Ghost: 0.8, Steel: 0.8 },
    Rock: { Fire: 1.2, Ice: 1.2, Flying: 1.2, Bug: 1.2, Fighting: 0.8, Ground: 0.8, Steel: 0.8 },
    Flying: { Grass: 1.2, Fighting: 1.2, Bug: 1.2, Electric: 0.8, Rock: 0.8, Steel: 0.8 }
  };
  
  return chart[attacker]?.[defender] ?? 1.0;
};

export const calculateDamage = (attackerStats: CreatureStats, attackerType: ElementType, defenderStats: CreatureStats, defenderType: ElementType): number => {
  const multiplier = getTypeMultiplier(attackerType, defenderType);
  const baseDamage = attackerStats.atk * multiplier - defenderStats.def;
  return Math.max(1, Math.ceil(baseDamage));
};

export const calculateExpToNextLevel = (level: number): number => {
  // A medium-fast growth curve: level^3
  return Math.floor(Math.pow(level + 1, 3));
};
