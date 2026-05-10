/**
 * Thin bridge that lets multiplayerStore intercept gameStore actions.
 * When in online mode, the interceptor emits to the server instead of
 * running local reducers.
 */

type InterceptFn = (action: string, args: unknown[]) => boolean;
let _interceptor: InterceptFn | null = null;

export function setMpInterceptor(fn: InterceptFn | null): void {
  _interceptor = fn;
}

/** Returns true if the action was handled by the multiplayer layer (caller should return). */
export function mpIntercept(action: string, args: unknown[]): boolean {
  return _interceptor ? _interceptor(action, args) : false;
}
