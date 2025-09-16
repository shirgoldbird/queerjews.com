import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import PersonalCard from './PersonalCard.jsx';

// Function to get URL parameters
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Function to update URL without query parameters (except personal for deep linking)
function updateUrlWithoutQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const personalId = urlParams.get('personal');
  
  // Only update URL if there are other query parameters besides 'personal'
  const hasOtherParams = Array.from(urlParams.keys()).some(key => key !== 'personal');
  
  if (hasOtherParams) {
    // Remove 'personal-' prefix from URL parameter for consistency
    const cleanPersonalId = personalId ? personalId.replace('personal-', '') : null;
    const newUrl = cleanPersonalId ? `/?personal=${cleanPersonalId}` : '/';
    
    // Only update if the URL would actually change
    const currentUrl = window.location.pathname + window.location.search;
    if (currentUrl !== newUrl) {
      window.history.replaceState({}, '', newUrl);
    }
  }
}

// Function to scroll to element with smooth animation
function scrollToElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    // Add highlight effect
    element.classList.add('highlight-personal');
    setTimeout(() => {
      element.classList.remove('highlight-personal');
    }, 3000);
  }
}

export default function PersonalsGrid({ personals }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [locationMessageDismissed, setLocationMessageDismissed] = useState(false);
  const [highlightedPersonal, setHighlightedPersonal] = useState(null);

  // Check if location message was previously dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('locationMessageDismissed');
    if (dismissed === 'true') {
      setLocationMessageDismissed(true);
    }
  }, []);

  // Handle deep linking to specific personal
  useEffect(() => {
    const personalIdParam = getUrlParameter('personal');
    if (personalIdParam) {
      // Add 'personal-' prefix if it's not already there for consistency with the data
      const personalId = personalIdParam.startsWith('personal-') ? personalIdParam : `personal-${personalIdParam}`;
      setHighlightedPersonal(personalId);
      // Scroll to the personal after a short delay to ensure DOM is ready
      setTimeout(() => {
        scrollToElement(personalId);
      }, 100);
    }
  }, []);

  // Update URL when filters change (remove query params except personal)
  useEffect(() => {
    updateUrlWithoutQueryParams();
  }, [search, sort, category, location]);

  const dismissLocationMessage = () => {
    setLocationMessageDismissed(true);
    localStorage.setItem('locationMessageDismissed', 'true');
  };

  // Get unique locations from the data (handle both old single location and new location arrays)
  const allLocations = personals.flatMap(p => {
    if (Array.isArray(p.locations)) {
      return p.locations;
    } else if (p.location) {
      return [p.location]; // Handle legacy single location format
    }
    return [];
  });
  
  // Custom sort order for locations - popular locations first, then alphabetical
  const locationSortOrder = [
    'New York City',
    'Washington DC',
    'Seattle',
    'Portland',
    'Israel',
    'Diaspora',
    'Online'
  ];
  
  const uniqueLocations = [...new Set(allLocations)].sort((a, b) => {
    const aIndex = locationSortOrder.indexOf(a);
    const bIndex = locationSortOrder.indexOf(b);
    
    // If both locations are in the sort order, sort by their position
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only one location is in the sort order
    if (aIndex !== -1) {
      // If b is one of the broad categories (Israel, Diaspora, Online), a comes first
      if (['Israel', 'Diaspora', 'Online'].includes(b)) {
        return -1;
      }
      // Otherwise, a (in sort order) comes before b (not in sort order)
      return -1;
    }
    if (bIndex !== -1) {
      // If a is one of the broad categories (Israel, Diaspora, Online), b comes first
      if (['Israel', 'Diaspora', 'Online'].includes(a)) {
        return 1;
      }
      // Otherwise, b (in sort order) comes before a (not in sort order)
      return 1;
    }
    
    // If neither location is in the sort order, sort alphabetically
    return a.localeCompare(b);
  });
  
  // Get unique categories from the data
  const allCategories = personals.flatMap(p => 
    Array.isArray(p.categories) ? p.categories : (p.category ? [p.category] : [])
  );
  const uniqueCategories = [...new Set(allCategories)].sort();

  let filtered = personals.filter((p) => {
    const text = `${p.title || ''} ${p.personal || ''}`.toLowerCase();
    const matchesSearch = !search || text.includes(search.toLowerCase());
    const matchesCategory = !category || (p.category === category || (Array.isArray(p.categories) && p.categories.includes(category)));
    const matchesLocation = !location || (
      (Array.isArray(p.locations) && p.locations.includes(location)) ||
      (p.location && p.location === location) // Handle legacy single location format
    );
    return matchesSearch && matchesCategory && matchesLocation;
  });

  filtered.sort((a, b) => {
    const dateA = new Date(a.date_posted).getTime();
    const dateB = new Date(b.date_posted).getTime();
    return sort === 'newest' ? dateB - dateA : dateA - dateB;
  });

  return (
    <>
      <div class="mb-6">
        {/* Mobile filter toggle */}
        <div class="md:hidden flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setFiltersVisible(!filtersVisible)}
            class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 font-sans"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
            </svg>
            Filters {filtersVisible ? '(Hide)' : '(Show)'}
          </button>
          <p class="text-xs text-gray-600 dark:text-gray-400 font-sans">
            {filtered.length === personals.length
              ? `${personals.length} personals`
              : `${filtered.length} of ${personals.length} personals`}
          </p>
        </div>

        {/* Filter controls - hidden on mobile when collapsed */}
        <div class={`${filtersVisible ? 'block' : 'hidden'} md:block`}>
          <div class="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
            <div class="flex-1">
              <label htmlFor="search-input" class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 font-serif">Search</label>
              <input
                type="text"
                id="search-input"
                value={search}
                onInput={e => setSearch(e.target.value)}
                placeholder="Keywords, interests, or topics..."
                class="block w-full border-0 border-b-2 border-gray-300 dark:border-gray-600 bg-transparent px-0 py-1 text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-gray-800 dark:focus:border-gray-400 focus:ring-0 font-sans"
              />
            </div>
            <div>
              <label htmlFor="date-filter" class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 font-serif">Sort</label>
              <select
                id="date-filter"
                value={sort}
                onChange={e => setSort(e.target.value)}
                class="block w-full border-0 border-b-2 border-gray-300 dark:border-gray-600 bg-transparent px-0 py-1 text-base text-gray-900 dark:text-gray-100 focus:border-gray-800 dark:focus:border-gray-400 focus:ring-0 font-sans"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
            <div>
              <label htmlFor="category-filter" class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 font-serif">Category</label>
              <select
                id="category-filter"
                value={category}
                onChange={e => setCategory(e.target.value)}
                class="block w-full border-0 border-b-2 border-gray-300 dark:border-gray-600 bg-transparent px-0 py-1 text-base text-gray-900 dark:text-gray-100 focus:border-gray-800 dark:focus:border-gray-400 focus:ring-0 font-sans"
              >
                <option value="">All</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="location-filter" class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 font-serif">Location</label>
              <select
                id="location-filter"
                value={location}
                onChange={e => setLocation(e.target.value)}
                class="block w-full border-0 border-b-2 border-gray-300 dark:border-gray-600 bg-transparent px-0 py-1 text-base text-gray-900 dark:text-gray-100 focus:border-gray-800 dark:focus:border-gray-400 focus:ring-0 font-sans"
              >
                <option value="">All</option>
                {uniqueLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div class="flex items-end">
              <button
                type="button"
                onClick={() => { setSearch(''); setSort('newest'); setCategory(''); setLocation(''); }}
                class="text-xs text-gray-600 dark:text-gray-400 underline bg-transparent border-0 px-0 py-1 hover:text-gray-900 dark:hover:text-gray-200 focus:outline-none font-sans"
              >
                Clear
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between mt-2">
            <p class="text-xs text-gray-600 dark:text-gray-400 font-sans md:block hidden">
              {filtered.length === personals.length
                ? `Showing all ${personals.length} personals`
                : `Showing ${filtered.length} of ${personals.length} personals`}
            </p>
          </div>
        </div>
      </div>
      
      {/* Location encouragement message */}
      {!locationMessageDismissed && (
        <div class="mb-6">
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 relative">
            <button
              onClick={dismissLocationMessage}
              class="absolute top-1/2 right-2 transform -translate-y-1/2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
              aria-label="Dismiss message"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <p class="text-sm text-blue-800 dark:text-blue-200 pr-6">
              Don't see your location? Nobody has submitted a personal for it yet. <a href="/submit" class="font-semibold underline hover:text-blue-600 dark:hover:text-blue-300">Be the first!</a>
            </p>
          </div>
        </div>
      )}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 justify-items-start mb-6">
        {filtered.length === 0 && (
          <div class="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">No personals found.</div>
        )}
        {filtered.map(personal => {
          const isHighlighted = highlightedPersonal === personal.id;
          
          return (
            <PersonalCard
              key={personal.id}
              personal={personal}
              variant="grid"
              showLinkIcon={true}
              showRespondButton={true}
              isHighlighted={isHighlighted}
            />
          );
        })}
      </div>
      <div class="w-full border-t border-gray-700 my-4"></div>
    </>
  );
} 