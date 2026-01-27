export default function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circle with gradient */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <linearGradient id="checkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d1fae5" />
        </linearGradient>
      </defs>
      
      {/* Main circle */}
      <circle cx="24" cy="24" r="22" fill="url(#logoGradient)" />
      
      {/* Inner glow */}
      <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      
      {/* Checkmark / Task symbol */}
      <path
        d="M14 24L21 31L34 17"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Small accent lines representing tasks */}
      <line x1="14" y1="15" x2="22" y2="15" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="19" x2="18" y2="19" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
