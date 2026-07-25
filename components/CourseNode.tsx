import { Handle, Position } from '@xyflow/react';
import { useState } from 'react';
import { useGraphStore } from '@/store/useGraphStore';

export default function CourseNode({ data }: { data: any }) {
  const addCourse = useGraphStore((state) => state.addCourse);
  const [isLoading, setIsLoading] = useState(false);

  if (data.status === 'unmet') {
    const handleUpgrade = async () => {
      setIsLoading(true);

      addCourse(data.label);
      setIsLoading(false);
    };

    return (
      <div className="bg-white border-2 border-dashed border-gray-400 rounded-lg shadow-sm w-64 p-4 flex flex-col items-center justify-center opacity-70 hover:opacity-100 transition-all">
        <Handle type="target" position={Position.Top} className="opacity-0" isConnectable={false} />
        
        <span className="font-bold text-gray-500 mb-2">{data.label}</span>
        
        <div className = " h-11">{data.name}</div>
        <button 
          onClick={handleUpgrade}
          disabled={isLoading}
          className="bg-blue-100 cursor-pointer text-blue-700 px-4 py-2 rounded-md text-sm font-bold hover:bg-blue-200 transition-colors w-full"
        >
          {isLoading ? "Loading..." : "Add to Schedule"}
        </button>

        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400 border-2 border-white" isConnectable={false} />
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-blue-500 rounded-lg shadow-sm w-64 hover:shadow-md transition-shadow">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500 border-2 border-white" isConnectable={false} />
      
      <div className="bg-blue-50 px-3 py-2 border-b border-blue-100 flex justify-between items-center rounded-t-md">
        <span className="font-bold text-blue-900 tracking-tight">{data.code}</span>
        {data.specialRequirements && data.specialRequirements.length > 0 && (
          <div className="relative group cursor-help">
            <span className="bg-yellow-200 text-yellow-800 text-[10px] font-bold uppercase px-2 py-1 rounded-md border border-yellow-300">
              ⚠️
            </span>
            
            <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-yellow-100 text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
              <ul className="pl-4 space-y-1 text-yellow-800">
                {data.specialRequirements.map((req: string, i: number) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
              <div className="absolute top-full right-3.5 -mt-0.5 border-6 border-transparent border-t-yellow-100"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="text-sm font-bold text-gray-800 leading-tight mb-1.5">{data.name}</h3>
        {data.description && (
          <p className="text-xs text-gray-500 h-14 line-clamp-3">{data.description}</p>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500 border-2 border-white" isConnectable={false} />
    </div>
  );
}