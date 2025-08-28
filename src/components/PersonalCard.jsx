import { h } from 'preact';

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getHeadline(personal) {
  if (personal.title) return personal.title;
  const words = personal.personal.split(' ');
  return words.slice(0, 8).join(' ') + (words.length > 8 ? '...' : '');
}

export default function PersonalCard({ 
  personal, 
  variant = 'grid', 
  showLinkIcon = true, 
  showRespondButton = true,
  isHighlighted = false 
}) {
  const locationText = personal.locations.join(', ').toUpperCase();
  const byline = [locationText, formatDate(personal.date_posted)].filter(Boolean).join(' • ');
  const headline = getHeadline(personal);

  // Different styling for detail vs grid variants
  const isDetail = variant === 'detail';
  const titleClass = isDetail 
    ? "font-serif text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6 leading-tight tracking-tight" 
    : "font-serif text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3 leading-tight tracking-tight";
  const bodyClass = isDetail 
    ? "text-lg text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-sans mb-8" 
    : "text-base text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-sans";
  const bylineClass = isDetail 
    ? "text-sm text-gray-700 dark:text-gray-300 tracking-wide uppercase font-mono mb-4" 
    : "text-xs text-gray-700 dark:text-gray-300 tracking-wide uppercase font-mono";

  return (
    <article 
      id={personal.id}
      class={`personal-card ${isHighlighted ? 'highlight-personal' : ''}`}
    >
      <div class="flex items-start justify-between mb-2">
        <span class={bylineClass}>{byline}</span>
        {showLinkIcon && variant === 'grid' && (
          <a
            href={`/personal/${personal.id.replace('personal-', '')}`}
            class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors flex-shrink-0 ml-2"
            title="View details"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
      
      <h2 class={titleClass} style="font-family: 'Playfair Display', serif; text-transform: uppercase; letter-spacing: 0.02em;">
        {headline}
      </h2>
      
      <p class={bodyClass} style="font-family: 'Inter', system-ui, sans-serif;">
        {personal.personal}
      </p>
      
      <div class="personal-bottom-row">
        <div class="flex flex-wrap gap-2">
          {personal.categories.map((cat) => (
            <span class="personal-tag" key={cat}>{cat}</span>
          ))}
        </div>
        {showRespondButton && (
          <a
            href={personal.contact}
            target="_blank"
            rel="noopener noreferrer"
            class="personal-respond"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Respond
          </a>
        )}
      </div>
    </article>
  );
} 