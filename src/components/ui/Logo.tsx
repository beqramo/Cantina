import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  forceTheme?: 'light' | 'dark';
}

export function Logo({ className, forceTheme }: LogoProps) {
  return (
    <div
      className={cn(
        'font-extrabold tracking-tight flex items-center gap-1.5 select-none',
        className,
      )}>
      <span className='flex items-center gap-px'>Cantina</span>
      <span
        className={cn(
          'px-2 py-0.5 rounded-md text-[0.9em] leading-none flex items-center',
          // Base styles
          'transition-colors',
          // Theme logic:
          // 1. If forced light: bg-black text-white
          // 2. If forced dark: bg-white text-black
          // 3. If auto (default): bg-black text-white in light mode, bg-white text-black in dark mode
          forceTheme === 'light'
            ? 'bg-black text-white'
            : forceTheme === 'dark'
              ? 'bg-white text-black'
              : 'bg-black text-white dark:bg-white dark:text-black',
        )}>
        IPB
      </span>
      <span className='text-muted-foreground/60 ml-0.5'>/&gt;</span>
    </div>
  );
}
