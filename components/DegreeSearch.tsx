"use client"
import { useState, useEffect, SetStateAction, Dispatch } from 'react';
import { searchDegrees } from '@/app/actions/searchDegrees';
import Collapsible from './Collapsible';
import usedegreeStore from '@/store/useDegreeStore';
import { School } from '@prisma/client';

const isDev = process.env.NODE_ENV === 'development';


export default function SearchSidebar({school} : {school : School}) {
  const [searchTerm, setSearchTerm] = useState(isDev ? "Aerospace Engineering" : "");
  const [results, setResults] = useState<{name: string, type: string, code: string, shortName: string | null}[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const filterStates : boolean[] = [];
  const setInspectedDegree = usedegreeStore((state) => state.setInspectedDegree);

  function FilterList(title: string, filters: string[], where : Record<string, boolean>, col: boolean = false) {
    return (
      <div >
        {title.length > 0 ? <h2>{title}</h2> : null }
        <div className={"ml-4 flex flex-wrap gap-2 gap-y-0" + (col ? " flex-col" : "")}>
        {filters.map(x => {
          const [filter, setFilter] = useState(false);
          filterStates.push(filter);
          where[x] = filter;
          return <label key={x}><input type="checkbox" className="mr-0.5" onChange={(e) => { setFilter(e.target.checked); }} checked={filter}/>{x}</label>
        })}
        </div>
      </div>
    );
  }

  const filters : Record<string, boolean> = {};
  const collapsible = 

    <div className=" border rounded p-2 border-gray-300 bg-gray-50">
      <Collapsible title={
          <span className="text-lg">Filters</span>
        }>
        <div className="flex flex-col">
          {FilterList("Level:", ['Bachelors', 'Masters', 'PhD', 'Minor'], filters)}
          {FilterList("degree Subject Area:", ['Art', 'Science', 'Engineering'], filters)}
        </div>
      </Collapsible>
    </div>

  const query = constructQuery(searchTerm, filters, school.name);

  // Debounce user input
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2 || Object.values(filters).some(x => x)) { // Only search if they have entered at least 2 characters or selected a filter
        setIsSearching(true);

        const res = await searchDegrees(query);
        setResults(res.data);
        setHasMore(res.hasMore);
        setIsSearching(false);
      } else {
        setResults([]); // Clear results if input is empty
        setHasMore(false);
      }
    }, 200); // Wait for after they stop typing

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, ...filterStates]);

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;

    // If we are within 100px of the bottom, AND there are more to load, AND we aren't already loading...
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (hasMore && !isLoadingMore && !isSearching) {
        setIsLoadingMore(true);
        
        const response = await searchDegrees(query, results.length);
        
        setResults((prev) => [...prev, ...response.data]);
        setHasMore(response.hasMore);
        
        setIsLoadingMore(false);
      }
    }
  };

  const numLevelFilters = +filters["Bachelors"] + +filters["Masters"] + +filters["PhD"] + +filters["Minor"];

  return (
    <div className="w-80 h-full border-r border-gray-200 bg-white p-4 flex flex-col gap-1">
      <h2 className="font-bold text-xl">degree Catalog</h2>
      
      <input
        type="text"
        placeholder="Search MAT 021A or Calculus..."
        className="border p-2 rounded w-full border-gray-400"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {collapsible}

      <div onScroll={handleScroll} className="overflow-y-auto border rounded p-2 border-gray-300 bg-gray-50">
        <h2 className="text-lg"> Results</h2>

        <div className="overflow-y-auto flex-1 flex flex-col gap-0.5">
          {isSearching && <p className="text-gray-400 text-sm">Searching...</p>}
          
          {results.map((degree) => (
            <button 
              key={degree.code}
              onClick={() => setInspectedDegree(degree.code)}
              className="text-left p-2 rounded hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <div className="font-bold">
                {numLevelFilters == 1 ? "" : (degreeTypes[degree.type] ?? degree.type) + " in "}{degree.shortName}</div>
              <div>{degree.name}</div>
            </button>
          ))}
          
          {results.length === 0 && searchTerm.length >= 2 && !isSearching && (
            <p className="text-gray-400 text-sm">No degrees found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function constructQuery(searchTerm: string, filters: Record<string, boolean>, school: string) {
  const words = searchTerm.split(" ");
  console.log(filters);
  const typeQuery : any[] = [];
  if (filters["Bachelors"])
    typeQuery.push("bachelor")
  if (filters["Masters"])
    typeQuery.push("master")
  if (filters["PhD"])
    typeQuery.push("phd")
  if (filters["Art"])
    typeQuery.push("art")
  if (filters["Science"])
    typeQuery.push("sci")
  if (filters["Engineering"])
    typeQuery.push("eng")
  if (filters["Minor"])
    typeQuery.push("minor")
  return {
    OR: typeQuery.length == 0 ? undefined : [...typeQuery.map(type => ({ type: { contains: type } }))],
    AND: [...words.map(word => ({ code: { contains: word.toLowerCase() } })), {school: school}]
  }
}

const degreeTypes : Record<string, string> = {
  "bachelor-sci": "BS",
  "master-sci": "MS",
  "phd": "PhD",
  "bachelor-art": "BA",
  "master-art": "MA",
  "bachelor-eng": "BEng",
  "master-eng": "MEng",
  "minor": "Minor",
  "designated-emphasis": "DE"
}