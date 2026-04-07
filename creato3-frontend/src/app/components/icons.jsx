const Svg = ({ className = '', viewBox = '0 0 24 24', children, ...props }) => (
  <svg
    className={className}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
)

export const ArrowRightIcon = (props) => (
  <Svg {...props}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Svg>
)

export const DollarSignIcon = (props) => (
  <Svg {...props}>
    <path d="M12 2v20" />
    <path d="M17 7c0-2.2-2.2-4-5-4S7 4.8 7 7s1.8 3 5 4 5 1.8 5 4-2.2 4-5 4-5-1.8-5-4" />
  </Svg>
)

export const UsersIcon = (props) => (
  <Svg {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
)

export const ZapIcon = (props) => (
  <Svg {...props}>
    <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
  </Svg>
)

export const ShieldIcon = (props) => (
  <Svg {...props}>
    <path d="M12 3 5 6v6c0 5 3.4 8.7 7 10 3.6-1.3 7-5 7-10V6z" />
  </Svg>
)

export const RepeatIcon = (props) => (
  <Svg {...props}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </Svg>
)

export const UserCircleIcon = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="10" r="3.5" />
    <path d="M6.5 19a6.5 6.5 0 0 1 11 0" />
  </Svg>
)

export const SearchIcon = (props) => (
  <Svg {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
)

export const TrendingUpIcon = (props) => (
  <Svg {...props}>
    <path d="M3 17 9 11l4 4 8-8" />
    <path d="M14 7h7v7" />
  </Svg>
)

export const ClockIcon = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6l4 2" />
  </Svg>
)

export const UploadIcon = (props) => (
  <Svg {...props}>
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M4 20h16" />
  </Svg>
)

export const LinkIcon = (props) => (
  <Svg {...props}>
    <path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 13" />
    <path d="M14 11a5 5 0 0 1 0 7L12.5 19.5a5 5 0 0 1-7-7L7 11" />
  </Svg>
)

export const SparklesIcon = (props) => (
  <Svg {...props}>
    <path d="M12 3 13.8 8.2 19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    <path d="m19 3 .8 2.2L22 6l-2.2.8L19 9l-.8-2.2L16 6l2.2-.8z" />
    <path d="m5 15 .8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8z" />
  </Svg>
)

export const MessageCircleIcon = (props) => (
  <Svg {...props}>
    <path d="M21 11.5A8.5 8.5 0 1 1 8 4.1 8.5 8.5 0 0 1 21 11.5Z" />
    <path d="m8 20-4 2 1.5-4" />
  </Svg>
)

export const GlobeIcon = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18" />
    <path d="M12 3a14 14 0 0 0 0 18" />
  </Svg>
)

export const VideoIcon = (props) => (
  <Svg {...props}>
    <rect x="3" y="6" width="13" height="12" rx="2" />
    <path d="m16 10 5-3v10l-5-3z" />
  </Svg>
)

export const FileTextIcon = (props) => (
  <Svg {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8" />
    <path d="M8 17h8" />
    <path d="M8 9h3" />
  </Svg>
)

export const ImageIcon = (props) => (
  <Svg {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="m21 15-4-4-6 6-3-3-5 5" />
  </Svg>
)

export const XIcon = (props) => (
  <Svg {...props}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Svg>
)

export const CreditCardIcon = (props) => (
  <Svg {...props}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
    <path d="M6 15h4" />
  </Svg>
)

export const WalletIcon = (props) => (
  <Svg {...props}>
    <path d="M4 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
    <path d="M16 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2" />
    <circle cx="16.5" cy="13" r="1" />
  </Svg>
)

export const SmartphoneIcon = (props) => (
  <Svg {...props}>
    <rect x="7" y="2" width="10" height="20" rx="2" />
    <path d="M11 18h2" />
  </Svg>
)

export const CheckIcon = (props) => (
  <Svg {...props}>
    <path d="m5 13 4 4L19 7" />
  </Svg>
)

export const MoonIcon = (props) => (
  <Svg {...props}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8" />
  </Svg>
)

export const SunIcon = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5" />
    <path d="M12 19.5V22" />
    <path d="m4.9 4.9 1.8 1.8" />
    <path d="m17.3 17.3 1.8 1.8" />
    <path d="M2 12h2.5" />
    <path d="M19.5 12H22" />
    <path d="m4.9 19.1 1.8-1.8" />
    <path d="m17.3 6.7 1.8-1.8" />
  </Svg>
)

export const TwitterIcon = (props) => (
  <Svg {...props}>
    <path d="m4 4 16 16" />
    <path d="M20 4 9 16" />
    <path d="m9 8 5 8" />
  </Svg>
)

export const GithubIcon = (props) => (
  <Svg {...props}>
    <path d="M9 19c-4 1.5-4-2-6-2" />
    <path d="M15 22v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.1-1.5 6.1-6.8A5.3 5.3 0 0 0 18.7 5 4.9 4.9 0 0 0 18.6 1s-1.1-.3-3.6 1.4a12.3 12.3 0 0 0-6 0C6.5.7 5.4 1 5.4 1A4.9 4.9 0 0 0 5.3 5 5.3 5.3 0 0 0 3.8 8.7c0 5.3 3.1 6.5 6.1 6.8A3.4 3.4 0 0 0 9 18.1V22" />
  </Svg>
)

export const HeartIcon = (props) => (
  <Svg {...props}>
    <path d="m12 21-1.5-1.4C5 14.6 2 11.8 2 8.4 2 5.7 4.2 3.5 6.9 3.5c1.5 0 3 .7 4.1 1.9 1.1-1.2 2.6-1.9 4.1-1.9C17.8 3.5 20 5.7 20 8.4c0 3.4-3 6.2-8.5 11.2z" />
  </Svg>
)
