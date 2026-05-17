# Structured CV Builder: Treating a CV as a System, Not a Document

## Why this project exists

Most CV tools still treat a CV as a single blob of formatted text.

That works until the moment you need to tailor it seriously.

The usual workflow is painful:

- duplicate the file
- edit bullets manually
- remove a project for one role
- bring it back for another
- try not to break the layout
- export again and hope the page still fits

This project starts from a different assumption:

> a CV is not one document, it is a structured content system plus a rendering system

That shift changes everything.

Instead of editing one final document over and over, the application keeps:

- one master CV with all content
- multiple CV versions for specific applications
- one rendering pipeline that turns structured content into a polished output

## The core product idea

The application separates three concerns that are usually tangled together:

1. Content  
   Everything the user has ever written about their experience, projects, education, skills, and summary.

2. Selection  
   Which parts of that content appear in a specific CV version, in what order, and with which bullets visible.

3. Rendering  
   How that selected content is laid out on the page and exported.

That means a user can maintain a deep master profile without turning every application into a manual rewriting job.

## What makes it different from a text editor

This is not trying to become a rich-text document editor with formatting controls everywhere.

The user is not dragging arbitrary text blocks around a blank page.

Instead, they are working inside a fixed, intentional CV structure:

- personal info
- summary
- education
- experience
- projects
- skills

Each section has a defined place in the template, and the user decides what to surface inside that slot.

That makes the system better suited to:

- targeted application tailoring
- one-page enforcement
- predictable layout
- future automation and AI assistance

## The editing model

The workflow is built around one master source and many tailored outputs.

The user writes and maintains:

- all experience entries
- all project entries
- all education entries
- all skill groups
- all bullet points

Then, per CV version, the user chooses:

- which sections are enabled
- which items appear
- which bullets are visible
- the order of sections
- the order of visible items inside each section

That means a projects section can contain a larger pool of predefined projects, while a given version only shows the subset relevant to a particular role.

## Why fixed layout matters

A normal document editor gives freedom, but it also creates fragility.

This project deliberately chooses a stronger layout model:

- one page
- fixed section slots
- controlled typography
- render-driven output

That lets the app reason about fit, overflow, and presentation in a reliable way.

The goal is not generic page design.

The goal is a CV that stays sharp under constant reuse.

## Why a hybrid preview matters

Pure HTML preview is fast but not always authoritative.

Pure LaTeX output is typographically strong but too slow and awkward for direct editing.

So the application uses a hybrid model:

- HTML for live editing and immediate visual feedback
- LaTeX/PDF for final preview and export quality

That gives the user a responsive editor without giving up the value of a stronger final rendering path.

## The bigger direction

Once a CV is modeled as structured data instead of a document blob, the future options become much more interesting:

- branch new versions instantly
- compare role-specific CV variants
- suggest bullet substitutions automatically
- optimize fit intelligently
- support multiple document templates later
- export to both browser and print-quality backends

The long-term value of the project is not just “another CV app.”

It is a clean foundation for managing professional narrative as reusable structured content.

## Closing thought

A CV is one of the few documents people rewrite again and again while pretending it is still the same document.

It usually is not.

This application is built around that reality.

The point is not to make editing prettier.

The point is to make tailoring, consistency, and layout control feel like first-class capabilities from the start.
