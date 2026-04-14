"use client";

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  min?: string;
  max?: string;
  className?: string;
}

export default function DatePicker({
  value,
  onChange,
  label,
  min,
  max,
  className = "",
}: DatePickerProps) {
  return (
    <div className={className}>
      {label && (
        <label className="label">{label}</label>
      )}
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      />
    </div>
  );
}
