import mark from "@/assets/daddy-zinger-mark.png.asset.json";
import fullLogo from "@/assets/daddy-zinger-logo.png.asset.json";

type LogoProps = {
  variant?: "mark" | "full";
  className?: string;
  alt?: string;
};

export function Logo({ variant = "mark", className, alt = "Daddy Zinger" }: LogoProps) {
  const src = variant === "full" ? fullLogo.url : mark.url;
  return <img src={src} alt={alt} className={className} loading="eager" decoding="async" />;
}

export const LOGO_MARK_URL = mark.url;
export const LOGO_FULL_URL = fullLogo.url;
