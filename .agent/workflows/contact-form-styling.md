---
description: Styling rules for contact form sections (ContactInfoSection, ResidentInfoSection, HousingPreferencesSection)
---

# Contact Form Styling Rules

All fields within the contact form sections should follow these consistent styling patterns:

## Field Row Containers (label + input inline)
Use the inline label+input row layout:
```
<div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
  <label className="text-sm font-medium text-white/80 whitespace-nowrap">Label</label>
  <input className="bg-black/30 border-transparent text-white text-sm text-left placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 focus:outline-none transition-colors w-48 h-8 rounded-md px-3" />
</div>
```

## Checkbox Rows
```
<div className="w-full flex items-center justify-between p-3 rounded-lg border bg-white/10 border-transparent transition-all hover:bg-white/15">
```

## Select/Dropdown Triggers
```
<SelectTrigger className="bg-white/10 border-transparent text-white placeholder-zinc-500 hover:bg-white/15 focus:ring-0">
```

## SimpleSelect Dropdowns
```
<SimpleSelect className="w-36 text-sm text-left" />
```

## Textareas
```
<Textarea className="bg-white/10 border-transparent text-white placeholder-zinc-500 hover:bg-white/15 focus:bg-white/15 focus:ring-0 focus:border-white/10 transition-colors resize-none" />
```

## Key Rules
1. **Row backgrounds**: Use `bg-white/10` (NOT `bg-black/20`) for field row containers
2. **Hover states**: Use `hover:bg-white/15` (NOT `hover:bg-black/40`)
3. **Inner input backgrounds**: Use `bg-black/30` with `hover:bg-black/50` and `focus:bg-black/50` for the actual input elements inside row containers
4. **Text alignment**: Always `text-left` for inputs and dropdowns
5. **Section containers**: Use `bg-white/5 rounded-lg p-4 space-y-3` for outer section wrappers
6. **Labels**: Use `text-sm font-medium text-white/80 whitespace-nowrap`
