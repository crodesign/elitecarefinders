// Taxonomy represents a category for organizing content (e.g., State, Neighborhood)
export interface Taxonomy {
    id: string;
    singularName: string;
    pluralName: string;
    slug: string;
    // Legacy field for backwards compatibility during migration
    name?: string;
    type?: string;
    // Associated content types
    contentTypes?: string[];
}

export interface Address {
    street: string;
    city: string;
    state: string;
    zip: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
}

export interface VideoEntry {
    url: string;
    caption?: string;
    duration?: string;
    thumbnailUrl?: string;
}

export interface BaseEntity {
    id: string;
    title: string;
    slug: string;
    description: string;
    images: string[];
    teamImages?: string[];
    cuisineImages?: string[];
    videos?: VideoEntry[];
    createdAt: string;
    updatedAt: string;
}

export interface Home extends BaseEntity {
    address: Address;
    displayReferenceNumber?: boolean;
    showAddress?: boolean;
    phone?: string;
    email?: string;
    status: 'published' | 'draft' | 'archived';
    taxonomyEntryIds?: string[]; // IDs of selected entries (e.g. specific cities, care types)
    isFeatured?: boolean;
    hasFeaturedVideo?: boolean;
    isHomeOfMonth?: boolean;
    featuredLabel?: string;
    homeOfMonthDescription?: string;
    roomDetails?: RoomDetails;
}

export interface Facility extends BaseEntity {
    address: Address;
    licenseNumber: string;
    capacity: number;
    taxonomyIds: string[]; // References to Taxonomies
    status: 'published' | 'draft';
}

export interface Review {
    id: string;
    authorName: string;
    rating: number; // 1-5
    content: string;
    entityId: string; // ID of the Home or Facility being reviewed
    createdAt: string;
    status: 'pending' | 'approved' | 'rejected';
    source?: string;
    sourceLink?: string;
    authorPhotoUrl?: string;
    externalId?: string;
    images?: string[];
}

export type PostType = 'caregiver_resources' | 'news_events' | 'recipes' | 'caregiving_for_caregivers' | 'general' | 'resident_resources';

export interface NewsLink {
    text: string;
    url: string;
}

export interface RecipeIngredient {
    amount: string;
    name: string;
}

export interface RecipeInstruction {
    text: string;
    image?: string;
}

export interface PostMetadata {
    // Shared or general metadata
    // For News & Events
    links?: NewsLink[];
    // For Recipes
    ingredients?: (string | RecipeIngredient)[];
    instructions?: (string | RecipeInstruction)[];
    prepTime?: number;
    cookTime?: number;
    yield?: string;
    sourceUrl?: string;
}

export interface Post extends BaseEntity {
    content?: string; // HTML/Markdown
    excerpt?: string;
    featuredImageId?: string;
    featuredImageUrl?: string | null;
    videoUrl?: string | null;
    authorId?: string;
    postType: PostType;
    status: 'draft' | 'published' | 'archived';
    metadata?: PostMetadata;
    publishedAt?: string;
}

// Media Manager Types
export interface MediaFolder {
    id: string;
    name: string;
    slug: string;
    parentId?: string;
    path: string;
    stateId?: string; // Reference to state taxonomy entry
    children?: MediaFolder[];
    itemCount?: number;
    displayOrder?: number;
    isSeparatorBefore?: boolean;
    createdAt: string;
}

export interface MediaItem {
    id: string;
    folderId?: string;
    filename: string;
    originalFilename: string;
    title?: string;
    altText?: string;
    caption?: string;
    description?: string;
    mimeType: string;
    fileSize: number;
    width?: number;
    height?: number;
    storagePath: string;
    url: string;
    urlLarge?: string;
    urlMedium?: string;
    urlThumb?: string;
    createdAt: string;
    updatedAt: string;
}

// Room Field Types
export interface RoomFieldCategory {
    id: string;
    name: string;
    slug: string;
    displayOrder: number;
    section: 'room_details' | 'location_details' | 'care_provider_details';
    columnNumber: number;
    icon?: string;
    createdAt: string;
}

export interface RoomFieldDefinition {
    id: string;
    name: string;
    slug: string;
    type: 'boolean' | 'single' | 'multi' | 'text' | 'textarea' | 'number' | 'currency' | 'phone' | 'email' | 'dropdown';
    targetType: 'home' | 'facility' | 'both';
    options?: string[];
    categoryId: string;
    displayOrder: number;
    isActive: boolean;
    createdAt: string;
}

export type FixedFieldType = 'bedroom' | 'bathroom' | 'shower' | 'roomType' | 'levelOfCare' | 'language';

export interface RoomFixedFieldOption {
    id: string;
    fieldType: FixedFieldType;
    value: string;
    displayOrder: number;
    isActive: boolean;
    icon?: string;
}

export interface RoomDetails {
    roomPrice?: number;
    bedroomType?: string;
    bedroomTypes?: string[];
    bathroomType?: string;
    showerType?: string;
    roomTypes?: string[];
    levelOfCare?: string[];
    languages?: string[];
    customFields: {
        [fieldId: string]: boolean | string | string[];
    };
}

