import { h } from 'preact';
import { useState } from 'preact/hooks';

function formatDate(dateStr) {
  // Parse date as local date to avoid timezone issues
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getHeadline(personal) {
  if (personal.title) return personal.title;
  const words = personal.personal.split(' ');
  return words.slice(0, 8).join(' ') + (words.length > 8 ? '...' : '');
}

export default function PersonalsGrid({ personals }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Get unique locations from the data (handle both old single location and new location arrays)
  const allLocations = personals.flatMap(p => {
    if (Array.isArray(p.locations)) {
      return p.locations;
    } else if (p.location) {
      return [p.location]; // Handle legacy single location format
    }
    return [];
  });
  const uniqueLocations = [...new Set(allLocations)].sort();
  
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
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 justify-items-start mb-6">
        {filtered.length === 0 && (
          <div class="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">No personals found.</div>
        )}
        {filtered.map(personal => {
          const headline = getHeadline(personal);
          // Handle both new location arrays and legacy single location
          const locationText = Array.isArray(personal.locations) 
            ? personal.locations.join(', ').toUpperCase()
            : (personal.location ? personal.location.toUpperCase() : null);
          const byline = [locationText, formatDate(personal.date_posted)].filter(Boolean).join(' • ');
          return (
            <article class="personal-card" key={personal.id}>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-gray-700 dark:text-gray-300 tracking-wide uppercase font-mono">{byline}</span>
              </div>
              <h2 class="font-serif text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3 leading-tight tracking-tight" style="font-family: 'Playfair Display', serif; text-transform: uppercase; letter-spacing: 0.02em;">
                {headline}
              </h2>
              <p class="text-base text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-sans" style="font-family: 'Inter', system-ui, sans-serif;">
                {personal.personal}
              </p>
              <div class="personal-bottom-row">
                <div class="flex flex-wrap gap-2">
                  {Array.isArray(personal.categories)
                    ? personal.categories.map((cat) => (
                        <span class="personal-tag" key={cat}>{cat}</span>
                      ))
                    : personal.category && <span class="personal-tag">{personal.category}</span>
                  }
                </div>
                <a
                  href={personal.contact}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="personal-respond"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Respond
                </a>
              </div>
            </article>
          );
        })}
      </div>
      <div class="w-full border-t border-gray-700 my-4"></div>
    </>
  );
} 