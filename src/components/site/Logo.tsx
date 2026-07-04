const MARK_URL = "/menu/daddy-zinger-mark.png";
const FULL_URL = "/menu/daddy-zinger-logo.png";

type LogoProps = {
  variant?: "mark" | "full";
  className?: string;
  alt?: string;
};

export function Logo({ variant = "mark", className, alt = "Daddy Zinger" }: LogoProps) {
  const src = variant === "full" ? FULL_URL : MARK_URL;
  return <img src={src} alt={alt} className={className} loading="eager" decoding="async" />;
}

export const LOGO_MARK_URL = MARK_URL;
export const LOGO_FULL_URL = FULL_URL;
