import { useEffect } from 'react';
import { useTrainingStore } from '../store/trainingStore';

/**
 * Locks mode switching (beginner/advanced/expert) while a decision is on screen.
 * Pass `active = true` whenever the user is being asked to answer; the lock is
 * released automatically when the component unmounts (module change).
 *
 * Replaces the duplicated pair of effects that every trainer used to carry:
 *   useEffect(() => { setIsExercising(<cond>); }, [...deps]);
 *   useEffect(() => () => { setIsExercising(false); }, []);
 */
export function useExerciseLock(active: boolean) {
  const setIsExercising = useTrainingStore(s => s.setIsExercising);
  useEffect(() => {
    setIsExercising(active);
  }, [active, setIsExercising]);
  useEffect(() => () => { setIsExercising(false); }, [setIsExercising]);
}
