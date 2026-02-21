import React from 'react';
import { cn } from '@/lib/utils';

interface ContactProgressBarProps {
  currentProgress: string;
  className?: string;
}

// Define colors for each stage to match the selection dropdown using CSS variables
const getStageColor = (stage: string, isActive: boolean, isClosedStatus: boolean = false) => {
  if (!isActive) return 'bg-gray-300';

  // If status is "closed", make everything light grey
  if (isClosedStatus) return 'bg-gray-300';

  const colors = {
    'new': 'bg-[hsl(var(--lead-new))]',
    'prospects': 'bg-[hsl(var(--lead-prospects))]',
    'connected': 'bg-[hsl(var(--lead-connected))]',
    'won': 'bg-[hsl(var(--lead-won))]',
    'closed': 'bg-[hsl(var(--lead-closed))]'
  };
  return colors[stage as keyof typeof colors] || 'bg-gray-300';
};

const progressStages = [
  { key: '', label: '', order: -1 }, // Blank starting dot
  { key: 'new', label: 'New', order: 0 },
  { key: 'prospects', label: 'Prospects', order: 1 },
  { key: 'connected', label: 'Connected', order: 2 },
  { key: 'won', label: 'Won', order: 3 },
  { key: 'closed', label: 'Closed', order: 4 }
];

const ContactProgressBar: React.FC<ContactProgressBarProps> = ({
  currentProgress = 'new',
  className
}) => {
  const currentStageIndex = progressStages.findIndex(stage => stage.key === currentProgress);
  const validCurrentStageIndex = currentStageIndex >= 0 ? currentStageIndex : 1; // Default to 'new' position
  const isClosedStatus = currentProgress === 'closed';

  return (
    <div className={cn("w-full py-1.5 flex items-center justify-center", className)}>
      <div className="flex items-center justify-center">
        <div
          className="inline-flex items-center justify-between relative rounded-full px-4 py-1.5 gap-x-3"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
          {/* Individual progress segments */}
          {progressStages.map((stage, index) => {
            if (index === 0) return null; // Skip first blank dot for segments

            const isCompleted = index <= validCurrentStageIndex;
            const segmentColor = isCompleted ? getStageColor(stage.key, true, isClosedStatus) : 'bg-muted';

            // For closed status, stop at the center of the last dot, not extend past it
            let segmentWidth, segmentLeft;
            if (isClosedStatus && index === progressStages.length - 1) {
              // Last segment for closed status - stop at center of last dot
              segmentWidth = `calc(${100 / (progressStages.length - 1)}% - ${24 / (progressStages.length - 1)}px - 6px)`;
              segmentLeft = `calc(${((index - 1) / (progressStages.length - 1)) * 100}% + 6px)`;

              return (
                <div
                  key={`segment-${index}`}
                  className={cn(
                    "absolute h-0.5 z-0 transition-all duration-500 ease-out",
                    segmentColor
                  )}
                  style={{ width: segmentWidth, left: segmentLeft, top: "50%", transform: "translateY(-50%)" }}
                />
              );
            } else {
              return (
                <div
                  key={`segment-${index}`}
                  className={cn(
                    "flex-1 h-0.5 z-0 transition-all duration-500 ease-out min-w-[32px] mx-2",
                    segmentColor
                  )}
                />
              );
            }
          })}

          {progressStages.map((stage, index) => {
            const isCompleted = index < validCurrentStageIndex;
            const isCurrent = index === validCurrentStageIndex;
            const isBlankDot = stage.key === '';

            return (
              <div key={`${stage.key}-${index}`} className="flex flex-row items-center relative z-10 group">
                {/* Dot */}
                <div
                  className={cn(
                    "w-3 h-3 rounded-full border-2 border-surface-primary transition-all duration-300",
                    // Blank starting dot styling
                    isBlankDot && !isClosedStatus && "bg-white",
                    isBlankDot && isClosedStatus && "bg-gray-300",
                    // Regular dots styling
                    !isBlankDot && getStageColor(stage.key, isCompleted || isCurrent, isClosedStatus)
                  )}
                  style={{
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                  }}
                />

                {/* Label - Inline on desktop, hidden on mobile */}
                {!isBlankDot && (
                  <span className={cn(
                    "text-xs font-medium ml-2 whitespace-nowrap",
                    // Hide on mobile/tablet, show inline on desktop
                    "hidden lg:block",
                    {
                      "text-primary": isCompleted || isCurrent,
                      "text-muted-foreground": !isCompleted && !isCurrent
                    }
                  )}>
                    {stage.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ContactProgressBar;


