'use client';

import EntitySelect from '@/components/EntitySelect';

export interface ProcessTypeOption {
  id: number;
  name: string;
  stage: 'CUTTING' | 'SARIN_MEASUREMENT' | 'POLISHING' | 'READY_INVENTORY' | 'SOLD';
  sequence: number;
}

interface ProcessTypeSelectProps {
  value: ProcessTypeOption | null;
  onChange: (value: ProcessTypeOption | null) => void;
  label?: string;
  required?: boolean;
}

export default function ProcessTypeSelect({
  value,
  onChange,
  label = 'Process Type',
  required = false,
}: ProcessTypeSelectProps) {
  return (
    <EntitySelect<ProcessTypeOption>
      value={value}
      onChange={onChange}
      label={label}
      required={required}
      searchEndpoint="/api/search/process-types"
      placeholder="Search process type by name..."
      minChars={0}
      getMeta={(item) => [
        `Stage: ${item.stage}`,
        `Sequence: ${item.sequence}`,
      ]}
      emptyMessage="No active process types found"
    />
  );
}
