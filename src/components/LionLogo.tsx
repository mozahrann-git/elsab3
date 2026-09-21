import React from 'react';

interface LionLogoProps {
  className?: string;
  size?: number;
  withText?: boolean;
  withSubtitle?: boolean;
  subtitle?: string;
  textColor?: string;
  subtextColor?: string;
  customLogoUrl?: string;
  variant?: 'horizontal' | 'stacked' | 'icon-only';
}

export const LionLogo: React.FC<LionLogoProps> = ({
  className = '',
  size = 40,
  withText = true,
  withSubtitle = true,
  subtitle = 'تسويق واستثمار عقاري فاخر',
  textColor = 'text-[#141414]',
  subtextColor = 'text-[#6B665C]',
  customLogoUrl,
  variant = 'horizontal',
}) => {
  const [logoImage, setLogoImage] = React.useState<string | null>(() => {
    return customLogoUrl || localStorage.getItem('hadaba_custom_logo_url') || localStorage.getItem('elseba_custom_logo_url') || null;
  });

  React.useEffect(() => {
    if (customLogoUrl !== undefined) {
      setLogoImage(customLogoUrl || null);
    }
  }, [customLogoUrl]);

  React.useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem('hadaba_custom_logo_url') || localStorage.getItem('elseba_custom_logo_url');
      if (stored) {
        setLogoImage(stored);
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('lion_logo_updated', handleStorage as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('lion_logo_updated', handleStorage as EventListener);
    };
  }, []);

  const renderEmblem = () => (
    <div 
      className="relative flex items-center justify-center shrink-0 select-none bg-[#141414] p-1.5 rounded-xl border border-stone-800 shadow-xs"
      style={{ width: size, height: size }}
    >
      {logoImage ? (
        <img 
          src={logoImage} 
          alt="السبع للعقارات" 
          className="w-full h-full object-contain rounded-lg"
          referrerPolicy="no-referrer"
        />
      ) : (
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full fill-white"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Towers Crest */}
          <path d="M 94 22 L 106 14 L 106 58 L 94 58 Z" fill="#ffffff" />
          <path d="M 98 28 L 102 25 L 102 52 L 98 52 Z" fill="#141414" />
          <path d="M 82 28 L 90 28 L 90 56 L 82 56 Z" fill="#ffffff" />
          <path d="M 85 34 L 88 34 L 88 50 L 85 50 Z" fill="#141414" />
          <path d="M 110 30 L 118 30 L 118 58 L 110 58 Z" fill="#ffffff" />
          <path d="M 113 36 L 116 36 L 116 52 L 113 52 Z" fill="#141414" />

          {/* Crest Rings */}
          <path
            d="M 78 36 C 45 52 28 88 36 124 C 44 158 75 182 110 180 C 130 179 148 171 161 157 C 153 151 144 157 134 162 C 108 174 74 163 56 138 C 40 114 44 82 66 60 C 72 54 78 48 85 44 Z"
            fill="#ffffff"
          />
          <path
            d="M 124 38 C 158 54 176 90 168 126 C 164 144 153 158 139 168 C 146 160 152 150 155 138 C 161 110 148 80 123 66 C 117 62 112 59 108 57 L 115 48 C 122 51 130 56 137 62 Z"
            fill="#ffffff"
          />

          {/* Mane */}
          <path d="M 82 60 C 66 74 62 96 68 116 C 73 130 84 142 98 147 C 90 138 84 126 82 114 C 80 98 86 84 98 72 Z" fill="#ffffff" />
          <path d="M 94 65 C 82 78 80 97 86 115 C 90 126 98 135 109 139 C 103 130 99 120 98 110 C 97 97 102 85 112 75 Z" fill="#ffffff" />
          <path d="M 106 70 C 97 82 96 98 102 112 C 105 120 111 127 120 130 C 115 123 113 115 113 107 C 113 97 117 88 125 80 Z" fill="#ffffff" />
          <path d="M 118 78 C 112 88 111 100 116 111 C 119 117 124 121 131 123 C 127 117 125 111 125 105 C 125 97 128 90 134 84 Z" fill="#ffffff" />

          {/* Head */}
          <path d="M 112 60 C 122 60 130 64 136 71 L 149 78 C 154 81 153 86 148 88 L 138 90 C 137 93 133 96 128 97 C 124 98 119 96 116 93 C 122 90 127 85 130 79 C 131 74 128 70 123 68 C 119 66 115 65 112 60 Z" fill="#ffffff" />
          <path d="M 126 73 C 129 74 131 76 131 78 C 128 78 126 76 124 74 Z" fill="#141414" />
          <path d="M 134 93 C 137 97 134 102 128 104 C 124 105 119 103 118 99 C 123 100 128 98 131 94 Z" fill="#ffffff" />
        </svg>
      )}
    </div>
  );

  if (variant === 'icon-only' || !withText) {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {renderEmblem()}
      </div>
    );
  }

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center justify-center text-center gap-1.5 select-none ${className}`}>
        {renderEmblem()}
        {withText && (
          <div className="flex flex-col items-center">
            <span className={`font-bold font-readex text-lg ${textColor}`}>
              السبع للعقارات
            </span>
            {withSubtitle && (
              <span className={`text-[11px] font-medium ${subtextColor}`}>
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default horizontal
  return (
    <div className={`flex items-center gap-3 select-none shrink-0 ${className}`}>
      {renderEmblem()}
      {withText && (
        <div className="flex flex-col text-right">
          <span className={`font-bold font-readex text-base sm:text-lg leading-tight ${textColor}`}>
            السبع للعقارات
          </span>
          {withSubtitle && (
            <span className={`text-[11px] font-normal leading-tight mt-0.5 ${subtextColor}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
