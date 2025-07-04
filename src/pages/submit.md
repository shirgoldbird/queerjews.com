---
layout: ../layouts/Layout.astro
title: "Submit a Personal - Queer Jewish Personals"
description: "Submit your personal ad to connect with the queer Jewish community."
---

import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import ContentCard from '../components/ContentCard.astro';
import GoogleFormEmbed from '../components/GoogleFormEmbed.astro';

<Header />

<main class="min-h-screen bg-gray-50">
  <section class="py-8">
    <div class="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <ContentCard title="Submit a Personal">
        Submit your personal using the form below. You can also [click here](https://forms.gle/GQVZVUGYQDMdUSTH8) to open the form in a new tab.

        Questions or issues? Reach out to Shir: [shadchan@queerjews.com](mailto:shadchan@queerjews.com).

        <GoogleFormEmbed formId="1FAIpQLScbgS0JX0MtfGMkc26ki24_u-OqUwBmcItwMFh5_-ma9SEOyA" />
      </ContentCard>
    </div>
  </section>
</main>

<Footer /> 