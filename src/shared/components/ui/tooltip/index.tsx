import { useCallback, useEffect, useState, type ReactElement, type ReactNode } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@core/utils';
import './tooltip.css';

export type TooltipPosition = 'top' | 'right' | 'bottom' | 'left';
export type TooltipTarget = 'hover' | 'click';

export interface TooltipProps {
  children: ReactElement;
  content: ReactNode;
  position?: TooltipPosition;
  target?: TooltipTarget;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  delayDuration?: number;
  disabled?: boolean;
  className?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Tooltip({
  children,
  content,
  position = 'top',
  target = 'hover',
  align = 'center',
  sideOffset = 8,
  delayDuration = 200,
  disabled = false,
  className,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: TooltipProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = !disabled && (isControlled ? controlledOpen : uncontrolledOpen);

  const setOpen = useCallback((nextOpen: boolean) => {
    if (!isControlled) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }, [isControlled, onOpenChange]);

  useEffect(() => {
    if (target !== 'click' || !open) return;

    const close = () => setOpen(false);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, setOpen, target]);

  if (disabled) return children;

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root
        open={open}
        onOpenChange={target === 'hover' ? setOpen : undefined}
        delayDuration={delayDuration}
      >
        <TooltipPrimitive.Trigger
          asChild
          onClick={
            target === 'click'
              ? (event) => {
                  event.stopPropagation();
                  setOpen(!open);
                }
              : undefined
          }
          onPointerDown={target === 'click' ? (event) => event.stopPropagation() : undefined}
        >
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={position}
            align={align}
            sideOffset={sideOffset}
            className={cn('tooltip-content', className)}
          >
            {content}
            <TooltipPrimitive.Arrow className="tooltip-arrow" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
