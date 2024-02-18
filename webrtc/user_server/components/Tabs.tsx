// components/Tabs.js

import { useState } from 'react';

import IconComponent from './TabIcon';

import ToggleBeacon from './ToggleBeacon';

export default function Tabs() {
  const [activeTab, setActiveTab] = useState('tab2');

  return (
    <div>   
        <div className="p-4">
        {activeTab === 'tab1' && <div>Content for Tab 1</div>}
        {activeTab === 'tab2' && <ToggleBeacon/>}
        {activeTab === 'tab3' && <div>Content for Tab 3</div>}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-50 bg-white shadow-lg px-40">
            <div className="flex justify-around items-center h-16" role="tablist">
                {['tab1', 'tab2', 'tab3'].map((tab, index) => (
                <button
                    key={tab}
                    className={`flex items-center justify-center flex-1 py-2 px-4 text-sm font-medium leading-5 text-blue-700 rounded-lg
                    ${activeTab === tab ? 'bg-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}
                    onClick={() => setActiveTab(tab)}
                >
                    <IconComponent iconName={tab} />
                </button>
                ))}
            </div>
        </div>

    </div>
  );
}