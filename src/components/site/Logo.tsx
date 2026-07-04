import markUrl from "@/assets/daddy-zinger-mark.png";
import fullLogoUrl from "@/assets/daddy-zinger-logo.png";

type LogoProps = {
  variant?: "mark" | "full";
  className?: string;
  alt?: string;
};

export function Logo({ variant = "mark", className, alt = "Daddy Zinger" }: LogoProps) {
  const src = variant === "full" ? fullLogoUrl : markUrl;
  return <img src={src} alt={alt} className={className} loading="eager" decoding="async" />;
}

export const LOGO_MARK_URL = markUrl;
export const LOGO_FULL_URL = fullLogoUrl;
