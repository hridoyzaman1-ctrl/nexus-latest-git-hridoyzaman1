const POSE_SVGS: Record<string, (size: number) => JSX.Element> = {
  standing_neutral: (s) => (
    <svg width={s} height={s} viewBox="0 0 80 120" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="40" cy="15" r="8" />
      <line x1="40" y1="23" x2="40" y2="65" />
      <line x1="40" y1="35" x2="22" y2="50" />
      <line x1="40" y1="35" x2="58" y2="50" />
      <line x1="40" y1="65" x2="28" y2="110" />
      <line x1="40" y1="65" x2="52" y2="110" />
    </svg>
  ),
  jumping_jack_open: (s) => (
    <svg width={s} height={s} viewBox="0 0 80 120" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="40" cy="12" r="8" />
      <line x1="40" y1="20" x2="40" y2="62" />
      <line x1="40" y1="30" x2="15" y2="15" />
      <line x1="40" y1="30" x2="65" y2="15" />
      <line x1="40" y1="62" x2="18" y2="110" />
      <line x1="40" y1="62" x2="62" y2="110" />
    </svg>
  ),
  squat_down: (s) => (
    <svg width={s} height={s} viewBox="0 0 80 120" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="40" cy="25" r="8" />
      <line x1="40" y1="33" x2="40" y2="62" />
      <line x1="40" y1="42" x2="22" y2="55" />
      <line x1="40" y1="42" x2="58" y2="55" />
      <polyline points="40,62 25,80 20,110" />
      <polyline points="40,62 55,80 60,110" />
    </svg>
  ),
  squat_bottom: (s) => (
    <svg width={s} height={s} viewBox="0 0 80 120" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="40" cy="35" r="8" />
      <line x1="40" y1="43" x2="40" y2="72" />
      <line x1="40" y1="50" x2="20" y2="60" />
      <line x1="40" y1="50" x2="60" y2="60" />
      <polyline points="40,72 22,85 15,110" />
      <polyline points="40,72 58,85 65,110" />
    </svg>
  ),
  plank_high: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 70" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="80" cy="20" r="6" />
      <line x1="74" y1="22" x2="15" y2="32" />
      <line x1="75" y1="25" x2="80" y2="55" />
      <line x1="15" y1="32" x2="10" y2="60" />
      <line x1="15" y1="32" x2="22" y2="60" />
    </svg>
  ),
  pushup_down: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 70" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="80" cy="30" r="6" />
      <line x1="74" y1="32" x2="15" y2="38" />
      <polyline points="75,34 82,48 78,60" />
      <line x1="15" y1="38" x2="10" y2="60" />
      <line x1="15" y1="38" x2="22" y2="60" />
    </svg>
  ),
  pushup_bottom: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 70" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="80" cy="35" r="6" />
      <line x1="74" y1="38" x2="15" y2="42" />
      <polyline points="75,40 85,50 80,60" />
      <line x1="15" y1="42" x2="10" y2="60" />
      <line x1="15" y1="42" x2="22" y2="60" />
    </svg>
  ),
  plank_forearm: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 70" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="82" cy="25" r="6" />
      <line x1="76" y1="28" x2="15" y2="35" />
      <polyline points="76,30 85,38 90,35" />
      <line x1="15" y1="35" x2="10" y2="60" />
      <line x1="15" y1="35" x2="22" y2="60" />
    </svg>
  ),
  lunge_right: (s) => (
    <svg width={s} height={s} viewBox="0 0 80 120" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="40" cy="20" r="8" />
      <line x1="40" y1="28" x2="40" y2="58" />
      <line x1="40" y1="38" x2="25" y2="50" />
      <line x1="40" y1="38" x2="55" y2="50" />
      <polyline points="40,58 55,80 55,110" />
      <polyline points="40,58 25,85 15,110" />
    </svg>
  ),
  lunge_bottom: (s) => (
    <svg width={s} height={s} viewBox="0 0 80 120" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="42" cy="25" r="8" />
      <line x1="42" y1="33" x2="42" y2="62" />
      <line x1="42" y1="42" x2="28" y2="55" />
      <line x1="42" y1="42" x2="56" y2="55" />
      <polyline points="42,62 60,78 60,110" />
      <polyline points="42,62 22,80 10,110" />
    </svg>
  ),
  bridge_up: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 70" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="15" cy="40" r="6" />
      <line x1="21" y1="40" x2="55" y2="25" />
      <line x1="15" y1="45" x2="10" y2="60" />
      <polyline points="55,25 70,35 75,60" />
      <polyline points="55,25 65,42 58,60" />
    </svg>
  ),
  bridge_top: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 70" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="15" cy="35" r="6" />
      <line x1="21" y1="35" x2="55" y2="20" />
      <line x1="15" y1="40" x2="10" y2="60" />
      <polyline points="55,20 72,32 78,60" />
      <polyline points="55,20 62,38 55,60" />
    </svg>
  ),
  downward_dog: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="75" cy="55" r="6" />
      <polyline points="75,50 50,15 25,55" />
      <line x1="25" y1="55" x2="18" y2="75" />
      <line x1="25" y1="55" x2="32" y2="75" />
      <line x1="75" y1="52" x2="80" y2="30" />
    </svg>
  ),
  warrior_two: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 120" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="50" cy="20" r="8" />
      <line x1="50" y1="28" x2="50" y2="65" />
      <line x1="50" y1="40" x2="15" y2="40" />
      <line x1="50" y1="40" x2="85" y2="40" />
      <polyline points="50,65 30,85 25,110" />
      <polyline points="50,65 70,85 75,110" />
    </svg>
  ),
  child_pose: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 60" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="25" cy="35" r="6" />
      <polyline points="31,35 55,35 65,50" />
      <line x1="25" y1="38" x2="10" y2="35" />
      <line x1="65" y1="50" x2="60" y2="55" />
      <line x1="65" y1="50" x2="72" y2="55" />
    </svg>
  ),
  jump_arms_up: (s) => (
    <svg width={s} height={s} viewBox="0 0 80 120" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="40" cy="10" r="8" />
      <line x1="40" y1="18" x2="40" y2="55" />
      <line x1="40" y1="25" x2="25" y2="5" />
      <line x1="40" y1="25" x2="55" y2="5" />
      <line x1="40" y1="55" x2="30" y2="90" />
      <line x1="40" y1="55" x2="50" y2="90" />
    </svg>
  ),
  all_fours: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 60" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="75" cy="18" r="6" />
      <line x1="69" y1="20" x2="30" y2="25" />
      <line x1="75" y1="24" x2="75" y2="50" />
      <line x1="30" y1="25" x2="25" y2="50" />
      <line x1="30" y1="25" x2="35" y2="50" />
    </svg>
  ),
  cobra_up: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 60" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="70" cy="12" r="6" />
      <polyline points="70,18 65,35 20,50" />
      <polyline points="65,30 72,42 70,50" />
      <line x1="20" y1="50" x2="10" y2="50" />
    </svg>
  ),
  lying_flat: (s) => (
    <svg width={s} height={s} viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="15" cy="20" r="6" />
      <line x1="21" y1="20" x2="90" y2="20" />
      <line x1="15" y1="25" x2="5" y2="22" />
    </svg>
  ),
  seated_v: (s) => (
    <svg width={s} height={s} viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="40" cy="15" r="7" />
      <line x1="40" y1="22" x2="40" y2="50" />
      <line x1="40" y1="30" x2="55" y2="40" />
      <line x1="40" y1="30" x2="25" y2="40" />
      <line x1="40" y1="50" x2="25" y2="70" />
      <line x1="40" y1="50" x2="55" y2="70" />
    </svg>
  ),
  boxing_stance: (s) => (
    <svg width={s} height={s} viewBox="0 0 80 120" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="42" cy="15" r="8" />
      <line x1="42" y1="23" x2="42" y2="62" />
      <polyline points="42,35 30,28 28,25" />
      <polyline points="42,38 55,32 58,28" />
      <line x1="42" y1="62" x2="32" y2="110" />
      <line x1="42" y1="62" x2="52" y2="110" />
    </svg>
  ),
  tree_pose: (s) => (
    <svg width={s} height={s} viewBox="0 0 80 120" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
      <circle cx="40" cy="12" r="8" />
      <line x1="40" y1="20" x2="40" y2="65" />
      <line x1="40" y1="32" x2="48" y2="40" />
      <line x1="40" y1="32" x2="32" y2="40" />
      <line x1="40" y1="65" x2="40" y2="110" />
      <polyline points="55,55 40,50" />
    </svg>
  ),
};

const POSE_KEY_MAP: Record<string, string> = {
  arm_circle_forward: 'jumping_jack_open',
  arm_circle_backward: 'jumping_jack_open',
  arms_extended: 'jumping_jack_open',
  hands_on_hips: 'standing_neutral',
  neck_forward: 'standing_neutral',
  neck_tilt_left: 'standing_neutral',
  neck_tilt_right: 'standing_neutral',
  hip_circle: 'standing_neutral',
  march_left: 'standing_neutral',
  march_right: 'standing_neutral',
  high_knee_left: 'lunge_right',
  high_knee_right: 'lunge_right',
  butt_kick_left: 'lunge_right',
  butt_kick_right: 'lunge_right',
  squat_bottom: 'squat_down',
  wall_sit: 'squat_down',
  side_lunge_right: 'lunge_right',
  side_lunge_bottom: 'lunge_bottom',
  reverse_lunge_right: 'lunge_right',
  standing_elevated: 'standing_neutral',
  standing_wall: 'standing_neutral',
  step_up_right: 'lunge_right',
  wide_stance: 'squat_down',
  mountain_climber_left: 'plank_high',
  mountain_climber_right: 'plank_high',
  shoulder_tap_left: 'plank_high',
  shoulder_tap_right: 'plank_high',
  plank_wide: 'plank_high',
  pike_pushup_down: 'pushup_down',
  pike_pushup_bottom: 'pushup_bottom',
  dip_start: 'squat_down',
  dip_down: 'squat_bottom',
  dip_hold: 'squat_down',
  superman_up: 'cobra_up',
  lying_face_down: 'lying_flat',
  lying_knees_bent: 'lying_flat',
  lying_knees_up: 'bridge_up',
  hip_thrust_start: 'lying_flat',
  hip_thrust_top: 'bridge_top',
  donkey_kick_up: 'all_fours',
  donkey_kick_top: 'all_fours',
  fire_hydrant_up: 'all_fours',
  fire_hydrant_top: 'all_fours',
  dead_bug_start: 'lying_flat',
  dead_bug_extend: 'lying_flat',
  bicycle_crunch_left: 'lying_flat',
  bicycle_crunch_right: 'lying_flat',
  russian_twist_left: 'seated_v',
  russian_twist_right: 'seated_v',
  leg_raise_up: 'lying_flat',
  leg_raise_top: 'lying_flat',
  flutter_kick_start: 'lying_flat',
  flutter_kick_action: 'lying_flat',
  skater_left: 'lunge_right',
  skater_right: 'lunge_right',
  skater_touch: 'lunge_bottom',
  bear_crawl_start: 'plank_high',
  bear_crawl_move: 'plank_high',
  boxing_jab: 'boxing_stance',
  boxing_hook: 'boxing_stance',
  jump_arms_up: 'jumping_jack_open',
  downward_dog_transition: 'downward_dog',
  cobra_full: 'cobra_up',
  warrior_setup: 'warrior_two',
  tree_pose_arms_up: 'tree_pose',
  cat_pose: 'all_fours',
  cow_pose: 'all_fours',
  kneeling: 'child_pose',
  kneeling_sit: 'child_pose',
  single_leg_stand: 'tree_pose',
  single_leg_deadlift_mid: 'standing_neutral',
  single_leg_deadlift_bottom: 'lunge_bottom',
  quad_stretch_left: 'standing_neutral',
  quad_stretch_right: 'standing_neutral',
  quad_stretch_hold: 'standing_neutral',
  seated_forward_fold: 'child_pose',
  seated_legs_extended: 'seated_v',
  seated_tall: 'standing_neutral',
  side_plank_setup: 'plank_forearm',
  side_plank_hold: 'plank_forearm',
  toe_touch_down: 'standing_neutral',
  toe_touch_bottom: 'squat_down',
};

const DEFAULT_POSE = (s: number) => POSE_SVGS.standing_neutral(s);

export default function ExercisePose({ poseKey, size = 80 }: { poseKey: string; size?: number }) {
  const mappedKey = POSE_KEY_MAP[poseKey] || poseKey;
  const renderer = POSE_SVGS[mappedKey] || DEFAULT_POSE;
  return <div className="flex items-center justify-center">{renderer(size)}</div>;
}
