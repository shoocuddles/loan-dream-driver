
import { Checkbox } from '@/components/ui/checkbox';

interface SelectionHeaderProps {
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: (checked: boolean) => void;
}

export const SelectionHeader = ({ 
  allSelected, 
  someSelected, 
  onSelectAll 
}: SelectionHeaderProps) => {
  return (
    <div className="px-4 py-2 border-b">
      <Checkbox 
        checked={allSelected}
        className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
        onCheckedChange={(checked) => onSelectAll(!!checked)}
        aria-label="Select all applications"
      />
    </div>
  );
};
