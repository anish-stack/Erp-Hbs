'use client';

import { useEffect, useState } from 'react';
import Select from 'react-select';

import { cn } from '@/lib/utils';

export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  isClearable = true,
  isDisabled = false,
  isMulti = false,
  className,
}) {
  const [inputValue, setInputValue] = useState('');

  const selected = isMulti
    ? options.filter((option) =>
        Array.isArray(value) ? value.includes(option.value) : false
      )
    : options.find((option) => option.value === value) || null;

  useEffect(() => {
    setInputValue('');
  }, [value]);

  const handleChange = (selectedOption) => {
    if (isMulti) {
      const values = selectedOption
        ? selectedOption.map((option) => option.value)
        : [];

      onChange(values);
      return;
    }

    onChange(selectedOption ? selectedOption.value : '');
  };

  const handleInputChange = (newValue, actionMeta) => {
    if (
      actionMeta.action === 'input-change' ||
      actionMeta.action === 'set-value'
    ) {
      setInputValue(newValue);
    }

    if (actionMeta.action === 'menu-close') {
      setInputValue('');
    }

    return newValue;
  };

  const handleMenuOpen = () => {
    setInputValue('');
  };

  return (
    <Select
      className={cn('text-sm', className)}
      classNamePrefix="rs"
      options={options}
      value={selected}
      onChange={handleChange}
      placeholder={placeholder}
      isClearable={isClearable}
      isDisabled={isDisabled}
      isMulti={isMulti}
      isSearchable
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onMenuOpen={handleMenuOpen}
      unstyled

      /* IMPORTANT */
      menuPortalTarget={
        typeof document !== 'undefined' ? document.body : null
      }
      menuPosition="fixed"

      styles={{
        menuPortal: (base) => ({
          ...base,
          zIndex: 9999,
        }),
      }}

      classNames={{
        control: (state) =>
          cn(
            'flex min-h-9 w-full items-center rounded-md border border-input bg-card px-1 text-sm shadow-sm',
            state.isFocused && 'ring-2 ring-ring outline-none',
            isMulti && 'py-0.5'
          ),

        valueContainer: () => 'px-1 gap-1',

        placeholder: () => 'text-muted-foreground px-2',

        input: () => 'px-2',

        singleValue: () => 'px-2',

        multiValue: () =>
          'rounded bg-accent text-accent-foreground',

        multiValueLabel: () =>
          'px-2 py-0.5 text-xs',

        multiValueRemove: () =>
          'px-1 hover:bg-destructive hover:text-destructive-foreground',

        indicatorSeparator: () => 'hidden',

        dropdownIndicator: () =>
          'text-muted-foreground px-2',

        clearIndicator: () =>
          'text-muted-foreground px-1 hover:text-foreground cursor-pointer',

        menu: () =>
          'mt-1 rounded-md border border-border bg-popover text-popover-foreground shadow-md overflow-hidden',

        menuList: () =>
          'p-1 max-h-60 overflow-y-auto',

        option: (state) =>
          cn(
            'rounded-sm px-2 py-1.5 text-sm cursor-pointer',
            state.isFocused &&
              'bg-accent text-accent-foreground',
            state.isSelected &&
              'bg-accent text-accent-foreground font-medium'
          ),

        noOptionsMessage: () =>
          'text-muted-foreground px-2 py-2 text-sm',
      }}
    />
  );
}
