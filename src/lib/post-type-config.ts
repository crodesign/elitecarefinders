export interface PostTypeConfig {
    postType: string;         // DB value (underscore)
    slug: string;             // URL slug (hyphenated)
    label: string;
    description: string;
    icon: string;             // FontAwesome icon name for reference
}

export const POST_TYPE_CONFIG: PostTypeConfig[] = [
    {
        postType: 'caregiver_resources',
        slug: 'caregiver-resources',
        label: 'Caregiver Resources',
        description: 'Tips and guidance for family caregivers navigating senior care.',
        icon: 'faHandsHolding',
    },
    {
        postType: 'resident_resources',
        slug: 'resident-resources',
        label: 'Resident Resources',
        description: 'Helpful information and tools for senior living residents and their families.',
        icon: 'faUsers',
    },
    {
        postType: 'caregiving_for_caregivers',
        slug: 'caregiving-for-caregivers',
        label: 'Caregiving for Caregivers',
        description: 'Self-care and support resources for those who care for others.',
        icon: 'faHeart',
    },
    {
        postType: 'news_events',
        slug: 'news-events',
        label: 'News & Events',
        description: 'Community updates, announcements, and upcoming events.',
        icon: 'faNewspaper',
    },
    {
        postType: 'recipes',
        slug: 'recipes',
        label: 'Recipes',
        description: 'Nutritious and delicious recipes for seniors and caregivers.',
        icon: 'faUtensils',
    },
    {
        postType: 'general',
        slug: 'general',
        label: 'General',
        description: 'General resources and information on senior living.',
        icon: 'faBook',
    },
];

export function postTypeToSlug(postType: string): string {
    return POST_TYPE_CONFIG.find(c => c.postType === postType)?.slug ?? postType.replace(/_/g, '-');
}

export function slugToPostType(slug: string): string {
    return POST_TYPE_CONFIG.find(c => c.slug === slug)?.postType ?? slug.replace(/-/g, '_');
}

export function getPostTypeConfig(slug: string): PostTypeConfig | undefined {
    return POST_TYPE_CONFIG.find(c => c.slug === slug);
}
