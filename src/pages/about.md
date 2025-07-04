---
layout: ../layouts/Layout.astro
title: "About - Queer Jewish Personals"
description: "Learn about our community guidelines and how Queer Jewish Personals works to create meaningful connections."
---

import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import ContentCard from '../components/ContentCard.astro';
import CTAButton from '../components/CTAButton.astro';

<Header />

<main class="min-h-screen bg-gray-50">
  <section class="py-8">
    <div class="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <ContentCard title="About Queer Jewish Personals">
        Welcome to Queer Jewish Personals, a community space for LGBTQ+ Jews to connect, build relationships, and find meaningful connections within our vibrant community.

        ## Our Mission

        We believe that queer Jewish people deserve safe, welcoming spaces to find friendship, love, and community. This platform celebrates the intersection of queer and Jewish identities, providing a respectful environment for authentic connections.

        ## Community Guidelines

        - Be respectful and kind to all community members
        - Honor the diversity of Jewish practice and identity
        - Respect boundaries and consent in all interactions
        - Report any concerning behavior to help maintain a safe space
        - Celebrate the beautiful intersection of queer and Jewish life

        ## Privacy & Safety

        Your privacy and safety are our top priorities. We encourage you to:

        - Meet in public places for first-time encounters
        - Trust your instincts and take your time getting to know people
        - Use the contact information provided responsibly
        - Report any inappropriate behavior immediately

        ## Get Involved

        Have a personal to share? We'd love to hear from you! Submit your personal through our submission form, and help grow this community space for queer Jewish connections.

        <CTAButton href="/submit" text="Submit a Personal" />
      </ContentCard>
    </div>
  </section>
</main>

<Footer /> 