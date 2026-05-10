import { useGameStore } from '../../store/gameStore';
import { useMultiplayerStore } from '../multiplayerStore';

/**
 * Returns true if the local human player is allowed to act.
 * - In solo mode: always true (CPU gating is handled by playCpuAction).
 * - In online mode: true only when it's this player's turn and the current
 *   player is not a CPU (the server runs CPU turns server-side).
 */
export function useIsMyTurn(): boolean {
  const { mpPhase, myPlayerId } = useMultiplayerStore();
  const { players, currentPlayerIndex } = useGameStore();

  if (mpPhase !== 'PLAYING') return true; // solo / not in game

  const current = players[currentPlayerIndex];
  if (!current) return false;

  return current.id === myPlayerId;
}
