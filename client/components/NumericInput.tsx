import React from 'react';
import { Input } from '@/components/ui/input';
import { normalizeNumericInput } from '@/utils/format';

interface NumericInputProps extends React.ComponentProps<typeof Input> {
  value: string | number;
  onChange: (v: string) => void;
}

const NumericInput: React.FC<NumericInputProps> = ({ value, onChange, ...rest }) => {
  const str = typeof value === 'number' ? String(value) : value || '';
  return (
    <Input
      {...rest}
      value={str}
      onChange={(e) => {
        const cleaned = normalizeNumericInput(e.target.value || '');
        onChange(cleaned);
      }}
    />
  );
};

export default NumericInput;
