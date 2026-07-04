import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
};

export function OtpInput({ value, onChange, onComplete, disabled, error, autoFocus }: Props) {
  return (
    <InputOTP
      maxLength={6}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      disabled={disabled}
      autoFocus={autoFocus}
      containerClassName={cn("justify-center", error && "animate-[shake_0.4s_ease-in-out]")}
    >
      <InputOTPGroup className="gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <InputOTPSlot
            key={i}
            index={i}
            className={cn(
              "h-12 w-11 text-lg font-semibold rounded-md border border-input first:rounded-md last:rounded-md",
              error && "border-destructive text-destructive",
            )}
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
