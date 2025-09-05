import React from 'react';
import { useSettings } from '@/contexts/SettingsContext';

interface LogoProps {
  className?: string;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  animated = false, 
  size = 'md',
  showText = false
}) => {
  const { settings } = useSettings();
  const sizeClasses = {
    sm: 'h-12 w-auto',
    md: 'h-16 w-auto',
    lg: 'h-20 w-auto',
    xl: 'h-24 w-auto',
    '2xl': 'h-28 w-auto',
    '3xl': 'h-32 w-auto',
    '4xl': 'h-40 w-auto'
  } as const;

  const fallbackLogo = 'https://cdn.builder.io/api/v1/image/assets%2F0fefd836b28e486ab490d6475d657a91%2Ff7ccf546f9154947ac0d0a1ee6b6b602?format=webp&width=800';
  const logoUrl = settings.general.logoUrl && settings.general.logoUrl.trim() !== '' ? settings.general.logoUrl : fallbackLogo;
  const businessName = settings.general.businessName || 'Fast Command';

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} flex items-center justify-center transition-all duration-500 ${animated ? 'animate-pulse-subtle hover:scale-110' : 'hover:scale-105'}`}
      >
        <img
          src={logoUrl}
          alt={businessName}
          className="h-full w-auto object-contain drop-shadow-sm"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }}
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="text-brand-blue dark:text-brand-blue-light font-bold text-lg leading-tight arabic-safe">
            {businessName}
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
