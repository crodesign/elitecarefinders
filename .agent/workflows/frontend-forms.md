---
description: Comprehensive UI patterns for page layouts, SlidePanels, forms, and inputs across the admin dashboard.
---

# Admin Frontend Design System

This document outlines the standard UI implementation patterns for the Admin dashboard to ensure consistency across all features (Homes, Users, Posts, etc.).

## 1. Page Layouts & SlidePanels
All major creation/edit forms should use the `<SlidePanel>` component for a consistent slide-out overlay.
- **Props**: Use `fullScreen` for complex forms (Homes, Posts, Facilities), or fixed `width={900}` for moderately complex forms (Users).
- **Action Header Placement (Submit Button & Status Toggles)**: 
  - The main save/submit buttons and Publish Status toggles MUST be grouped together inside the `headerChildren` prop of the `SlidePanel`. 
  - They should be nested inside a flex container that enforces a solid, thick bottom border and aligns items vertically: 
    `<div className="flex justify-end items-center gap-2 px-6 pt-2 pb-3 border-b-[6px]" style={{ borderColor: 'var(--surface-tab-border)' }}>`.
  - The Publish Status toggle group (Published / Draft) should be placed immediately to the left of the primary Submit/Create button.
  - This places the actions directly underneath the title area and provides a clean visual break before the form content begins.
  - **Do NOT** use the `actions` prop of `SlidePanel` for primary form submission or status toggles.

## 2. Form Columns & Sections
Forms inside a `SlidePanel` should use a responsive grid layout.
- **Grid Layout**: `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">`
- **Main Content**: `lg:col-span-2 space-y-6`. Use this for Core Details, Rich Text areas, etc.
- **Sidebar**: `space-y-6` (implicitly `col-span-1`). Use this for Settings, Status toggles, Cover Images.
- **Section Cards**: Inside these columns, wrap logical groups of fields in a card: 
  `<div className="bg-surface-input rounded-lg p-4 space-y-3">`
- **Section Headers**: 
  `<h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pb-1">`
  (Optionally add `border-b border-border` for distinct separation).

## 3. Form Fields & Labels
Most fields should follow a specific "inline row" alignment.
- **Row Container**: 
  `<div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">`
- **Label**: 
  `<label className="text-sm font-medium text-content-secondary whitespace-nowrap">Field Name</label>`
- **Required Indicator**: Include a red dot next to the text for required fields instead of an asterisk: 
  `<span className="h-1.5 w-1.5 rounded-full bg-red-500 ml-1 inline-block"></span>`
- **Standard Input**: 
  `<input className="form-input text-sm text-left w-full h-8 rounded-md px-3 flex-1" />`

## 4. Dropdowns & Selectors
- **Simple Select Dropdowns**: Use `<SimpleSelect>`.
  - Wrapping container: `<div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 rounded-lg transition-all bg-surface-hover">`
  - Label: `<span className="font-medium text-sm text-content-secondary">Field Name</span>`
  - Element: `<SimpleSelect className="w-36 text-sm text-right" />`
- **Complex Dropdowns**: Use custom dropdowns (like `EnhancedSelect`) or carefully styled native-looking dropdowns that match the `<input>` styling.

## 5. Textareas & Rich Text
- **Simple Textarea (Excerpts)**: `<textarea className="form-input text-sm p-3 rounded-lg resize-y min-h-[80px]" />`
- **Rich Content (Articles/Descriptions)**: Use `<RichTextEditor>` instead of standard textareas to allow HTML/Markdown formatting safely.
   - **Example Props**: `minHeight="min-h-[300px]" className="flex-1 bg-surface-input text-content-primary placeholder-content-muted border-none"`

## 6. Checkboxes & Radio Button Equivalents
We generally avoid native HTML radios and checkboxes in favor of styled, clickable `button` rows.

- **Boolean Type (Yes/No/Select)**:
  - Container: `<div className="bg-surface-hover rounded-lg p-3 flex items-center justify-between gap-3">`
  - Button state logic: Use a rounded pill that changes color (e.g. `bg-accent` for Yes/True, `bg-red-500` for No/False, `bg-surface-input` for Select/Undefined).
  - Icon: Embed `<Check>` or `<X>` alongside text.

- **Single Select List (Radio Button alternative)**:
  - Parent Container: Expandable or grouped list.
  - Option Button: `<button className="w-full flex items-center justify-between p-3 rounded-lg text-left transition-all bg-surface-input hover:bg-surface-hover">`
  - Active State Indicator: A faux radio circle `<div className="w-4 h-4 rounded-full flex items-center justify-center border border-accent bg-accent text-white"><div className="w-1.5 h-1.5 rounded-full bg-white" /></div>`
  - Inactive State Indicator: Empty circle with X `<div className="w-4 h-4 rounded-full bg-surface-secondary flex items-center justify-center"><X className="h-2.5 w-2.5 text-content-muted" /></div>`

- **Multiple Select List (Checkbox alternative)**:
  - Option Button: Same as single select, but using rounded squares instead of circles.
  - Active State Indicator: `<div className="w-4 h-4 rounded flex items-center justify-center border border-accent bg-accent"><Check className="h-3 w-3 text-white" /></div>`
  - Inactive State Indicator: `<div className="w-4 h-4 rounded flex items-center justify-center bg-surface-secondary"><X className="h-3 w-3 text-content-muted" /></div>`

## 7. Scrollable Containers (For Lists of Checkboxes/Options)
When presenting a long list of selectable items (features, states, amenities):
- Wrapping container should have a max height and scroll:
  `<div className="space-y-2 max-h-64 overflow-y-auto pr-2">`
- Inner buttons (options) sit stacked inside this container, using the Checkbox style pattern mentioned above. 

## 8. Modals
Modals (`<ConfirmationModal>`, `<ImageCropModal>`, etc) should be used for blocking alerts or sub-tasks that require immediate focus without losing the underlying form state.
- **Overlay**: Ensure they use standard z-indexes (`z-50` or higher) to sit above SlidePanels.
- **Actions**: Provide clear primary (confirm) and secondary (cancel/close) buttons. Secondary actions should generally use subtle styling like `text-content-muted hover:text-content-primary hover:bg-surface-hover`.
