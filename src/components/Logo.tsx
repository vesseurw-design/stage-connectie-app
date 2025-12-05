
import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "h-12", showText = true }) => {
  const [imgError, setImgError] = useState(false);

  // Zorg dat logo.png in de map 'public' staat!
  const iconUrl = "/logo.png";

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {!imgError ? (
        <img 
          src={iconUrl} 
          alt="Groene Hart Pro College" 
          className="h-full w-auto object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            setImgError(true);
          }}
        />
      ) : (
        /* Fallback als afbeelding niet laadt */
        <>
          <div className="h-full aspect-square bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
            <GraduationCap className="text-[#009FE3] w-3/4 h-3/4" />
          </div>
          
          {showText && (
            <div className="flex flex-col justify-center h-full -ml-1">
              <span className="text-[#78BE20] font-medium leading-none tracking-wide text-[0.55em]">Groene Hart</span>
              <span className="text-[#009FE3] font-bold leading-none -ml-[1px] text-[1.2em] mt-[0.1em]">Pro College</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
