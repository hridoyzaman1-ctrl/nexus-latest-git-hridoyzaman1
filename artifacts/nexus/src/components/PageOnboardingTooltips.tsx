import { useFirstVisitTooltip } from '@/hooks/useFirstVisitTooltip';
import { pageTooltipConfigs } from '@/lib/onboardingTooltips';
import SpotlightTooltip from '@/components/SpotlightTooltip';

interface Props {
  pageId: string;
}

export default function PageOnboardingTooltips({ pageId }: Props) {
  const { showTooltips, dismiss } = useFirstVisitTooltip(pageId);
  const steps = pageTooltipConfigs[pageId];

  if (!showTooltips || !steps || steps.length === 0) return null;

  return <SpotlightTooltip steps={steps} onDismiss={dismiss} />;
}
