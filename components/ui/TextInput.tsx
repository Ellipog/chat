import { ChangeEvent, forwardRef } from "react";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  disabled?: boolean;
  minimal?: boolean;
  onBlur?: () => void;
  autoFocus?: boolean;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      value,
      onChange,
      placeholder,
      type = "text",
      disabled = false,
      minimal = false,
      onBlur,
      autoFocus,
    },
    ref
  ) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const modifiedValue = e.target.value.replace("automagisk", "automatisk");
      onChange(modifiedValue);
    };

    const baseStyles =
      "w-full text-gray-500 outline-none caret-gray-400 placeholder:text-gray-400 placeholder:transition-opacity placeholder:duration-300 placeholder:focus:opacity-0 disabled:opacity-50 disabled:cursor-not-allowed";
    const decorativeStyles =
      "border-2 border-gray-300 rounded-2xl shadow-lg hover:border-gray-400/65 transition-all duration-300 py-2 px-3";

    return (
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        onBlur={onBlur}
        autoFocus={autoFocus}
        className={`${baseStyles} ${!minimal ? decorativeStyles : ""}`}
      />
    );
  }
);

TextInput.displayName = "TextInput";

export default TextInput;
