import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = ''
}) => {
  return (
    <div className={`flex border-b border-outline-variant/30 overflow-x-auto scrollbar-none gap-2 ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-4 border-b-2 font-label-md text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer
              ${isActive 
                ? 'border-primary text-primary font-bold' 
                : 'border-transparent text-on-surface-variant hover:text-primary hover:border-outline-variant'
              }
            `}
          >
            {tab.icon && <span className="inline-flex">{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
