import * as React from "react";
import { Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<"input">, "type" | "prefix"> & {
  className?: string;
};

/**
 * Pakistan-only phone input. Renders a fixed +92 prefix and accepts the
 * 10-digit subscriber number. Users may also paste `03XXXXXXXXX` — we
 * strip the leading zero automatically. Validation lives in `pkPhoneSchema`.
 */
export const PhoneField = React.forwardRef<HTMLInputElement, Props>(
  ({ className, value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let v = e.target.value.replace(/[^\d]/g, "");
      if (v.startsWith("92")) v = v.slice(2);
      if (v.startsWith("0")) v = v.slice(1);
      v = v.slice(0, 10);
      e.target.value = v;
      onChange?.(e);
    };

    return (
      <div className="relative flex items-stretch">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 flex items-center gap-1.5 pl-3 pr-2 border-r border-border text-sm text-muted-foreground">
          <Phone className="h-4 w-4" aria-hidden />
          <span aria-hidden>+92</span>
        </div>
        <Input
          ref={ref}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="3XX XXXXXXX"
          value={value}
          onChange={handleChange}
          className={cn("pl-[74px] h-11 tracking-wide", className)}
          aria-label="Pakistan mobile number"
          {...props}
        />
      </div>
    );
  },
);
PhoneField.displayName = "PhoneField";
