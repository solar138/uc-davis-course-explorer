"use client"

import { useGraphStore } from '@/store/useGraphStore';
import { useState, useEffect, SetStateAction, Dispatch } from 'react';
import { searchCourses } from '@/app/actions/searchCourses';
import { redirect } from 'next/navigation';
import Collapsible from './Collapsible';
import { Course, Prisma, School } from '@prisma/client';

const isDev = process.env.NODE_ENV === 'development';


export default function SearchSidebar({ setSelectedCourse, school } : { setSelectedCourse? : Dispatch<SetStateAction<string>> | undefined, school : School }) {
  const [searchTerm, setSearchTerm] = useState(isDev ? "MAT 021" : "");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const filterStates : boolean[] = [];
  const setInspectedCourse = useGraphStore((state) => state.setInspectedCourse);
  const setSchool = useGraphStore((state) => state.setSchool);
  setSchool(school.name);

  function FilterList(title: string, filters: string[], where : Record<string, boolean>,col: boolean = false) {
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

  const filters = {};
  const collapsible = 

    <div className=" border rounded p-2 border-gray-300 bg-gray-50">
      <Collapsible title={
          <span className="text-lg">Filters</span>
        }>
        <div className="flex flex-col">
          <h2 className="font-bold">General Education</h2>
          {FilterList("Topical Breadth:", ['Soc Sci', 'Sci Eng', 'Arts & Hum'], filters)}
          {FilterList("Core Literacies:", ['American CGH', 'Domestic Div', 'Oral Lit', 'Quantitative Lit', 'Scientific Lit', 'Visual Lit', 'World Cultures', 'Writing Exp'], filters)}
          <h2 className="font-bold">Units</h2>
          {FilterList("", ['0-2', '3', '4', '5+'], filters)}
          <h2 className="font-bold">Course Level</h2>
          {FilterList("", ['000-099 Lower', '100-199 Upper', '200+ Graduate'], filters, true)}
        </div>
      </Collapsible>
    </div>

  const query = constructQuery(searchTerm, filters, school.name);

  // Debounce user input
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2 || Object.values(filters).some(x => x)) { // Only search if they have entered at least 2 characters or selected a filter
        setIsSearching(true);

        const res = await searchCourses(query);
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
        
        const response = await searchCourses(query, results.length);
        
        setResults((prev) => [...prev, ...response.data]);
        setHasMore(response.hasMore);
        
        setIsLoadingMore(false);
      }
    }
  };

  return (
    <div className="w-80 h-full border-r border-gray-200 bg-white p-4 flex flex-col gap-1">
      <h2 className="font-bold text-xl">Course Catalog</h2>
      
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
          
          {results.map((course) => (
            <button 
              key={course.id}
              onClick={setSelectedCourse ? () => setSelectedCourse(course.slug) : () => setInspectedCourse(course)}
              className="text-left p-2 rounded hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <div className="font-bold">{course.code} - {course.name}</div>
              <div className="text-sm text-gray-600 wrap">{course.shortDesc}</div>
            </button>
          ))}
          
          {results.length === 0 && searchTerm.length >= 2 && !isSearching && (
            <p className="text-gray-400 text-sm">No courses found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function constructQuery(searchTerm: string, filters: Record<string, boolean>, school: string) {
  const topicalBreadth = { SS: filters['Soc Sci'], SE: filters['Sci Eng'], AH: filters['Arts & Hum'] };
  const coreLiteracies = { ACGH: filters['American CGH'], DD: filters['Domestic Div'], OL: filters['Oral Lit'], QL: filters['Quantitative Lit'], SL: filters['Scientific Lit'], VL: filters['Visual Lit'], WC: filters['World Cultures'], WE: filters['Writing Exp'] };
  const units = { "0-2": filters['0-2'], "3": filters['3'], "4": filters['4'], "5+": filters['5+'] };
  const courseLevel = { "000-099": filters['000-099 Lower'], "100-199": filters['100-199 Upper'], "200+": filters['200+ Graduate'] };

  const queries : any[] = [];

  for (const genEd in topicalBreadth) { 
    if ((topicalBreadth as Record<string, boolean>)[genEd]) {
      queries.push({ generalEducation: { path: ['topicalBreadth'], array_contains: genEd }});
    }
  }

  for (const genEd in coreLiteracies) { 
    if ((coreLiteracies as Record<string, boolean>)[genEd]) {
      queries.push({ generalEducation: { path: ['coreLiteracies'], array_contains: genEd }});
    }
  }

  if (Object.values(units).some(x => x)) {

  }

  return queries.length > 0 ? {
    AND: [
      { OR: [
        { slug: { contains: searchTerm.replace(/\s/g, '').toUpperCase() } },
        { name: { contains: searchTerm, mode: "insensitive" } },
      ] },
      { schoolName: school },
      ...queries
    ]
  } : {
    OR: [
      { slug: { contains: searchTerm.replace(/\s/g, '').toUpperCase() } },
      { name: { contains: searchTerm, mode: "insensitive" } },
    ],
    AND: [
      { schoolName: school }
    ]
  };
}
