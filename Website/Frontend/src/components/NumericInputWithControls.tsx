// src/components/NumericInputWithControls.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FaPlus, FaMinus } from "react-icons/fa";

interface NumericInputWithControlsProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  labelIcon?: React.ReactNode;
  className?: string;
}

const NumericInputWithControls: React.FC<NumericInputWithControlsProps> = ({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  labelIcon,
  className,
}) => {
  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let numericValue = parseInt(e.target.value, 10);
    if (isNaN(numericValue)) {
      numericValue = min; // Default to min or consider current value if input is cleared
    }
    const clampedValue = Math.max(min, Math.min(max, numericValue));
    onChange(clampedValue);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label
        htmlFor={id}
        className="flex items-center space-x-1 text-sm md:text-base"
      >
        {labelIcon}
        <span>{label}</span>
      </Label>
      <div className="flex items-center">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleDecrement}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="h-9 w-9 shrink-0 rounded-r-none border-r-0" // Adjusted: No right border, keep left rounding
        >
          <FaMinus className="h-2 w-2 text-gray-800" size={13}/>{" "}
          {/* Icon color & size */}
        </Button>
        <Input
          id={id}
          type="number"
          value={value}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          className="h-9 w-full rounded-none text-center [-moz-appearance:textfield] focus-visible:ring-1 focus-visible:ring-offset-0 [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none" // Adjusted: No rounding, manage focus ring
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleIncrement}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="h-9 w-9 shrink-0 rounded-l-none border-l-0" // Adjusted: No left border, keep right rounding
        >
          <FaPlus className="h-2 w-2 text-gray-800" size={13}/>{" "}
          {/* Icon color & size */}
        </Button>
      </div>
    </div>
  );
};

export default NumericInputWithControls;