export type TaxonomyType = 'neighborhood' | 'amenity' | 'service' | 'care-type';

export interface Taxonomy {
    id: string;
    type: TaxonomyType;
    name: string;
    slug: string;
    description?: string;
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

export interface BaseEntity {
    id: string;
    title: string;
    slug: string;
    description: string;
    images: string[];
    createdAt: string;
    updatedAt: string;
}

export interface Home extends BaseEntity {
    address: Address;
    price: number;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    taxonomyIds: string[]; // References to Taxonomies
}

export interface Facility extends BaseEntity {
    address: Address;
    licenseNumber: string;
    capacity: number;
    taxonomyIds: string[]; // References to Taxonomies
}

export interface Review {
    id: string;
    authorName: string;
    rating: number; // 1-5
    content: string;
    entityId: string; // ID of the Home or Facility being reviewed
    createdAt: string;
    status: 'pending' | 'approved' | 'rejected';
}

export interface BlogPost extends BaseEntity {
    content: string; // Markdown or HTML
    authorId: string;
    status: 'draft' | 'published' | 'archived';
    publishedAt?: string;
    tags: string[];
}
