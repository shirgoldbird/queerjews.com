import { h } from 'preact';
import { useState } from 'preact/hooks';

function formatDate(dateStr) {
  const date = new Date(dateStr);
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

  // Get unique locations from the data
  const uniqueLocations = [...new Set(personals.map(p => p.location).filter(Boolean))].sort();

  let filtered = personals.filter((p) => {
    const text = `${p.title || ''} ${p.personal || ''}`.toLowerCase();
    const matchesSearch = !search || text.includes(search.toLowerCase());
    const matchesCategory = !category || (p.category === category || (Array.isArray(p.categories) && p.categories.map(c => c.toLowerCase()).includes(category)));
    const matchesLocation = !location || (p.location && p.location === location);
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
        <div class="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
          <div class="flex-1">
            <label htmlFor="search-input" class="block text-xs font-semibold text-gray-700 mb-1 font-serif">Search</label>
            <input
              type="text"
              id="search-input"
              value={search}
              onInput={e => setSearch(e.target.value)}
              placeholder="Keywords, interests, or topics..."
              class="block w-full border-0 border-b-2 border-gray-300 bg-transparent px-0 py-1 text-base text-gray-900 placeholder-gray-400 focus:border-gray-800 focus:ring-0 font-sans"
            />
          </div>
          <div>
            <label htmlFor="date-filter" class="block text-xs font-semibold text-gray-700 mb-1 font-serif">Sort</label>
            <select
              id="date-filter"
              value={sort}
              onChange={e => setSort(e.target.value)}
              class="block w-full border-0 border-b-2 border-gray-300 bg-transparent px-0 py-1 text-base text-gray-900 focus:border-gray-800 focus:ring-0 font-sans"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          <div>
            <label htmlFor="category-filter" class="block text-xs font-semibold text-gray-700 mb-1 font-serif">Category</label>
            <select
              id="category-filter"
              value={category}
              onChange={e => setCategory(e.target.value)}
              class="block w-full border-0 border-b-2 border-gray-300 bg-transparent px-0 py-1 text-base text-gray-900 focus:border-gray-800 focus:ring-0 font-sans"
            >
              <option value="">All</option>
              <option value="dating">Dating</option>
              <option value="friendship">Friendship</option>
              <option value="community">Community</option>
            </select>
          </div>
          <div>
            <label htmlFor="location-filter" class="block text-xs font-semibold text-gray-700 mb-1 font-serif">Location</label>
            <select
              id="location-filter"
              value={location}
              onChange={e => setLocation(e.target.value)}
              class="block w-full border-0 border-b-2 border-gray-300 bg-transparent px-0 py-1 text-base text-gray-900 focus:border-gray-800 focus:ring-0 font-sans"
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
              class="text-xs text-gray-600 underline bg-transparent border-0 px-0 py-1 hover:text-gray-900 focus:outline-none font-sans"
            >
              Clear
            </button>
          </div>
        </div>
        <div class="flex items-center justify-between mt-2">
          <p class="text-xs text-gray-600 font-sans">
            {filtered.length === personals.length
              ? `Showing all ${personals.length} personals`
              : `Showing ${filtered.length} of ${personals.length} personals`}
          </p>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-12 justify-items-start">
        {filtered.length === 0 && (
          <div class="col-span-2 text-center py-12 text-gray-500">No personals found.</div>
        )}
        {filtered.map(personal => {
          const headline = getHeadline(personal);
          const byline = [personal.location ? personal.location.toUpperCase() : null, formatDate(personal.date_posted)].filter(Boolean).join(' • ');
          return (
            <article class="personal-card" key={personal.id}>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-gray-700 tracking-wide uppercase font-mono">{byline}</span>
              </div>
              <h2 class="font-serif text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight tracking-tight" style="font-family: 'Playfair Display', serif; text-transform: uppercase; letter-spacing: 0.02em;">
                {headline}
              </h2>
              <p class="text-base text-gray-800 leading-relaxed whitespace-pre-wrap font-sans" style="font-family: 'Inter', system-ui, sans-serif;">
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
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="#1a1a1a" stroke-width="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Respond
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
} 