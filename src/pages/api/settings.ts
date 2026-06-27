import type { APIRoute } from 'astro';
import { upsertUserSettings } from '../../lib/queries';
import { validateHoursPerWeek, validatePlanWeeks } from '../../lib/validation';

export const prerender = false;

/**
 * Save a user's study plan, then bounce back to the dashboard so they see the
 * updated, plan-aware problems view. Difficulty checkboxes only appear in the
 * form data when ticked, so presence == shown.
 */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user;
  if (!user) {
    return redirect('/login');
  }

  const form = await request.formData();
  const weeks = validatePlanWeeks(form.get('weeks'));
  const hoursPerWeek = validateHoursPerWeek(form.get('hours_per_week'));
  const showEasy = form.get('show_easy') !== null;
  const showMedium = form.get('show_medium') !== null;
  const showHard = form.get('show_hard') !== null;

  if (!weeks || !hoursPerWeek) {
    return redirect('/settings?error=invalid');
  }
  // A plan with no difficulties would hide every problem.
  if (!showEasy && !showMedium && !showHard) {
    return redirect('/settings?error=nodiff');
  }

  await upsertUserSettings(user.id, { weeks, hoursPerWeek, showEasy, showMedium, showHard });
  return redirect('/dashboard');
};
